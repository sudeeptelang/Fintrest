using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Fintrest.Api.Services.Providers;
using Fintrest.Api.Services.Providers.Contracts;

namespace Fintrest.Api.Services.Providers.Polygon;

/// <summary>
/// Polygon.io market data provider.
/// Docs: https://polygon.io/docs
/// </summary>
public class PolygonProvider(HttpClient http, IConfiguration config, ILogger<PolygonProvider> logger)
    : IMarketDataProvider
{
    private readonly string _apiKey = config["Providers:Polygon:ApiKey"] ?? "";
    private readonly string _baseUrl = "https://api.polygon.io";

    public async Task<List<OhlcvBar>> GetDailyBarsAsync(string ticker, DateTime from, DateTime to, CancellationToken ct = default)
    {
        var fromStr = from.ToString("yyyy-MM-dd");
        var toStr = to.ToString("yyyy-MM-dd");
        var url = $"{_baseUrl}/v2/aggs/ticker/{ticker}/range/1/day/{fromStr}/{toStr}?adjusted=true&sort=asc&apiKey={_apiKey}";

        try
        {
            var response = await Fetch<PolygonAggsResponse>(url, ct);
            if (response?.Results is null) return [];

            return response.Results.Select(r => new OhlcvBar(
                Date: DateTimeOffset.FromUnixTimeMilliseconds(r.T).UtcDateTime.Date,
                Open: r.O,
                High: r.H,
                Low: r.L,
                Close: r.C,
                Volume: (long)r.V
            )).ToList();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Polygon: Failed to fetch bars for {Ticker}", ticker);
            return [];
        }
    }

    public async Task<TickerSnapshot?> GetSnapshotAsync(string ticker, CancellationToken ct = default)
    {
        var url = $"{_baseUrl}/v2/snapshot/locale/us/markets/stocks/tickers/{ticker}?apiKey={_apiKey}";

        try
        {
            var response = await Fetch<PolygonSnapshotWrapper>(url, ct);
            var snap = response?.Ticker;
            if (snap is null) return null;

            return new TickerSnapshot(
                Ticker: snap.TickerSymbol,
                Price: snap.Day?.C ?? snap.PrevDay?.C ?? 0,
                Change: snap.TodoChange ?? 0,
                ChangePercent: snap.TodoChangePercent ?? 0,
                Volume: (long)(snap.Day?.V ?? 0),
                PrevClose: snap.PrevDay?.C,
                UpdatedAt: DateTime.UtcNow
            );
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Polygon: Failed to fetch snapshot for {Ticker}", ticker);
            return null;
        }
    }

    public async Task<List<TickerSnapshot>> GetAllSnapshotsAsync(CancellationToken ct = default)
    {
        var url = $"{_baseUrl}/v2/snapshot/locale/us/markets/stocks/tickers?apiKey={_apiKey}";

        try
        {
            var response = await Fetch<PolygonAllSnapshotsResponse>(url, ct);
            if (response?.Tickers is null) return [];

            return response.Tickers.Select(snap => new TickerSnapshot(
                Ticker: snap.TickerSymbol,
                Price: snap.Day?.C ?? snap.PrevDay?.C ?? 0,
                Change: snap.TodoChange ?? 0,
                ChangePercent: snap.TodoChangePercent ?? 0,
                Volume: (long)(snap.Day?.V ?? 0),
                PrevClose: snap.PrevDay?.C,
                UpdatedAt: DateTime.UtcNow
            )).ToList();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Polygon: Failed to fetch all snapshots");
            return [];
        }
    }

    public async Task<TickerDetails?> GetTickerDetailsAsync(string ticker, CancellationToken ct = default)
    {
        var url = $"{_baseUrl}/v3/reference/tickers/{ticker}?apiKey={_apiKey}";

        try
        {
            var response = await Fetch<PolygonTickerDetailsResponse>(url, ct);
            var r = response?.Results;
            if (r is null) return null;

            return new TickerDetails(
                Ticker: r.Ticker,
                Name: r.Name,
                Exchange: r.PrimaryExchange,
                Sector: r.SicDescription,
                Industry: null,
                MarketCap: r.MarketCap,
                SharesOutstanding: r.ShareClassSharesOutstanding,
                FloatShares: r.WeightedSharesOutstanding,
                Description: r.Description
            );
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Polygon: Failed to fetch details for {Ticker}", ticker);
            return null;
        }
    }

    public async Task<List<TickerSearchResult>> SearchTickersAsync(string query, int limit = 10, CancellationToken ct = default)
    {
        var url = $"{_baseUrl}/v3/reference/tickers?search={Uri.EscapeDataString(query)}&active=true&market=stocks&limit={limit}&apiKey={_apiKey}";

        try
        {
            var response = await Fetch<PolygonTickerSearchResponse>(url, ct);
            if (response?.Results is null) return [];

            return response.Results.Select(r => new TickerSearchResult(
                r.Ticker, r.Name, r.PrimaryExchange
            )).ToList();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Polygon: Search failed for '{Query}'", query);
            return [];
        }
    }

    private async Task<T?> Fetch<T>(string url, CancellationToken ct) where T : class
    {
        return await HttpRetry.WithBackoffAsync(
            token => http.GetFromJsonAsync<T>(url, token),
            logger,
            "Polygon fetch",
            ct: ct);
    }
}

// --- Polygon JSON response models ---

file record PolygonAggsResponse(
    [property: JsonPropertyName("results")] List<PolygonBar>? Results
);

file record PolygonBar(
    [property: JsonPropertyName("t")] long T,
    [property: JsonPropertyName("o")] double O,
    [property: JsonPropertyName("h")] double H,
    [property: JsonPropertyName("l")] double L,
    [property: JsonPropertyName("c")] double C,
    [property: JsonPropertyName("v")] double V
);

file record PolygonSnapshotWrapper(
    [property: JsonPropertyName("ticker")] PolygonSnapshotTicker? Ticker
);

file record PolygonAllSnapshotsResponse(
    [property: JsonPropertyName("tickers")] List<PolygonSnapshotTicker>? Tickers
);

file record PolygonSnapshotTicker(
    [property: JsonPropertyName("ticker")] string TickerSymbol,
    [property: JsonPropertyName("day")] PolygonDayData? Day,
    [property: JsonPropertyName("prevDay")] PolygonDayData? PrevDay,
    [property: JsonPropertyName("todaysChange")] double? TodoChange,
    [property: JsonPropertyName("todaysChangePerc")] double? TodoChangePercent
);

file record PolygonDayData(
    [property: JsonPropertyName("c")] double? C,
    [property: JsonPropertyName("v")] double? V
);

file record PolygonTickerDetailsResponse(
    [property: JsonPropertyName("results")] PolygonTickerDetail? Results
);

file record PolygonTickerDetail(
    [property: JsonPropertyName("ticker")] string Ticker,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("primary_exchange")] string? PrimaryExchange,
    [property: JsonPropertyName("sic_description")] string? SicDescription,
    [property: JsonPropertyName("market_cap")] double? MarketCap,
    [property: JsonPropertyName("share_class_shares_outstanding")] double? ShareClassSharesOutstanding,
    [property: JsonPropertyName("weighted_shares_outstanding")] double? WeightedSharesOutstanding,
    [property: JsonPropertyName("description")] string? Description
);

file record PolygonTickerSearchResponse(
    [property: JsonPropertyName("results")] List<PolygonTickerSearchResult>? Results
);

file record PolygonTickerSearchResult(
    [property: JsonPropertyName("ticker")] string Ticker,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("primary_exchange")] string? PrimaryExchange
);
