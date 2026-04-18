using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Scoring.V3;

/// <summary>
/// Write/read helpers for the v3 feature store (<c>features</c> table). Enforces
/// <c>as_of_ts</c> on every write — the timestamp the value would have been
/// knowable in real time. This prevents the classic lookahead leak where a
/// backtest uses "today's fundamentals" but the fundamentals weren't actually
/// published until after the test date.
///
/// Rule of thumb for <c>as_of_ts</c>:
///   - Fundamentals (FMP income statement / ratios) → filing date, NOT period end
///   - News sentiment → publish timestamp
///   - Analyst revisions → revision date
///   - OHLCV / technical indicators → 16:00 ET on the bar's date
///
/// Backtests must filter on <c>as_of_ts &lt;= backtest_date</c> or the result is a lie.
/// </summary>
public class FeatureStore(AppDbContext db, ILogger<FeatureStore> logger)
{
    /// <summary>
    /// Upsert a single feature value. Overwrites the existing row if
    /// (ticker, date, feature_name) already exists.
    /// </summary>
    public async Task UpsertAsync(
        string ticker, DateOnly date, string featureName,
        double? value, DateTime asOfTs, string? source = null,
        CancellationToken ct = default)
    {
        var existing = await db.Features.FirstOrDefaultAsync(
            f => f.Ticker == ticker && f.Date == date && f.FeatureName == featureName, ct);

        if (existing is null)
        {
            db.Features.Add(new FeatureRow
            {
                Ticker = ticker,
                Date = date,
                FeatureName = featureName,
                Value = value,
                AsOfTs = asOfTs,
                Source = source,
            });
        }
        else
        {
            existing.Value = value;
            existing.AsOfTs = asOfTs;
            existing.Source = source;
        }
    }

    /// <summary>
    /// Batch upsert. Caller is responsible for calling
    /// <c>SaveChangesAsync</c> on the scoped <c>db</c> afterwards.
    /// </summary>
    public async Task UpsertBatchAsync(
        IEnumerable<FeatureRow> rows,
        CancellationToken ct = default)
    {
        var rowList = rows.ToList();
        if (rowList.Count == 0) return;

        // Pull existing rows for the (ticker, date, feature_name) tuples we're
        // about to write, so we can overwrite in-place instead of duplicating.
        var tickers      = rowList.Select(r => r.Ticker).Distinct().ToList();
        var dates        = rowList.Select(r => r.Date).Distinct().ToList();
        var featureNames = rowList.Select(r => r.FeatureName).Distinct().ToList();

        var existing = await db.Features
            .Where(f => tickers.Contains(f.Ticker)
                     && dates.Contains(f.Date)
                     && featureNames.Contains(f.FeatureName))
            .ToDictionaryAsync(
                f => (f.Ticker, f.Date, f.FeatureName),
                ct);

        foreach (var r in rowList)
        {
            if (existing.TryGetValue((r.Ticker, r.Date, r.FeatureName), out var cur))
            {
                cur.Value = r.Value;
                cur.AsOfTs = r.AsOfTs;
                cur.Source = r.Source;
            }
            else
            {
                db.Features.Add(r);
            }
        }

        logger.LogDebug("FeatureStore: prepared upsert of {Count} rows", rowList.Count);
    }

    /// <summary>
    /// Fetch the latest value for a feature as of a given timestamp. This is
    /// the backtest-safe read path — returns whatever would have been visible
    /// at <paramref name="asOfMax"/>.
    /// </summary>
    public async Task<double?> GetLatestAsOfAsync(
        string ticker, string featureName, DateTime asOfMax,
        CancellationToken ct = default)
    {
        var row = await db.Features
            .Where(f => f.Ticker == ticker
                     && f.FeatureName == featureName
                     && f.AsOfTs <= asOfMax)
            .OrderByDescending(f => f.AsOfTs)
            .FirstOrDefaultAsync(ct);
        return row?.Value;
    }

    /// <summary>
    /// Fetch all recent values for a feature across the universe, useful for
    /// cross-sectional ranking. Returns the most recent value per ticker on
    /// or before <paramref name="asOfMax"/>.
    /// </summary>
    public async Task<Dictionary<string, double?>> GetLatestPerTickerAsync(
        string featureName, DateTime asOfMax,
        CancellationToken ct = default)
    {
        // Postgres-friendly: pull recent slice, then reduce to latest-per-ticker
        // in memory. Index on (feature_name, as_of_ts) keeps this cheap.
        var cutoff = asOfMax.AddDays(-90); // 90-day look-back is plenty for daily features
        var rows = await db.Features
            .Where(f => f.FeatureName == featureName
                     && f.AsOfTs <= asOfMax
                     && f.AsOfTs >= cutoff)
            .Select(f => new { f.Ticker, f.AsOfTs, f.Value })
            .ToListAsync(ct);

        return rows
            .GroupBy(r => r.Ticker)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(r => r.AsOfTs).First().Value);
    }
}
