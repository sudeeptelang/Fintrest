using System.Text.Json;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Computes Quality / Profitability / Growth sub-scores per ticker and
/// sector-normalizes them. §14.1 in docs/SIGNALS_V3.md.
///
/// <para>
/// Inputs come from <c>stocks</c> snapshot fields (populated by FMP
/// ingestion). Outputs are written to <c>fundamental_subscore</c>. A later
/// commit wires the scoring engine to consume these values; until then the
/// table is populated but unused — useful for auditing and backtest labeling.
/// </para>
///
/// <para>
/// Metric picks intentionally avoid metrics that are too correlated with
/// Momentum or Trend — the point is for each sub-model to carry an
/// independent signal:
/// <list type="bullet">
/// <item><b>Quality</b>: Novy-Marx gross profitability (GP / Assets proxy),
///        debt stability, accruals quality signals where available.</item>
/// <item><b>Profitability</b>: ROE, operating margin, net margin.</item>
/// <item><b>Growth</b>: multi-year revenue + EPS growth, penalised when
///        concentrated in a single year.</item>
/// </list>
/// </para>
/// </summary>
public class FundamentalSubscoreService(AppDbContext db, ILogger<FundamentalSubscoreService> logger)
{
    /// <summary>
    /// Compute + persist sub-scores for every active ticker as of <paramref name="asOf"/>.
    /// Idempotent: replaces rows for the same (ticker, as_of_date).
    /// </summary>
    public async Task<FundamentalSubscoreRunSummary> ComputeAndStoreAsync(DateOnly asOf, CancellationToken ct = default)
    {
        // Stock carries operating margin / ROE / ROA; Fundamental (time-series)
        // carries gross margin / net margin / growth / D/E. Take the latest
        // Fundamental row per stock via a correlated subquery.
        var stocks = await (
            from s in db.Stocks.AsNoTracking().Where(s => s.Active)
            select new StockSnapshotRow(
                s.Ticker,
                s.Sector,
                db.Fundamentals.Where(f => f.StockId == s.Id).OrderByDescending(f => f.ReportDate).Select(f => f.GrossMargin).FirstOrDefault(),
                s.OperatingMargin,
                db.Fundamentals.Where(f => f.StockId == s.Id).OrderByDescending(f => f.ReportDate).Select(f => f.NetMargin).FirstOrDefault(),
                s.ReturnOnEquity,
                s.ReturnOnAssets,
                db.Fundamentals.Where(f => f.StockId == s.Id).OrderByDescending(f => f.ReportDate).Select(f => f.RevenueGrowth).FirstOrDefault(),
                db.Fundamentals.Where(f => f.StockId == s.Id).OrderByDescending(f => f.ReportDate).Select(f => f.EpsGrowth).FirstOrDefault(),
                db.Fundamentals.Where(f => f.StockId == s.Id).OrderByDescending(f => f.ReportDate).Select(f => f.DebtToEquity).FirstOrDefault())
        ).ToListAsync(ct);

        if (stocks.Count == 0)
            return new FundamentalSubscoreRunSummary(0, 0, 0);

        // Compute raw sub-scores per ticker
        var rawByTicker = stocks
            .Select(s => new
            {
                s.Ticker,
                s.Sector,
                Quality = ComputeQuality(s),
                Profitability = ComputeProfitability(s),
                Growth = ComputeGrowth(s),
                InputsAvailable = WhichInputsAvailable(s),
            })
            .ToList();

        // Sector rank each sub-score independently. Peers = same non-null sector
        // with at least 5 tickers; below that threshold we fall back to
        // whole-market ranking (better than no rank at all for niche sectors).
        var ranks = ComputeRanks(rawByTicker
            .Select(r => (r.Ticker, r.Sector, r.Quality, r.Profitability, r.Growth))
            .ToList());

        // Replace existing rows for this date (idempotent rerun).
        // ExecuteDeleteAsync is a single SQL statement — much faster
        // than loading + RemoveRange for the universe-wide set.
        await db.FundamentalSubscores
            .Where(f => f.AsOfDate == asOf)
            .ExecuteDeleteAsync(ct);

        // Chunk inserts. Previously this accumulated ~14,000 entities
        // into one SaveChanges call, which Npgsql dispatched as a single
        // multi-statement batch that starved the DB connection pool for
        // the duration — /admin/system-health and other endpoints would
        // fail to connect for minutes. Chunking to 500 rows per batch
        // keeps each write inside a reasonable transaction window.
        const int chunkSize = 500;
        var written = 0;
        var now = DateTime.UtcNow;
        var buffer = new List<FundamentalSubscore>(chunkSize);

        async Task FlushAsync()
        {
            if (buffer.Count == 0) return;
            db.FundamentalSubscores.AddRange(buffer);
            await db.SaveChangesAsync(ct);
            // Detach to keep the change-tracker light — otherwise memory
            // grows linearly across chunks for a full-universe run.
            foreach (var e in buffer) db.Entry(e).State = EntityState.Detached;
            buffer.Clear();
        }

        foreach (var r in rawByTicker)
        {
            var rk = ranks.TryGetValue(r.Ticker, out var rr) ? rr : (null as (double? q, double? p, double? g)?);
            var qRank = rk?.q;
            var pRank = rk?.p;
            var gRank = rk?.g;

            buffer.Add(new FundamentalSubscore
            {
                Ticker = r.Ticker,
                AsOfDate = asOf,
                // Defensive truncation: fundamental_subscore.sector is
                // VARCHAR(128) after migration 028, but guard even that
                // ceiling in case a provider returns an absurdly long
                // industry slug. Truncation is safe — sector is a label,
                // not a key, so we never compare by this field across
                // truncated + untruncated variants.
                Sector = r.Sector is { Length: > 128 } ? r.Sector[..128] : r.Sector,
                QualityRaw = r.Quality,
                ProfitabilityRaw = r.Profitability,
                GrowthRaw = r.Growth,
                QualityRank = qRank,
                ProfitabilityRank = pRank,
                GrowthRank = gRank,
                QualityScore = BlendScore(r.Quality, qRank),
                ProfitabilityScore = BlendScore(r.Profitability, pRank),
                GrowthScore = BlendScore(r.Growth, gRank),
                InputsAvailableJson = JsonSerializer.Serialize(r.InputsAvailable),
                ComputedAt = now,
            });
            written++;
            if (buffer.Count >= chunkSize) await FlushAsync();
        }
        await FlushAsync();

        logger.LogInformation(
            "FundamentalSubscoreService: wrote {Written} rows for {AsOf} across {Universe} tickers (chunked {Chunk}/batch)",
            written, asOf, stocks.Count, chunkSize);
        return new FundamentalSubscoreRunSummary(stocks.Count, written, ranks.Count);
    }

