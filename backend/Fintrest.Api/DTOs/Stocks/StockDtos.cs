namespace Fintrest.Api.DTOs.Stocks;

public record StockResponse(
    Guid Id,
    string Ticker,
    string Name,
    string? Exchange,
    string? Sector,
    string? Industry,
    double? MarketCap
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
    double? Rsi14
);

public record NewsResponse(
    string Headline,
    string? Source,
    string? Url,
    double? SentimentScore,
    string? CatalystType,
    DateTime? PublishedAt
);
