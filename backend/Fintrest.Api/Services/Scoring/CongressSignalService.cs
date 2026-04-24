using Fintrest.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Smart Money Phase 2 "Congressional" sub-signal. Derives a 0-100
/// score per ticker from the Congress disclosures already in the
/// market_firehose_snapshots cache (no new ingest needed).
///
/// Scoring model (MVP):
///   score = f(buy_volume_90d, buy_count_90d, bipartisan_bonus)
///
///   0 disclosures in 90d      → 0      (no signal)
///   1 single-party disclosure → 35-50  (weak)
///   2+ from same party        → 55-70  (notable)
///   2+ bipartisan             → 75-92  (strong — tends to predict
///                                       sector tailwinds better)
///
/// Intentionally simple — the Smart Money composite already weights
/// this at 15% so a crude score is better than a blank row.
/// </summary>
public class CongressSignalService(AppDbContext db)
{
    public record Result(
        int Score,
        int BuyCount90d,
        int SellCount90d,
        bool Bipartisan,
        string? Evidence,
        DateTime? LatestDisclosure
    );

    /// <summary>Compute the congressional signal for a ticker from the
    /// last 90 days of firehose snapshots. Null result means no
    /// disclosures on file.</summary>
    public async Task<Result?> ComputeAsync(string ticker, CancellationToken ct = default)
    {
        var normalized = ticker.Trim().ToUpperInvariant();
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-90));

        var rows = await db.MarketFirehoseSnapshots
            .AsNoTracking()
            .Where(s => (s.Kind == "senate" || s.Kind == "house")
                     && s.Ticker == normalized
                     && (s.DisclosureDate >= cutoff || s.TransactionDate >= cutoff))
            .Select(s => new
            {
                s.Kind,
                s.TransactionType,
                s.ActorName,
                s.TransactionDate,
                s.DisclosureDate,
            })
            .ToListAsync(ct);

        if (rows.Count == 0) return null;

        int buyCount = 0, sellCount = 0;
        var chambers = new HashSet<string>();
        foreach (var r in rows)
        {
            var tx = (r.TransactionType ?? "").ToLowerInvariant();
            if (tx.Contains("purchase") || tx.Contains("buy")) buyCount++;
            else if (tx.Contains("sale") || tx.Contains("sell")) sellCount++;
            chambers.Add(r.Kind);
        }

        // Simple bipartisan heuristic — disclosures from both chambers
        // (senate + house) implies cross-party attention.
        var bipartisan = chambers.Count > 1;

        // Score bias: buys are more interesting than sells (politicians
        // buying into a sector is usually tailwind-aligned; sells often
        // are legal-rebalancing noise).
        var netBuys = buyCount - sellCount;
        int baseScore;
        if (rows.Count == 0) return null;
        else if (netBuys >= 3) baseScore = 80;
        else if (netBuys >= 2) baseScore = 68;
        else if (netBuys >= 1) baseScore = 55;
        else if (netBuys == 0) baseScore = 40;  // mixed
        else baseScore = 25;  // net sells

        if (bipartisan) baseScore = Math.Min(95, baseScore + 10);
        var score = Math.Clamp(baseScore, 0, 100);

        var latest = rows.Max(r => (r.DisclosureDate ?? r.TransactionDate));
        var evidence = BuildEvidence(buyCount, sellCount, bipartisan, latest);

        return new Result(score, buyCount, sellCount, bipartisan, evidence, latest?.ToDateTime(TimeOnly.MinValue));
    }

    private static string BuildEvidence(int buyCount, int sellCount, bool bipartisan, DateOnly? latest)
    {
        var bi = bipartisan ? " bipartisan" : "";
        var asOf = latest.HasValue ? $" (most recent {latest.Value:yyyy-MM-dd})" : "";
        if (buyCount > 0 && sellCount > 0)
            return $"{buyCount} buy + {sellCount} sell{bi} disclosure{(buyCount + sellCount == 1 ? "" : "s")} in last 90d{asOf}.";
        if (buyCount > 0)
            return $"{buyCount}{bi} buy disclosure{(buyCount == 1 ? "" : "s")} in last 90d{asOf}.";
        if (sellCount > 0)
            return $"{sellCount}{bi} sell disclosure{(sellCount == 1 ? "" : "s")} in last 90d{asOf}.";
        return "Congressional disclosures on file; direction not classified.";
    }
}