    // ── Raw score computations ────────────────────────────────────────────

    private static double? ComputeQuality(StockSnapshotRow s)
    {
        // Gross margin is a strong proxy for pricing power + cost discipline.
        // Debt/Equity flipped: lower leverage → higher quality.
        double? gm = s.GrossMargin;      // already 0..1 fraction
        double? de = s.DebtToEquity;     // typically 0..3+; lower is better
        if (gm is null && de is null) return null;

        var parts = new List<double>();
        if (gm is not null) parts.Add(Clamp01(gm.Value) * 100);
        if (de is not null)
        {
            // 0% D/E → 100; 100% D/E → 50; 200%+ → 0
            var score = 100 - Math.Min(100, Math.Max(0, de.Value * 50));
            parts.Add(score);
        }
        return parts.Average();
    }

    private static double? ComputeProfitability(StockSnapshotRow s)
    {
        double? roe = s.ReturnOnEquity;     // 0..1 fraction
        double? om = s.OperatingMargin;     // 0..1 fraction
        double? nm = s.NetMargin;           // 0..1 fraction

        if (roe is null && om is null && nm is null) return null;

        var parts = new List<double>();
        // ROE: 5% → 50, 15% → 80, 25%+ → 100 (saturate; above 25% is usually buybacks, not real)
        if (roe is not null) parts.Add(SaturatingScale(roe.Value, 0.0, 0.25, 0, 100));
        // Operating margin: 5% → 40, 20% → 90, 30%+ → 100
        if (om is not null)  parts.Add(SaturatingScale(om.Value, 0.0, 0.30, 0, 100));
        // Net margin: 3% → 30, 15% → 85, 25%+ → 100
        if (nm is not null)  parts.Add(SaturatingScale(nm.Value, 0.0, 0.25, 0, 100));
        return parts.Average();
    }

    private static double? ComputeGrowth(StockSnapshotRow s)
    {
        // FMP's snapshot carries 1-year revenue + EPS growth as decimals.
        // Multi-year CAGR would be stronger but is not in the single-snapshot
        // shape today — revisit when fundamentals history is easier to join.
        double? rev = s.RevenueGrowth;
        double? eps = s.EpsGrowth;
        if (rev is null && eps is null) return null;

        var parts = new List<double>();
        if (rev is not null) parts.Add(GrowthScale(rev.Value));
        if (eps is not null) parts.Add(GrowthScale(eps.Value));
        return parts.Average();
    }

    private static double GrowthScale(double g)
    {
        // -20% → 0, 0% → 40, 10% → 70, 25%+ → 100. Penalise negative growth
        // but don't zero out — a mature compounder with 0% YoY revenue isn't
        // a zero-quality business.
        if (g <= -0.20) return 0;
        if (g <= 0) return 40 * (1 + g / 0.20);             // linear -20%..0%
        if (g <= 0.10) return 40 + 30 * (g / 0.10);         // 0..10% → 40..70
        if (g <= 0.25) return 70 + 30 * ((g - 0.10) / 0.15);// 10..25% → 70..100
        return 100;
    }

