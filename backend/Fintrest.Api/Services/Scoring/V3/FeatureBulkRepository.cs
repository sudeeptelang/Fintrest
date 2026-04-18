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

        var tradeDate    = rows[0].Date;
        var featureNames = rows.Select(r => r.FeatureName).Distinct().ToArray();

        // STEP 1: Delete the slice. Raw SQL goes through a simpler Npgsql path
        // than ExecuteDeleteAsync, sidestepping the NpgsqlConnector.ResetCancellation
        // disposal bug we keep hitting with the linq-to-delete translator.
        // EF's NpgsqlExecutionStrategy (registered in Program.cs) wraps this in
        // a retry loop automatically.
        var deleted = await db.Database.ExecuteSqlInterpolatedAsync($@"
            DELETE FROM features
            WHERE trade_date = {tradeDate.ToDateTime(TimeOnly.MinValue)}
              AND feature_name = ANY({featureNames})", ct);

        // STEP 2: AddRange + SaveChanges. EF's retry strategy handles transient
        // errors on SaveChanges automatically. No explicit transaction — delete +
        // insert don't need atomicity here (a partial failure on step 2 leaves
        // the slice deleted but empty, and the next nightly run refills it).
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

        logger.LogInformation(
            "FeatureBulkRepository: slice ({Date}, {FeatureCount} features) — deleted {D}, inserted {I}",
            tradeDate, featureNames.Length, deleted, inserted);

        return inserted;
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
