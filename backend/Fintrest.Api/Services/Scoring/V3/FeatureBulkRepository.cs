using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;
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
/// </summary>
public class FeatureBulkRepository(AppDbContext db, ILogger<FeatureBulkRepository> logger)
{
    /// <summary>
    /// Insert or update a batch of feature rows. Returns the number of rows written.
    /// </summary>
    public async Task<int> UpsertAsync(
        IReadOnlyList<FeatureRow> rows,
        CancellationToken ct = default)
    {
        if (rows.Count == 0) return 0;

        // Get the raw Npgsql connection — the EF Core DbContext hands us one.
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        // 1. Temp table with the same shape as `features`, dropped at end of session.
        await using (var createTemp = new NpgsqlCommand(@"
            CREATE TEMP TABLE IF NOT EXISTS tmp_features (
                ticker        VARCHAR(10)  NOT NULL,
                trade_date    DATE         NOT NULL,
                feature_name  VARCHAR(64)  NOT NULL,
                value         NUMERIC,
                as_of_ts      TIMESTAMPTZ  NOT NULL,
                source        VARCHAR(32)  NOT NULL
            ) ON COMMIT DROP;", conn))
        {
            // Can't ON COMMIT DROP outside a transaction. We wrap the whole merge
            // in one txn so the temp table is scoped correctly.
        }

        // 2. Single transaction for temp + COPY + merge.
        await using var tx = await conn.BeginTransactionAsync(ct);

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
            await createTemp.ExecuteNonQueryAsync(ct);
        }

        // 3. COPY BINARY into temp.
        await using (var writer = await conn.BeginBinaryImportAsync(
            "COPY tmp_features (ticker, trade_date, feature_name, value, as_of_ts, source) FROM STDIN (FORMAT BINARY)", ct))
        {
            foreach (var r in rows)
            {
                await writer.StartRowAsync(ct);
                await writer.WriteAsync(r.Ticker,                NpgsqlDbType.Varchar, ct);
                await writer.WriteAsync(r.Date.ToDateTime(TimeOnly.MinValue), NpgsqlDbType.Date, ct);
                await writer.WriteAsync(r.FeatureName,           NpgsqlDbType.Varchar, ct);
                if (r.Value.HasValue)
                    await writer.WriteAsync(r.Value.Value,       NpgsqlDbType.Numeric, ct);
                else
                    await writer.WriteNullAsync(ct);
                await writer.WriteAsync(r.AsOfTs,                NpgsqlDbType.TimestampTz, ct);
                await writer.WriteAsync(r.Source ?? "computed", NpgsqlDbType.Varchar, ct);
            }
            await writer.CompleteAsync(ct);
        }

        // 4. Merge into `features` — fires the lookahead trigger per row.
        int affected;
        await using (var merge = new NpgsqlCommand(@"
            INSERT INTO features (ticker, trade_date, feature_name, value, as_of_ts, source)
            SELECT ticker, trade_date, feature_name, value, as_of_ts, source FROM tmp_features
            ON CONFLICT (ticker, trade_date, feature_name) DO UPDATE
              SET value    = EXCLUDED.value,
                  as_of_ts = EXCLUDED.as_of_ts,
                  source   = EXCLUDED.source;", conn, tx))
        {
            affected = await merge.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);

        logger.LogDebug("FeatureBulkRepository: upserted {Count} rows (affected={Affected})", rows.Count, affected);
        return affected;
    }
}
