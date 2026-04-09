namespace Fintrest.Api.DTOs.Stocks;

public record StockResponse(
    long Id,
    string Ticker,
    string Name,
    string? Exchange,
    string? Sector,
    string? Industry,
    double? MarketCap,
    double? FloatShares,
    string? Country
);

public record MarketDataResponse(
    DateTime Ts,
    double Open,
    double High,
    double Low,
    double Close,
    long Volume,
    double? Ma20,
    double? Ma50,
    double? Ma200,
    double? Rsi
);

public record NewsResponse(
    string Headline,
    string? Summary,
    string? Source,
    string? Url,
    double? SentimentScore,
    string? CatalystType,
    DateTime? PublishedAt
);
