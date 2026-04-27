namespace Fintrest.Api.DTOs.Signals;

public record SignalResponse(
    long Id,
    string Ticker,
    string StockName,
    string SignalType,
    // ScoreTotal carries the Setup lens (current swing-trade formula).
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
    DateTime CreatedAt,
    // Phase 2 multi-lens scoring: alternative composites surfaced from
    // signal_score_history. CompositeScore is the balanced "good investment
    // overall" lens; QualityScore is the fundamentals-led "would I hold
    // long-term" lens. Same 7 factors, different weights — see
    // ScoringOptions.cs FactorWeights.Composite()/Quality().
    // Note: distinct from Breakdown.QualityScore which is the fundamentals
    // sub-score decomposition (quality / profitability / growth).
    double? CompositeScore = null,
    double? LensQualityScore = null,
    // Live-quote freshness — `live_quotes.UpdatedAt` of the row whose
    // CurrentPrice/ChangePct we overlaid. Frontend renders this in
    // PriceFreshness so users see a real "as of HH:MM" instead of the
    // page-load time. Null when the live quote was missing or stale.
    DateTime? QuoteAsOf = null
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
    double? GrowthScore = null,
    // 8th factor — Smart Money family (25% of composite).
    // 50 = neutral default when sub-signals haven't landed yet.
    double SmartMoneyScore = 50.0
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
