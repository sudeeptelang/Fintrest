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

public record SectorPerformanceResponse(
    string Sector,
    int StockCount,
    double? ChangePct,
    int SignalCount
);

public record MarketIndexResponse(
    string Ticker,
    string Label,
    double? Price,
    double? PrevClose,
    double? ChangePct
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
