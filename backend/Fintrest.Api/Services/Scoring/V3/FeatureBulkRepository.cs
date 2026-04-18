using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Scoring.V3;

/// <summary>
/// Writer for <c>features</c> using EF Core. The DB-level
/// <c>check_features_as_of_ts</c> trigger still fires on every INSERT so
/// lookahead protection is preserved.
///
/// <para>
/// <b>Why EF Core and not Npgsql COPY?</b> We started with <c>COPY BINARY</c>
/// because it's 10–50× faster, but hit a known Npgsql+Supabase interaction
/// where <c>NpgsqlConnector.ResetCancellation</c> throws
/// <c>ObjectDisposedException</c> on the very first command of a fresh
/// connection — no amount of pool clearing or CT manipulation fixes it.
/// EF Core's <c>NpgsqlExecutionStrategy</c> handles the retry dance
/// transparently. At 1000–30000 rows per nightly run, the perf difference
/// (≈1s vs ≈5s) is irrelevant for a batch that runs once a day.
/// </para>
///
/// <para>
/// <b>Upsert strategy</b>: delete-and-insert. For the given trade date, we
/// delete all rows for the feature names being written, then insert the new
/// batch. Simple, avoids N+1 reads, and leaves the feature_ranks downstream
/// job with a clean slice per day.
/// </para>
/// </summary>
public class FeatureBulkRepository(AppDbContext db, ILogger<FeatureBulkRepository> logger)
{
    /// <summary>
    /// Insert or overwrite a batch of feature rows for a given trade date.
    /// Returns the number of rows inserted.
    /// </summary>
    public async Task<int> UpsertAsync(
        IReadOnlyList<FeatureRow> rows,
        CancellationToken ct = default)
    {
        if (rows.Count == 0) return 0;

        // Establish the slice we're rewriting: one trade_date + the set of
        // feature_names present in this batch. Each nightly run typically
        // writes the same (date, features) slice anyway, so delete-and-insert
        // is idempotent.
        var tradeDate    = rows[0].Date;
        var featureNames = rows.Select(r => r.FeatureName).Distinct().ToList();

        // Delete + insert inside a single execution strategy block so retries
        // replay the whole thing atomically.
        var strategy = db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);

            // Scoped delete — only the features we're about to rewrite.
            var deleted = await db.Features
                .Where(f => f.Date == tradeDate && featureNames.Contains(f.FeatureName))
                .ExecuteDeleteAsync(ct);

            // AddRange is fine for 1000–30000 rows; SaveChangesAsync batches internally.
            await db.Features.AddRangeAsync(rows.Select(r => new FeatureRow
            {
                Ticker      = r.Ticker,
                Date        = r.Date,
                FeatureName = r.FeatureName,
                Value       = r.Value,
                AsOfTs      = EnsureUtc(r.AsOfTs),
                Source      = r.Source ?? "computed",
            }), ct);

            var inserted = await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            logger.LogDebug(
                "FeatureBulkRepository: slice ({Date}, {FeatureCount} features) — deleted {D}, inserted {I}",
                tradeDate, featureNames.Count, deleted, inserted);

            return inserted;
        });
    }

    /// <summary>Coerce DateTime.Kind to UTC for TIMESTAMPTZ columns.</summary>
    private static DateTime EnsureUtc(DateTime ts) =>
        ts.Kind switch
        {
            DateTimeKind.Utc         => ts,
            DateTimeKind.Local       => ts.ToUniversalTime(),
            DateTimeKind.Unspecified => DateTime.SpecifyKind(ts, DateTimeKind.Utc),
            _                        => ts,
        };
}
