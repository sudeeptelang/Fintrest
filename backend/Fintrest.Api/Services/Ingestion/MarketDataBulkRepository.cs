using Dapper;
using Npgsql;

namespace Fintrest.Api.Services.Ingestion;

/// <summary>
/// Writer for <c>market_data</c> bars using Dapper on a dedicated <see cref="NpgsqlConnection"/>.
/// Same shape as <c>FeatureBulkRepository</c> — EF Core + Supabase's PgBouncer session pooler
/// hit <see cref="ObjectDisposedException"/> on <c>NpgsqlConnector.ResetCancellation</c> under
/// concurrent SaveChanges (the <c>ManualResetEventSlim</c> race). Dapper on a connection that
/// we own end-to-end avoids the pool churn that triggers it.
///
/// <para>This path only writes the OHLCV columns populated at ingest time
/// (stock_id, timeframe, ts, open/high/low/close, volume). Technical indicators
/// (rsi, macd, ma*, atr, etc.) are populated downstream by the scoring engine.</para>
/// </summary>
public class MarketDataBulkRepository(
    IConfiguration config,
    ILogger<MarketDataBulkRepository> logger)
{
    private readonly string _connString =
        config.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection not configured");

    public record BarRow(long StockId, DateTime Ts, double Open, double High, double Low, double Close, long Volume);

    public async Task<int> InsertBarsAsync(IReadOnlyList<BarRow> bars, CancellationToken ct = default)
    {
        if (bars.Count == 0) return 0;

        const int maxAttempts = 3;
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                return await InsertBarsCoreAsync(bars);
            }
            catch (Exception ex) when (attempt < maxAttempts && IsTransient(ex))
            {
                NpgsqlConnection.ClearAllPools();
                var delayMs = 500 * attempt;
                logger.LogWarning(
                    "MarketDataBulkRepository: attempt {Attempt}/{Max} failed ({Type}: {Msg}), retrying in {Ms}ms",
                    attempt, maxAttempts, ex.GetType().Name, ex.Message, delayMs);
                await Task.Delay(delayMs, ct);
            }
        }
        throw new InvalidOperationException("unreachable");
    }

    private async Task<int> InsertBarsCoreAsync(IReadOnlyList<BarRow> bars)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();

        const string insertSql = @"
            INSERT INTO market_data (stock_id, timeframe, ts, open, high, low, close, volume)
            VALUES (@StockId, '1d', @Ts, @Open, @High, @Low, @Close, @Volume);";

        var parameterSets = bars.Select(b => new
        {
            b.StockId,
            Ts = EnsureUtc(b.Ts),
            b.Open,
            b.High,
            b.Low,
            b.Close,
            b.Volume,
        }).ToList();

        return await conn.ExecuteAsync(insertSql, parameterSets);
    }

    private static bool IsTransient(Exception ex) =>
        ex is TimeoutException
            || ex is ObjectDisposedException
            || ex is NpgsqlException
            || (ex.InnerException is not null && IsTransient(ex.InnerException));

    private static DateTime EnsureUtc(DateTime ts) =>
        ts.Kind switch
        {
            DateTimeKind.Utc         => ts,
            DateTimeKind.Local       => ts.ToUniversalTime(),
            DateTimeKind.Unspecified => DateTime.SpecifyKind(ts, DateTimeKind.Utc),
            _                        => ts,
        };
}
