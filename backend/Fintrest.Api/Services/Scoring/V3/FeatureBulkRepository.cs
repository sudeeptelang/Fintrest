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
    /// by the final merge statement.
    /// </summary>
    public async Task<int> UpsertAsync(
        IReadOnlyList<FeatureRow> rows,
        CancellationToken ct = default)
    {
        if (rows.Count == 0) return 0;

        // Dedicated connection, dedicated transaction. Opens, does its work, disposes.
        // No sharing with EF — fixes the Npgsql disposed-connector bug seen when
        // Pooling=false + shared connector across EF and raw commands.
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

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
            await createTemp.ExecuteNonQueryAsync(ct);
        }

        // 2. COPY BINARY into the staging table.
        await using (var writer = await conn.BeginBinaryImportAsync(
            "COPY tmp_features (ticker, trade_date, feature_name, value, as_of_ts, source) FROM STDIN (FORMAT BINARY)", ct))
        {
            foreach (var r in rows)
            {
                await writer.StartRowAsync(ct);
                await writer.WriteAsync(r.Ticker,                                NpgsqlDbType.Varchar,     ct);
                await writer.WriteAsync(r.Date.ToDateTime(TimeOnly.MinValue),    NpgsqlDbType.Date,        ct);
                await writer.WriteAsync(r.FeatureName,                           NpgsqlDbType.Varchar,     ct);
                if (r.Value.HasValue)
                    await writer.WriteAsync(r.Value.Value,                       NpgsqlDbType.Numeric,     ct);
                else
                    await writer.WriteNullAsync(ct);
                await writer.WriteAsync(EnsureUtc(r.AsOfTs),                     NpgsqlDbType.TimestampTz, ct);
                await writer.WriteAsync(r.Source ?? "computed",                  NpgsqlDbType.Varchar,     ct);
            }
            await writer.CompleteAsync(ct);
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
            affected = await merge.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);

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
