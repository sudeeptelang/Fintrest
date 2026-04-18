using Fintrest.Api.Models;
using Npgsql;
using NpgsqlTypes;

namespace Fintrest.Api.Services.Scoring.V3;

/// <summary>
/// Bulk writer for <c>features</c> using Npgsql <c>COPY BINARY</c> — 10–50× faster
/// than EF Core <c>SaveChanges</c> on the 28k-row nightly workload. The DB-level
/// <c>check_features_as_of_ts</c> trigger still fires during COPY, so lookahead
/// protection is preserved.
///
/// <para>
/// Upsert strategy: COPY-insert into a session-temp table, then a single
/// <c>INSERT ... ON CONFLICT ... DO UPDATE</c> merges into <c>features</c>. This
/// is the standard Postgres "fast upsert" pattern and keeps the hot table's
/// indexes happy.
/// </para>
///
/// <para>
/// <b>Connection ownership:</b> opens its OWN <see cref="NpgsqlConnection"/>
/// from the configured connection string rather than riding on EF Core's
/// tracked connection. This isolates the bulk COPY from EF's connection
/// lifecycle, avoiding the <c>ObjectDisposedException</c> on
/// <c>NpgsqlConnector.ResetCancellation</c> that we hit when <c>Pooling=false</c>
/// and EF and raw commands share a connector.
/// </para>
/// </summary>
public class FeatureBulkRepository(IConfiguration config, ILogger<FeatureBulkRepository> logger)
{
    private readonly string _connString =
        config.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection not configured");

    /// <summary>
    /// Insert or update a batch of feature rows. Returns the number of rows affected
    /// by the final merge statement. Retries up to 3 times on transient connection
    /// errors — Supabase PgBouncer can occasionally time out during SSL setup when
    /// <c>Pooling=false</c> forces a fresh TCP connection per command.
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
                return await UpsertCoreAsync(rows, ct);
            }
            catch (Exception ex) when (attempt < maxAttempts && IsTransient(ex))
            {
                var delayMs = 500 * attempt;
                // Clear the pool so the next attempt forces a fresh physical TCP
                // connection. Without this, Npgsql returns the broken connector
                // to the pool and the retry picks it up again, failing identically.
                NpgsqlConnection.ClearAllPools();
                logger.LogWarning(
                    "FeatureBulkRepository: attempt {Attempt}/{Max} failed ({Type}), cleared pool, retrying in {Ms}ms",
                    attempt, maxAttempts, ex.GetType().Name, delayMs);
                await Task.Delay(delayMs, ct);
            }
        }
        // Unreachable — the loop either returns or the final attempt rethrows.
        throw new InvalidOperationException("unreachable");
    }

    private static bool IsTransient(Exception ex) =>
        ex is TimeoutException
            || ex is ObjectDisposedException
            || ex is NpgsqlException
            || (ex.InnerException is not null && IsTransient(ex.InnerException));

    private async Task<int> UpsertCoreAsync(
        IReadOnlyList<FeatureRow> rows,
        CancellationToken ct)
    {
        // Dedicated connection, dedicated transaction. No CancellationToken is
        // plumbed into individual Npgsql commands on purpose — there's a known
        // Npgsql+Supabase interaction where CancellationTokenSource disposal
        // races with NpgsqlConnector.ResetCancellation and throws
        // ObjectDisposedException on ManualResetEventSlim. Passing CT.None to
        // each command sidesteps the bug; the outer retry loop in UpsertAsync
        // still respects the caller's CT between attempts.
        ct.ThrowIfCancellationRequested();

        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        // 1. Session-temp staging table, auto-dropped at commit.
        await using (var createTemp = new NpgsqlCommand(@"
            CREATE TEMP TABLE tmp_features (
                ticker        VARCHAR(10)  NOT NULL,
                trade_date    DATE         NOT NULL,
                feature_name  VARCHAR(64)  NOT NULL,
                value         NUMERIC,
                as_of_ts      TIMESTAMPTZ  NOT NULL,
                source        VARCHAR(32)  NOT NULL
            ) ON COMMIT DROP;", conn, tx))
        {
            await createTemp.ExecuteNonQueryAsync();
        }

        // 2. COPY BINARY into the staging table.
        await using (var writer = await conn.BeginBinaryImportAsync(
            "COPY tmp_features (ticker, trade_date, feature_name, value, as_of_ts, source) FROM STDIN (FORMAT BINARY)"))
        {
            foreach (var r in rows)
            {
                await writer.StartRowAsync();
                await writer.WriteAsync(r.Ticker,                                NpgsqlDbType.Varchar);
                await writer.WriteAsync(r.Date.ToDateTime(TimeOnly.MinValue),    NpgsqlDbType.Date);
                await writer.WriteAsync(r.FeatureName,                           NpgsqlDbType.Varchar);
                if (r.Value.HasValue)
                    await writer.WriteAsync(r.Value.Value,                       NpgsqlDbType.Numeric);
                else
                    await writer.WriteNullAsync();
                await writer.WriteAsync(EnsureUtc(r.AsOfTs),                     NpgsqlDbType.TimestampTz);
                await writer.WriteAsync(r.Source ?? "computed",                  NpgsqlDbType.Varchar);
            }
            await writer.CompleteAsync();
        }

        // 3. Merge staging → features. Fires the DB-level lookahead trigger per row.
        int affected;
        await using (var merge = new NpgsqlCommand(@"
            INSERT INTO features (ticker, trade_date, feature_name, value, as_of_ts, source)
            SELECT ticker, trade_date, feature_name, value, as_of_ts, source FROM tmp_features
            ON CONFLICT (ticker, trade_date, feature_name) DO UPDATE
              SET value    = EXCLUDED.value,
                  as_of_ts = EXCLUDED.as_of_ts,
                  source   = EXCLUDED.source;", conn, tx))
        {
            affected = await merge.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();

        logger.LogDebug("FeatureBulkRepository: upserted {Count} rows (affected={Affected})", rows.Count, affected);
        return affected;
    }

    /// <summary>
    /// Npgsql <c>TIMESTAMPTZ</c> requires the DateTime to be UTC-kinded. Feature
    /// implementations sometimes hand us Unspecified or Local values — coerce.
    /// </summary>
    private static DateTime EnsureUtc(DateTime ts) =>
        ts.Kind switch
        {
            DateTimeKind.Utc         => ts,
            DateTimeKind.Local       => ts.ToUniversalTime(),
            DateTimeKind.Unspecified => DateTime.SpecifyKind(ts, DateTimeKind.Utc),
            _                        => ts,
        };
}
