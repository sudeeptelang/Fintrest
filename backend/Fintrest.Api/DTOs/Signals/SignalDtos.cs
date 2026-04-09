namespace Fintrest.Api.DTOs.Signals;

public record SignalResponse(
    long Id,
    string Ticker,
    string StockName,
    string SignalType,
    double ScoreTotal,
    double? EntryLow,
    double? EntryHigh,
    double? StopLoss,
    double? TargetLow,
    double? TargetHigh,
    string? RiskLevel,
    int? HorizonDays,
    SignalBreakdownDto? Breakdown,
    DateTime CreatedAt
);

public record SignalBreakdownDto(
    double MomentumScore,
    double RelVolumeScore,
    double NewsScore,
    double FundamentalsScore,
    double SentimentScore,
    double TrendScore,
    double RiskScore,
    string? ExplanationJson,
    string? WhyNowSummary
);

public record SignalListResponse(List<SignalResponse> Signals, int Count);

public record PerformanceOverviewResponse(
    int TotalSignals,
    double WinRate,
    double AvgReturn,
    double AvgDrawdown
);
