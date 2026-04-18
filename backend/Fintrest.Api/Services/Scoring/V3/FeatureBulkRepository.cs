using Dapper;
using Fintrest.Api.Models;
using Npgsql;

namespace Fintrest.Api.Services.Scoring.V3;

/// <summary>
/// Writer for <c>features</c> using Dapper on a dedicated <see cref="NpgsqlConnection"/>.
/// Chose Dapper over EF Core after the EF linq-to-delete translator kept colliding
/// with Supabase's PgBouncer session pooler (<see cref="System.ObjectDisposedException"/>
/// on <c>NpgsqlConnector.ResetCancellation</c>) and then with Npgsql 10's strict
/// <c>DateTime.Kind</c> enforcement on parameter binding.
///
/// <para>
/// Raw SQL + Dapper gives us:
/// <list type="bullet">
///   <item>Zero translator magic — the SQL you write is the SQL that runs.</item>
///   <item>Native Npgsql typing (DateOnly → DATE, Guid → UUID, etc.) without
///         EF's Kind-aware DateTime gymnastics.</item>
///   <item>Cheap bulk inserts — a single multi-valued <c>INSERT … VALUES (…), (…), …</c>
///         for ~28k rows per night runs in well under a second.</item>
///   <item>Manual retry loop we can tune for Supabase's occasional SSL-setup
///         timeouts when Pooling=false.</item>
/// </list>
/// </para>
///
/// <para>The DB-level <c>check_features_as_of_ts</c> trigger still fires on every
/// INSERT so lookahead protection is preserved regardless of which client library
/// does the write.</para>
/// </summary>
public class FeatureBulkRepository(IConfiguration config, ILogger<FeatureBulkRepository> logger)
{
    private readonly string _connString =
        config.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection not configured");

    /// <summary>
    /// Delete the (trade_date, feature_name*) slice and insert the new batch.
    /// Returns the number of rows inserted. Retries up to 3 times on transient
    /// Npgsql errors.
    /// </summary>
    public async Task<int> UpsertAsync(
        IReadOnlyList<FeatureRow> rows,
        CancellationToken ct = default)
    {
        if (rows.Count == 0) return 0;

        const int maxAttempts = 3;
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                return await UpsertCoreAsync(rows);
            }
            catch (Exception ex) when (attempt < maxAttempts && IsTransient(ex))
            {
                NpgsqlConnection.ClearAllPools(); // force fresh physical connection on retry
                var delayMs = 500 * attempt;
                logger.LogWarning(
                    "FeatureBulkRepository: attempt {Attempt}/{Max} failed ({Type}: {Msg}), retrying in {Ms}ms",
                    attempt, maxAttempts, ex.GetType().Name, ex.Message, delayMs);
                await Task.Delay(delayMs, ct);
            }
        }
        throw new InvalidOperationException("unreachable");
    }

    private async Task<int> UpsertCoreAsync(IReadOnlyList<FeatureRow> rows)
    {
        var tradeDate    = rows[0].Date;
        var featureNames = rows.Select(r => r.FeatureName).Distinct().ToArray();

        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();

        // STEP 1: delete the slice. Dapper ships DateOnly → date natively.
        const string deleteSql = @"
            DELETE FROM features
            WHERE trade_date = @TradeDate
              AND feature_name = ANY(@FeatureNames);";
        var deleted = await conn.ExecuteAsync(deleteSql, new
        {
            TradeDate    = tradeDate,
            FeatureNames = featureNames,
        });

        // STEP 2: bulk insert via multi-row VALUES. Dapper expands the enumerable
        // into per-row parameter sets; Postgres handles the rest.
        const string insertSql = @"
            INSERT INTO features (ticker, trade_date, feature_name, value, as_of_ts, source)
            VALUES (@Ticker, @Date, @FeatureName, @Value, @AsOfTs, @Source);";
        var parameterSets = rows.Select(r => new
        {
            r.Ticker,
            r.Date,
            r.FeatureName,
            r.Value,
            AsOfTs = EnsureUtc(r.AsOfTs),
            Source = r.Source ?? "computed",
        }).ToList();

        var inserted = await conn.ExecuteAsync(insertSql, parameterSets);

        logger.LogInformation(
            "FeatureBulkRepository: slice ({Date}, {FeatureCount} features) — deleted {D}, inserted {I}",
            tradeDate, featureNames.Length, deleted, inserted);

        return inserted;
    }

    private static bool IsTransient(Exception ex) =>
        ex is TimeoutException
            || ex is ObjectDisposedException
            || ex is NpgsqlException
            || (ex.InnerException is not null && IsTransient(ex.InnerException));

    /// <summary>Coerce DateTime.Kind to UTC — Npgsql 10 rejects Unspecified/Local for TIMESTAMPTZ.</summary>
    private static DateTime EnsureUtc(DateTime ts) =>
        ts.Kind switch
        {
            DateTimeKind.Utc         => ts,
            DateTimeKind.Local       => ts.ToUniversalTime(),
            DateTimeKind.Unspecified => DateTime.SpecifyKind(ts, DateTimeKind.Utc),
            _                        => ts,
        };
}
