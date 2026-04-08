namespace Fintrest.Api.Services.Providers.Contracts;

/// <summary>
/// Provides OHLCV price data and ticker info.
/// Primary: Polygon.io | Backup: Twelve Data / Tiingo
/// </summary>
public interface IMarketDataProvider
{
    /// <summary>Fetch daily OHLCV bars for a ticker.</summary>
    Task<List<OhlcvBar>> GetDailyBarsAsync(string ticker, DateTime from, DateTime to, CancellationToken ct = default);

    /// <summary>Get latest snapshot (current price + volume) for a ticker.</summary>
    Task<TickerSnapshot?> GetSnapshotAsync(string ticker, CancellationToken ct = default);

    /// <summary>Get snapshots for all tracked tickers in one call.</summary>
    Task<List<TickerSnapshot>> GetAllSnapshotsAsync(CancellationToken ct = default);

    /// <summary>Get ticker details (name, exchange, sector, market cap, float).</summary>
    Task<TickerDetails?> GetTickerDetailsAsync(string ticker, CancellationToken ct = default);

    /// <summary>Search tickers by keyword.</summary>
    Task<List<TickerSearchResult>> SearchTickersAsync(string query, int limit = 10, CancellationToken ct = default);
}

public record OhlcvBar(
    DateTime Date,
    double Open,
    double High,
    double Low,
    double Close,
    long Volume
);

public record TickerSnapshot(
    string Ticker,
    double Price,
    double Change,
    double ChangePercent,
    long Volume,
    double? PrevClose,
    DateTime UpdatedAt
);

public record TickerDetails(
    string Ticker,
    string Name,
    string? Exchange,
    string? Sector,
    string? Industry,
    double? MarketCap,
    double? SharesOutstanding,
    double? FloatShares,
    string? Description
);

public record TickerSearchResult(string Ticker, string Name, string? Exchange);
