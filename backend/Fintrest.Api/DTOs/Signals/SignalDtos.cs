namespace Fintrest.Api.DTOs.Signals;

public record SignalResponse(
    Guid Id,
    string Ticker,
    string StockName,
    string SignalType,
    double ScoreTotal,
    double? EntryPrice,
    double? StopPrice,
    double? TargetPrice,
    SignalBreakdownDto? Breakdown,
    DateTime CreatedAt
);

public record SignalBreakdownDto(
    double MomentumScore,
    double VolumeScore,
    double CatalystScore,
    double FundamentalScore,
    double SentimentScore,
    double TrendScore,
    double RiskScore,
    string? ExplanationJson
);

public record SignalListResponse(List<SignalResponse> Signals, int Count);

public record PerformanceOverviewResponse(
    int TotalSignals,
    double WinRate,
    double AvgReturn,
    double AvgDrawdown
);
