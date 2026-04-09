namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// All the data needed to score a single stock.
/// Built by the pipeline from DB data — the scoring engine never touches the DB.
/// </summary>
public record StockSnapshot
{
    // Identity
    public required long StockId { get; init; }
    public required string Ticker { get; init; }
    public required string Name { get; init; }
    public string? Sector { get; init; }

    // Price data
    public required double Price { get; init; }
    public required long Volume { get; init; }
    public required IReadOnlyList<double> ClosePrices { get; init; }  // Last 200+ days
    public required IReadOnlyList<double> HighPrices { get; init; }
    public required IReadOnlyList<double> LowPrices { get; init; }
    public required IReadOnlyList<long> VolumeSeries { get; init; }

    // Fundamentals (latest quarter)
    public double? RevenueGrowth { get; init; }
    public double? EpsGrowth { get; init; }
    public double? GrossMargin { get; init; }
    public double? NetMargin { get; init; }
    public double? PeRatio { get; init; }

    // News / Catalyst
    public double? NewsSentiment { get; init; }    // -1.0 to 1.0, aggregated
    public bool HasCatalyst { get; init; }
    public string? CatalystType { get; init; }

    // Sentiment
    public double? SocialScore { get; init; }      // -1.0 to 1.0
    public double? AnalystRating { get; init; }    // 1-5 scale
    public bool InsiderBuying { get; init; }

    // Float/shares info
    public double? FloatShares { get; init; }
    public double? MarketCap { get; init; }
}
