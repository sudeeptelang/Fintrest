using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Computes the Smart Money Phase 1 insider score per ticker. Input is
/// the 30-day rolling window of discretionary open-market purchases
/// (code='P' + is_10b5_1=false + is_open_market=true). Three-weighted
/// composite per docs/SMART_MONEY_BUILD_SPEC.md §Phase 1:
///
///   50% — net dollar flow relative to market cap (bps of cap)
///   30% — cluster count (distinct insiders buying)
///   20% — seniority weighting (officers &gt; directors)
///
/// Highlight fields capture the single largest open-market purchase +
/// a pre-computed history note ("largest since 2023" / "first disclosed
/// open-market purchase") so the Smart Money sub-card renders its
/// Lens-style evidence line without a second query.
/// </summary>
public class InsiderScoreService(AppDbContext db, ILogger<InsiderScoreService> logger)
{
    public const string MethodologyVersion = "insider_v1.0";
    private const int WindowDays = 30;

    public record RunSummary(int TickersScored, int NonZeroScores, int TickersSkippedNoCap);

    /// <summary>
    /// Recompute scores for every ticker that has at least one open-market
    /// purchase inside the trailing 30 days. Tickers with zero qualifying
    /// activity are NOT written — no row means no signal (not zero score).
    /// </summary>
    public async Task<RunSummary> RecomputeAsync(CancellationToken ct = default)
    {
        var asOf = DateTime.UtcNow.Date;
        var windowStart = asOf.AddDays(-WindowDays);

        // Pull every qualifying purchase across the universe. Window is
        // 30 days × ~500 tickers × ~handful of filings = well under 10k
        // rows typical, fine to materialize.
        var windowTx = await db.InsiderTransactions
            .AsNoTracking()
            .Where(t => t.TransactionCode == "P"
                     && t.IsOpenMarket
                     && !t.Is10b5_1
                     && t.TransactionDate >= windowStart
                     && t.TransactionDate <= asOf)
            .ToListAsync(ct);

        if (windowTx.Count == 0)
        {
            logger.LogInformation("InsiderScoreService: no qualifying transactions in last {Days} days", WindowDays);
            return new RunSummary(0, 0, 0);
        }

        // Market cap lookup for bps-of-cap normalization.
        var tickers = windowTx.Select(t => t.Ticker).Distinct().ToList();
        var marketCaps = await db.Stocks
            .AsNoTracking()
            .Where(s => tickers.Contains(s.Ticker))
            .Select(s => new { s.Ticker, s.MarketCap })
            .ToDictionaryAsync(s => s.Ticker, s => s.MarketCap, ct);

        int skippedNoCap = 0;
        int nonZero = 0;
        var scoresToWrite = new List<InsiderScore>();

        foreach (var grp in windowTx.GroupBy(t => t.Ticker))
        {
            var ticker = grp.Key;
            var tx = grp.OrderByDescending(t => t.TotalValue ?? 0).ToList();

            if (!marketCaps.TryGetValue(ticker, out var cap) || cap is null or 0)
            {
                skippedNoCap++;
                continue;
            }

            var score = await ComputeSingleAsync(ticker, asOf, tx, cap.Value, ct);
            if (score is null) continue;
            scoresToWrite.Add(score);
            if (score.Score > 0) nonZero++;
        }

        if (scoresToWrite.Count == 0) return new RunSummary(0, 0, skippedNoCap);

        // Upsert: delete existing rows for (ticker, as_of_date) then add.
        // Faster than per-row UPSERT and the set is small (<=500 rows).
        var tickerList = scoresToWrite.Select(s => s.Ticker).ToList();
        await db.InsiderScores
            .Where(s => s.AsOfDate == asOf && tickerList.Contains(s.Ticker))
            .ExecuteDeleteAsync(ct);
        db.InsiderScores.AddRange(scoresToWrite);
        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "InsiderScoreService: wrote {Count} scores ({NonZero} non-zero, {Skipped} tickers skipped for missing market cap)",
            scoresToWrite.Count, nonZero, skippedNoCap);

        return new RunSummary(scoresToWrite.Count, nonZero, skippedNoCap);
    }

    /// <summary>
    /// Score a single ticker given its qualifying transactions + market
    /// cap. Pulled out so the admin endpoint can re-score one symbol
    /// on demand. Returns null when there's nothing worth persisting
    /// (no transactions).
    /// </summary>
    private async Task<InsiderScore?> ComputeSingleAsync(
        string ticker,
        DateTime asOf,
        List<InsiderTransaction> tx,
        double marketCap,
        CancellationToken ct)
    {
        if (tx.Count == 0) return null;

        var netDollarFlow = tx.Sum(t => t.TotalValue ?? 0m);
        var clusterCount = tx.Select(t => t.InsiderCik).Distinct().Count();
        var officerBuys = tx.Count(t => t.IsOfficer);
        var directorBuys = tx.Count(t => t.IsDirector);
        var largest = tx.OrderByDescending(t => t.TotalValue ?? 0m).First();

        // Sub-scores 0-100, then weighted blend.
        var flowBps = marketCap > 0
            ? (double)netDollarFlow / marketCap * 10000.0
            : 0;
        var flowScore = Math.Min(100.0, flowBps * 2.0);               // 50 bps → 100
        var clusterScore = Math.Min(100.0, clusterCount * 25.0);      // 4 insiders → 100
        var seniorityScore = Math.Min(100.0, officerBuys * 40.0 + directorBuys * 15.0);

        var composite = (flowScore * 0.5) + (clusterScore * 0.3) + (seniorityScore * 0.2);

        var historyNote = await BuildHistoryNoteAsync(largest, ct);

        return new InsiderScore
        {
            Ticker = ticker,
            AsOfDate = DateTime.SpecifyKind(asOf, DateTimeKind.Utc),
            Score = (decimal)Math.Round(composite, 2),
            NetDollarFlow30d = Math.Round(netDollarFlow, 2),
            ClusterCount30d = clusterCount,
            OfficerBuyCount = officerBuys,
            DirectorBuyCount = directorBuys,
            LargestPurchaseValue = largest.TotalValue,
            LargestPurchaserName = largest.InsiderName,
            LargestPurchaserTitle = largest.InsiderTitle,
            LargestPurchaserHistoryNote = historyNote,
            MethodologyVersion = MethodologyVersion,
            ComputedAt = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Builds a one-liner that contextualizes the largest purchase
    /// against that same insider's prior history. Examples:
    ///   "largest purchase since records begin (2023-05-12)"
    ///   "first disclosed open-market purchase"
    ///   "" (when the current buy isn't the insider's largest)
    /// The sub-card renders this verbatim under the score bar.
    /// </summary>
    private async Task<string?> BuildHistoryNoteAsync(InsiderTransaction largest, CancellationToken ct)
    {
        var prior = await db.InsiderTransactions
            .AsNoTracking()
            .Where(t => t.InsiderCik == largest.InsiderCik
                     && t.TransactionCode == "P"
                     && !t.Is10b5_1
                     && t.TransactionDate < largest.TransactionDate)
            .Select(t => new { t.TotalValue, t.TransactionDate })
            .ToListAsync(ct);

        if (prior.Count == 0)
            return "first disclosed open-market purchase";

        var maxPriorValue = prior.Max(p => p.TotalValue ?? 0m);
        if ((largest.TotalValue ?? 0m) > maxPriorValue)
        {
            var earliest = prior.Min(p => p.TransactionDate);
            return $"largest purchase since records begin ({earliest:yyyy-MM-dd})";
        }

        return null;
    }
}