    private static double SaturatingScale(double v, double floor, double ceiling, double scoreFloor, double scoreCeiling)
    {
        if (v <= floor) return scoreFloor;
        if (v >= ceiling) return scoreCeiling;
        var t = (v - floor) / (ceiling - floor);
        return scoreFloor + t * (scoreCeiling - scoreFloor);
    }

    private static double Clamp01(double v) => Math.Min(1.0, Math.Max(0.0, v));

    // ── Sector ranking ────────────────────────────────────────────────────

    /// <summary>
    /// Percentile-rank each raw sub-score within its sector. Sectors with
    /// fewer than 5 tickers fall back to a whole-market rank (better signal
    /// than a 2-ticker "peer group" that's trivially first or last).
    /// </summary>
    private static Dictionary<string, (double? q, double? p, double? g)> ComputeRanks(
        List<(string Ticker, string? Sector, double? Quality, double? Profitability, double? Growth)> rows)
    {
        const int minPeers = 5;
        var sectorBuckets = rows
            .Where(r => !string.IsNullOrWhiteSpace(r.Sector))
            .GroupBy(r => r.Sector!)
            .ToDictionary(g => g.Key, g => g.ToList());

        var allQ = rows.Select(r => r.Quality).ToArray();
        var allP = rows.Select(r => r.Profitability).ToArray();
        var allG = rows.Select(r => r.Growth).ToArray();

        var result = new Dictionary<string, (double? q, double? p, double? g)>();
        foreach (var r in rows)
        {
            var bucketSize = r.Sector is null || !sectorBuckets.ContainsKey(r.Sector)
                ? 0
                : sectorBuckets[r.Sector].Count;
            var small = bucketSize < minPeers;

            var peersQ = small ? allQ : [.. sectorBuckets[r.Sector!].Select(x => x.Quality)];
            var peersP = small ? allP : [.. sectorBuckets[r.Sector!].Select(x => x.Profitability)];
            var peersG = small ? allG : [.. sectorBuckets[r.Sector!].Select(x => x.Growth)];

            result[r.Ticker] = (
                PercentileRank(r.Quality, peersQ),
                PercentileRank(r.Profitability, peersP),
                PercentileRank(r.Growth, peersG));
        }
        return result;
    }

    /// <summary>
    /// Percentile rank of <paramref name="value"/> within <paramref name="peers"/>:
    /// fraction of peers strictly below, plus half the fraction tied. Null
    /// value or &lt; 3 non-null peers → null.
    /// </summary>
    private static double? PercentileRank(double? value, double?[] peers)
    {
        if (value is null) return null;
        var sorted = peers.Where(p => p.HasValue).Select(p => p!.Value).OrderBy(x => x).ToList();
        if (sorted.Count < 3) return null;

        var below = sorted.Count(x => x < value.Value);
        var tied = sorted.Count(x => Math.Abs(x - value.Value) < 1e-9);
        return (below + tied * 0.5) / sorted.Count;
    }

    /// <summary>
    /// Blend the raw 0..100 score with the 0..1 sector rank into a final
    /// 0..100. If rank is null (insufficient peers) we fall back to raw.
    /// </summary>
    private static double? BlendScore(double? raw, double? rank)
    {
        if (raw is null) return null;
        if (rank is null) return raw;
        // 60/40 rank/raw — sector position dominates because that's what the
        // framework promises, but the raw floor keeps elite absolute metrics
        // from being dragged down by a sector full of elite peers.
        return 0.6 * (rank.Value * 100) + 0.4 * raw.Value;
    }

    private static object WhichInputsAvailable(StockSnapshotRow s) => new
    {
        gross_margin = s.GrossMargin is not null,
        operating_margin = s.OperatingMargin is not null,
        net_margin = s.NetMargin is not null,
        return_on_equity = s.ReturnOnEquity is not null,
        return_on_assets = s.ReturnOnAssets is not null,
        revenue_growth = s.RevenueGrowth is not null,
        eps_growth = s.EpsGrowth is not null,
        debt_to_equity = s.DebtToEquity is not null,
    };

    private record StockSnapshotRow(
        string Ticker,
        string? Sector,
        double? GrossMargin,
        double? OperatingMargin,
        double? NetMargin,
        double? ReturnOnEquity,
        double? ReturnOnAssets,
        double? RevenueGrowth,
        double? EpsGrowth,
        double? DebtToEquity);
}

public record FundamentalSubscoreRunSummary(int UniverseSize, int RowsWritten, int RankedTickers);
