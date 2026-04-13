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
    public required IReadOnlyList<double> ClosePrices { get; init; }
    public required IReadOnlyList<double> HighPrices { get; init; }
    public required IReadOnlyList<double> LowPrices { get; init; }
    public required IReadOnlyList<long> VolumeSeries { get; init; }

    // Fundamentals (latest quarter + Stock model TTM metrics)
    public double? RevenueGrowth { get; init; }
    public double? EpsGrowth { get; init; }
    public double? GrossMargin { get; init; }
    public double? NetMargin { get; init; }
    public double? PeRatio { get; init; }
    public double? PegRatio { get; init; }
    public double? ReturnOnEquity { get; init; }
    public double? ReturnOnAssets { get; init; }
    public double? OperatingMargin { get; init; }
    public double? DebtToEquity { get; init; }

    // News / Catalyst
    public double? NewsSentiment { get; init; }
    public bool HasCatalyst { get; init; }
    public string? CatalystType { get; init; }
    public int NewsCount { get; init; }

    // Analyst & Sentiment
    public double? AnalystRating { get; init; }
    public int? AnalystCount { get; init; }
    public double? AnalystTargetPrice { get; init; }
    public double? SocialScore { get; init; }

    // Insider activity
    public bool InsiderBuying { get; init; }
    public int InsiderBuyCount { get; init; }
    public int InsiderSellCount { get; init; }

    // Float/shares info
    public double? FloatShares { get; init; }
    public double? MarketCap { get; init; }
    public double? Beta { get; init; }

    // Earnings
    public DateTime? NextEarningsDate { get; init; }
    public double? LastEpsSurprise { get; init; }

    // Market regime (set by ScanOrchestrator before scoring)
    public int SpyTrendDirection { get; init; }
}
