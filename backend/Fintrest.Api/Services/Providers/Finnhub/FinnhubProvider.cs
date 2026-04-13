using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Fintrest.Api.Services.Providers;
using Fintrest.Api.Services.Providers.Contracts;

namespace Fintrest.Api.Services.Providers.Finnhub;

/// <summary>
/// Finnhub — news, sentiment, analyst ratings, insider trades.
/// Docs: https://finnhub.io/docs/api
/// </summary>
public class FinnhubProvider(HttpClient http, IConfiguration config, ILogger<FinnhubProvider> logger)
    : INewsProvider
{
    private readonly string _apiKey = config["Providers:Finnhub:ApiKey"] ?? "";
    private readonly string _baseUrl = "https://finnhub.io/api/v1";

    public async Task<List<NewsArticle>> GetNewsAsync(
        string ticker, DateTime from, DateTime to, CancellationToken ct = default)
    {
        var fromStr = from.ToString("yyyy-MM-dd");
        var toStr = to.ToString("yyyy-MM-dd");
        var url = $"{_baseUrl}/company-news?symbol={ticker}&from={fromStr}&to={toStr}&token={_apiKey}";

        try
        {
            var articles = await Fetch<List<FinnhubNews>>(url, ct);
            if (articles is null) return [];

            return articles.Select(a => new NewsArticle(
                Headline: a.Headline,
                Source: a.Source,
                Url: a.Url,
                Sentiment: ClassifySentiment(a.Headline, a.Summary),
                CatalystType: DetectCatalyst(a.Headline, a.Category),
                PublishedAt: DateTimeOffset.FromUnixTimeSeconds(a.Datetime).UtcDateTime
            )).ToList();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Finnhub: Failed to fetch news for {Ticker}", ticker);
            return [];
        }
    }

    public async Task<AnalystConsensus?> GetAnalystRatingsAsync(string ticker, CancellationToken ct = default)
    {
        var url = $"{_baseUrl}/stock/recommendation?symbol={ticker}&token={_apiKey}";

        try
        {
            var recs = await Fetch<List<FinnhubRecommendation>>(url, ct);
            var latest = recs?.FirstOrDefault();
            if (latest is null) return null;

            var total = latest.StrongBuy + latest.Buy + latest.Hold + latest.Sell + latest.StrongSell;
            if (total == 0) return null;

            // Weighted rating 1-5
            var weighted = (latest.StrongBuy * 5.0 + latest.Buy * 4 + latest.Hold * 3
                            + latest.Sell * 2 + latest.StrongSell * 1) / total;

            return new AnalystConsensus(
                Ticker: ticker,
                Rating: Math.Round(weighted, 2),
                TotalAnalysts: total,
                StrongBuy: latest.StrongBuy,
                Buy: latest.Buy,
                Hold: latest.Hold,
                Sell: latest.Sell,
                StrongSell: latest.StrongSell,
                TargetPrice: null // Use separate endpoint if needed
            );
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Finnhub: Failed to fetch ratings for {Ticker}", ticker);
            return null;
        }
    }

    public async Task<InsiderActivity?> GetInsiderActivityAsync(string ticker, CancellationToken ct = default)
    {
        var url = $"{_baseUrl}/stock/insider-transactions?symbol={ticker}&token={_apiKey}";

        try
        {
            var response = await Fetch<FinnhubInsiderResponse>(url, ct);
            var txns = response?.Data;
            if (txns is null or { Count: 0 }) return null;

            // Last 90 days
            var recent = txns.Where(t =>
            {
                if (!DateTime.TryParse(t.TransactionDate, out var d)) return false;
                return d >= DateTime.UtcNow.AddDays(-90);
            }).ToList();

            var buys = recent.Count(t => t.TransactionType == "P" || t.TransactionType == "A");
            var sells = recent.Count(t => t.TransactionType == "S" || t.TransactionType == "D");
            var netValue = recent.Sum(t =>
            {
                var val = (t.Share ?? 0) * (t.Price ?? 0);
                return t.TransactionType is "P" or "A" ? val : -val;
            });

            return new InsiderActivity(
                Ticker: ticker,
                NetBuying: buys > sells,
                BuyTransactions: buys,
                SellTransactions: sells,
                NetValue: netValue
            );
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Finnhub: Failed to fetch insider activity for {Ticker}", ticker);
            return null;
        }
    }

    private async Task<T?> Fetch<T>(string url, CancellationToken ct) where T : class
    {
        return await HttpRetry.WithBackoffAsync(
            token => http.GetFromJsonAsync<T>(url, token),
            logger,
            "Finnhub fetch",
            ct: ct);
    }

    /// <summary>
    /// Simple keyword-based sentiment classification.
    /// TODO: Replace with ML model or dedicated sentiment API.
    /// </summary>
    private static double? ClassifySentiment(string headline, string? summary)
    {
        var text = $"{headline} {summary}".ToLowerInvariant();

        var positiveWords = new[] { "beat", "surge", "record", "upgrade", "bullish", "strong", "growth", "soar", "rally", "exceed", "positive", "outperform", "raises guidance" };
        var negativeWords = new[] { "miss", "drop", "decline", "downgrade", "bearish", "weak", "loss", "plunge", "cut", "warning", "negative", "underperform", "lowers guidance" };

        var posCount = positiveWords.Count(w => text.Contains(w));
        var negCount = negativeWords.Count(w => text.Contains(w));
        var total = posCount + negCount;

        if (total == 0) return 0;
        return Math.Clamp((posCount - negCount) / (double)total, -1.0, 1.0);
    }

    /// <summary>Detect what type of catalyst a news article represents.</summary>
    private static string? DetectCatalyst(string headline, string? category)
    {
        var text = headline.ToLowerInvariant();
        if (text.Contains("earning") || text.Contains("eps") || text.Contains("revenue") || text.Contains("guidance"))
            return "earnings";
        if (text.Contains("upgrade") || text.Contains("downgrade") || text.Contains("price target"))
            return "upgrade";
        if (text.Contains("product") || text.Contains("launch") || text.Contains("release"))
            return "product";
        if (text.Contains("fda") || text.Contains("regulat") || text.Contains("approv"))
            return "regulatory";
        if (text.Contains("merger") || text.Contains("acqui") || text.Contains("deal"))
            return "m&a";
        return null;
    }
}

// --- Finnhub JSON response models ---

file record FinnhubNews(
    [property: JsonPropertyName("headline")] string Headline,
    [property: JsonPropertyName("source")] string? Source,
    [property: JsonPropertyName("url")] string? Url,
    [property: JsonPropertyName("summary")] string? Summary,
    [property: JsonPropertyName("category")] string? Category,
    [property: JsonPropertyName("datetime")] long Datetime
);

file record FinnhubRecommendation(
    [property: JsonPropertyName("strongBuy")] int StrongBuy,
    [property: JsonPropertyName("buy")] int Buy,
    [property: JsonPropertyName("hold")] int Hold,
    [property: JsonPropertyName("sell")] int Sell,
    [property: JsonPropertyName("strongSell")] int StrongSell
);

file record FinnhubInsiderResponse(
    [property: JsonPropertyName("data")] List<FinnhubInsiderTxn>? Data
);

file record FinnhubInsiderTxn(
    [property: JsonPropertyName("transactionDate")] string? TransactionDate,
    [property: JsonPropertyName("transactionType")] string? TransactionType,
    [property: JsonPropertyName("share")] double? Share,
    [property: JsonPropertyName("price")] double? Price
);
