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
    long Id,
    string Headline,
    string? Summary,
    string? Source,
    string? Url,
    double? SentimentScore,
    string? CatalystType,
    DateTime? PublishedAt,
    string? Ticker
);

public record AnalystConsensusResponse(
    string Ticker,
    int StrongBuy,
    int Buy,
    int Hold,
    int Sell,
    int StrongSell,
    int TotalAnalysts,
    double Rating,
    double? TargetHigh,
    double? TargetLow,
    double? TargetConsensus,
    double? TargetMedian
);

public record EarningsHistoryItem(
    string Period,
    DateTime? ReportedAt,
    double? Revenue,
    double? RevenueGrowth,
    double? Eps,
    double? EpsSurprise,
    double? GrossMargin,
    double? OperatingMargin
);

/// <summary>Combined row for the screener/dashboard table: snapshot + signal data.</summary>
public record ScreenerRowResponse(
    string Ticker,
    string Name,
    string? Sector,
    // Quote
    double? Price,
    double? ChangePct,
    long? Volume,
    double? RelVolume,
    double? MarketCap,
    // Valuation
    double? PeRatio,
    double? ForwardPe,
    double? PegRatio,
    double? PriceToBook,
    double? Beta,
    // Fundamentals
    double? ReturnOnEquity,
    double? OperatingMargin,
    double? RevenueGrowth,
    double? EpsGrowth,
    double? DividendYield,
    // Performance
    double? PerfWeek,
    double? PerfMonth,
    double? PerfQuarter,
    double? PerfYtd,
    double? PerfYear,
    double? Week52High,
    double? Week52Low,
    double? Week52RangePct,
    // Technical
    double? Rsi,
    double? AnalystTargetPrice,
    DateTime? NextEarningsDate,
    // Signal (from latest scan)
    double? SignalScore,
    string? SignalType,
    // Trade zone + thesis verdict (from latest scan)
    double? EntryLow,
    double? EntryHigh,
    double? StopLoss,
    double? TargetLow,
    double? TargetHigh,
    double? RiskReward,
    int? HorizonDays,
    string? Verdict
);

public record TrendingStockResponse(
    string Ticker,
    string Name,
    string? Sector,
    double Price,
    double ChangePct,
    long Volume,
    double? RelVolume,
    double? SignalScore
);

public record EarningsCalendarItem(
    string Ticker,
    string Name,
    DateTime EarningsDate,
    double? Price,
    double? SignalScore
);

public record SectorPerformanceResponse(
    string Sector,
    int StockCount,
    double? ChangePct,
    int SignalCount
);

public record MarketIndexResponse(
    string Ticker,
    string Label,
    string Category,
    double? Price,
    double? PrevClose,
    double? ChangePct
);

public record OwnershipResponse(
    string Ticker,
    double? InstitutionalPercent,
    int? InvestorsHolding,
    int? InvestorsHoldingChange,
    double? TotalInvested,
    double? OwnershipPercentChange,
    List<InsiderTradeDto> RecentInsiderTrades
);

public record InsiderTradeDto(
    DateTime? TransactionDate,
    string? ReportingName,
    string? Relationship,
    string? TransactionType,
    double? SharesTraded,
    double? Price,
    double? TotalValue
);

public record InsiderActivityItem(
    string Ticker,
    DateTime? TransactionDate,
    DateTime? FilingDate,
    string? ReportingName,
    string? Relationship,
    string? TransactionType,
    double? SharesTraded,
    double? Price,
    double? TotalValue
);

public record CongressTradeItem(
    string Chamber,
    string Ticker,
    string? AssetDescription,
    string? Representative,
    string? TransactionType,
    DateTime? TransactionDate,
    DateTime? DisclosureDate,
    string? Amount,
    string? SourceUrl
);

public record StockSnapshotResponse(
    // Identity
    string Ticker,
    string Name,
    string? Sector,
    string? Industry,
    string? Exchange,
    string? Country,
    // Latest price
    double? Price,
    double? PrevClose,
    double? Change,
    double? ChangePct,
    double? DayOpen,
    double? DayHigh,
    double? DayLow,
    // Volume
    long? Volume,
    double? AvgVolume,
    double? RelVolume,
    // Valuation
    double? MarketCap,
    double? FloatShares,
    double? PeRatio,
    double? ForwardPe,
    double? PegRatio,
    double? PsRatio,
    double? PriceToBook,
    double? DebtToEquity,
    // Margins / Growth
    double? GrossMargin,
    double? NetMargin,
    double? OperatingMargin,
    double? ReturnOnEquity,
    double? ReturnOnAssets,
    double? RevenueGrowth,
    double? EpsGrowth,
    // Profile (slow-changing per-stock)
    double? Beta,
    double? AnalystTargetPrice,
    DateTime? NextEarningsDate,
    // Technicals
    double? Rsi,
    double? Atr,
    double? AtrPct,
    double? Ma20,
    double? Ma50,
    double? Ma200,
    double? PctFromMa20,
    double? PctFromMa50,
    double? PctFromMa200,
    // 52W & Performance
    double? Week52High,
    double? Week52Low,
    double? Week52RangePct,
    double? PerfWeek,
    double? PerfMonth,
    double? PerfQuarter,
    double? PerfYtd,
    double? PerfYear
);
