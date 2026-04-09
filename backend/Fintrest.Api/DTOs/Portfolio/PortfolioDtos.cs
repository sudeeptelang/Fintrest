using System.ComponentModel.DataAnnotations;

namespace Fintrest.Api.DTOs.Portfolio;

public record PortfolioCreateRequest(
    [Required] string Name,
    string? Strategy = null,
    double InitialCash = 0
);

public record PortfolioResponse(
    long Id,
    string Name,
    string? Strategy,
    double CashBalance,
    double TotalValue,
    double DailyReturnPct,
    int HoldingsCount,
    DateTime CreatedAt
);

public record HoldingResponse(
    long Id,
    long StockId,
    string Ticker,
    string StockName,
    double Quantity,
    double AvgCost,
    double CurrentPrice,
    double CurrentValue,
    double UnrealizedPnl,
    double UnrealizedPnlPct,
    double? SignalScore
);

public record TransactionRequest(
    [Required] long StockId,
    [Required] string Type, // BUY, SELL, DIVIDEND
    [Required] double Quantity,
    [Required] double Price,
    double? Fees = 0,
    string? Notes = null
);

public record TransactionResponse(
    long Id,
    string Ticker,
    string Type,
    double Quantity,
    double Price,
    double Fees,
    double Total,
    DateTime ExecutedAt
);

public record SnapshotResponse(
    DateTime Date,
    double TotalValue,
    double Cash,
    double Invested,
    double DailyReturnPct,
    double CumulativeReturnPct
);

public record RecommendationResponse(
    long Id,
    string Type,
    string? Ticker,
    string Action,
    string Reasoning,
    double Confidence,
    string Status,
    DateTime CreatedAt
);

public record RiskMetricsResponse(
    DateTime Date,
    double? SharpeRatio,
    double? SortinoRatio,
    double? MaxDrawdown,
    double? Beta,
    double? Var95,
    double? Volatility,
    double? TotalReturn
);

public record PortfolioAnalyticsResponse(
    RiskMetricsResponse? RiskMetrics,
    Dictionary<string, double> SectorAllocation,
    List<HoldingResponse> TopHoldings,
    double HealthScore
);

public record AdvisorResponse(
    double HealthScore,
    List<RecommendationResponse> Recommendations,
    List<string> Alerts
);
