using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Providers.Contracts;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Smart Money Phase 2 "Short dynamics" sub-signal. Fetches the latest
/// FMP short-interest snapshot per ticker, persists it, and exposes a
/// 0-100 sub-score + evidence string for the Smart Money card.
///
/// Scoring model (MVP):
///   short_pct_float in 0–5%    → 10-30  (low, quiet)
///   short_pct_float in 5–10%   → 40-60  (notable, watch)
///   short_pct_float in 10–20%  → 65-85  (heavy, potential squeeze)
///   short_pct_float in 20%+    → 85-100 (extreme, high conviction short or squeeze fuel)
///
/// Intentionally simple — structural trend analysis (short-interest
/// momentum, days-to-cover acceleration) ships in a follow-up once we
/// have 4-6 weeks of history per ticker.
/// </summary>
public class ShortInterestService(
    AppDbContext db,
    IFundamentalsProvider fmp,
    ILogger<ShortInterestService> logger)
{
    public record FetchResult(string Ticker, bool Persisted, decimal? ShortPctFloat, string? Note);

    /// <summary>Fetch the latest snapshot from FMP and persist it (or
    /// update if we already have that settlement date). Idempotent.</summary>
    public async Task<FetchResult> FetchAndStoreAsync(string ticker, CancellationToken ct = default)
    {
        var normalized = ticker.Trim().ToUpperInvariant();
        var snap = await fmp.GetShortInterestAsync(normalized, ct);
        if (snap is null)
        {
            return new FetchResult(normalized, false, null, "FMP returned no short-interest data for this ticker");
        }

        var existing = await db.ShortInterestSnapshots
            .FirstOrDefaultAsync(s => s.Ticker == normalized && s.SettlementDate == snap.SettlementDate, ct);

        if (existing is null)
        {
            db.ShortInterestSnapshots.Add(new ShortInterestSnapshot
            {
                Ticker = normalized,
                SettlementDate = snap.SettlementDate,
                ShortInterestShares = snap.ShortInterestShares,
                FloatShares = snap.FloatShares,
                ShortPctFloat = snap.ShortPctFloat,
                DaysToCover = snap.DaysToCover,
                AvgDailyVolume = snap.AvgDailyVolume,
            });
        }
        else
        {
            // Refresh fields — FMP may revise a given settlement post-publication.
            existing.ShortInterestShares = snap.ShortInterestShares;
            existing.FloatShares = snap.FloatShares;
            existing.ShortPctFloat = snap.ShortPctFloat;
            existing.DaysToCover = snap.DaysToCover;
            existing.AvgDailyVolume = snap.AvgDailyVolume;
        }

        await db.SaveChangesAsync(ct);
        return new FetchResult(normalized, true, snap.ShortPctFloat, "ok");
    }

    /// <summary>Latest snapshot for a ticker (DB only, no network). Null
    /// when we haven't pulled one yet.</summary>
    public async Task<ShortInterestSnapshot?> GetLatestAsync(string ticker, CancellationToken ct = default)
    {
        var normalized = ticker.Trim().ToUpperInvariant();
        return await db.ShortInterestSnapshots
            .AsNoTracking()
            .Where(s => s.Ticker == normalized)
            .OrderByDescending(s => s.SettlementDate)
            .FirstOrDefaultAsync(ct);
    }

    /// <summary>Derive a 0-100 sub-score from a percent-of-float value.</summary>
    public static int ScoreFromShortPct(decimal? pct)
    {
        if (pct is null) return 0;
        var p = (double)pct.Value;
        if (p < 2) return 10;
        if (p < 5) return 25;
        if (p < 10) return 50;
        if (p < 15) return 70;
        if (p < 20) return 82;
        if (p < 30) return 92;
        return 98;
    }

    /// <summary>One-line evidence copy for the Smart Money sub-card.</summary>
    public static string? EvidenceFor(ShortInterestSnapshot? snap)
    {
        if (snap?.ShortPctFloat is null) return null;
        var pct = (double)snap.ShortPctFloat.Value;
        var days = snap.DaysToCover.HasValue ? $" · {snap.DaysToCover.Value:0.#} days to cover" : "";
        var asOf = $" (as of {snap.SettlementDate:yyyy-MM-dd})";

        if (pct >= 20)
            return $"Short interest {pct:0.#}% of float — extreme crowding{days}{asOf}.";
        if (pct >= 10)
            return $"Short interest {pct:0.#}% of float — heavy short positioning{days}{asOf}.";
        if (pct >= 5)
            return $"Short interest {pct:0.#}% of float — moderate short interest{days}{asOf}.";
        return $"Short interest {pct:0.#}% of float — low, benign positioning{asOf}.";
    }
}
