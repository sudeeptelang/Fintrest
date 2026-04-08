namespace Fintrest.Api.Services.Providers.Contracts;

/// <summary>
/// Provides news headlines, sentiment scores, and analyst data.
/// Primary: Finnhub | Backup: MarketAux / Benzinga
/// </summary>
public interface INewsProvider
{
    /// <summary>Get recent news for a ticker.</summary>
    Task<List<NewsArticle>> GetNewsAsync(string ticker, DateTime from, DateTime to, CancellationToken ct = default);

    /// <summary>Get analyst recommendations/ratings.</summary>
    Task<AnalystConsensus?> GetAnalystRatingsAsync(string ticker, CancellationToken ct = default);

    /// <summary>Get insider trading activity.</summary>
    Task<InsiderActivity?> GetInsiderActivityAsync(string ticker, CancellationToken ct = default);
}

public record NewsArticle(
    string Headline,
    string? Source,
    string? Url,
    double? Sentiment,       // -1.0 to 1.0
    string? CatalystType,    // earnings, upgrade, product, regulatory, etc.
    DateTime PublishedAt
);

public record AnalystConsensus(
    string Ticker,
    double Rating,           // 1-5 (1=strong sell, 5=strong buy)
    int TotalAnalysts,
    int StrongBuy,
    int Buy,
    int Hold,
    int Sell,
    int StrongSell,
    double? TargetPrice
);

public record InsiderActivity(
    string Ticker,
    bool NetBuying,         // true = more buying than selling recently
    int BuyTransactions,
    int SellTransactions,
    double NetValue         // positive = net buying $
);
