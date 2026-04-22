namespace Fintrest.Api.DTOs.Signals;

public record SignalResponse(
    long Id,
    string Ticker,
    string StockName,
    string SignalType,
    double ScoreTotal,
    double? CurrentPrice,
    double? ChangePct,
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
    string? WhyNowSummary,
    // §14.1 — decomposition of the Fundamentals factor. Nullable because older
    // signals scored before the sub-score table was populated have no backing row.
    double? QualityScore = null,
    double? ProfitabilityScore = null,
    double? GrowthScore = null
);

public record SignalListResponse(List<SignalResponse> Signals, int Count);

public record PerformanceOverviewResponse(
    int TotalSignals,
    double WinRate,
    double AvgReturn,
    double AvgDrawdown
);

public record AuditLogEntry(
    long SignalId,
    string Ticker,
    string StockName,
    string SignalType,
    double ScoreTotal,
    DateTime IssuedAt,
    DateTime? ClosedAt,
    double? EntryPrice,
    double? ExitPrice,
    double? ReturnPct,
    int? DurationDays,
    string Outcome
);

public record FactorProfileSnapshot(
    double Momentum,
    double RelVolume,
    double News,
    double Fundamentals,
    double Sentiment,
    double Trend,
    double Risk
);

public record AuditLogDetail(
    long SignalId,
    string Ticker,
    string StockName,
    string SignalType,
    double ScoreTotal,
    DateTime IssuedAt,
    DateTime? ClosedAt,
    double? EntryPrice,
    double? StopPrice,
    double? TargetPrice,
    double? ExitPrice,
    double? ReturnPct,
    double? MaxRunupPct,
    double? MaxDrawdownPct,
    int? DurationDays,
    string Outcome,
    FactorProfileSnapshot? FactorProfile
);
