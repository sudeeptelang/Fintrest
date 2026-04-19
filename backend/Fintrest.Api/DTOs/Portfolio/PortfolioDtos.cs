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
    double? SignalScore,
    double? DayChangePct = null,
    // Analyst consensus fair value (stocks.analyst_target_price) and the derived
    // % discount. Positive FairValueDiscountPct = trading below fair value; negative
    // = above it.
    double? FairValue = null,
    double? FairValueDiscountPct = null,
    // Last ~60 trading-day closes, oldest→newest. Powers the per-row sparkline in
    // the holdings table; kept on the response so the page doesn't need a second
    // round-trip per ticker. Null when we have no bar history for this stock.
    double[]? PriceHistory60d = null
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

/// <summary>
/// One point on the Performance vs Market chart. Both values are indexed to 100
/// at the start of the requested window so the line chart shows relative growth,
/// not absolute dollars — same treatment as SimplyWall.st's portfolio chart.
/// </summary>
public record PerformancePoint(
    DateTime Date,
    double PortfolioIndex,  // 100 at t0
    double BenchmarkIndex,  // 100 at t0
    double PortfolioReturnPct,  // cumulative return from t0
    double BenchmarkReturnPct   // cumulative return from t0
);

public record PerformanceSeriesResponse(
    string Benchmark,           // e.g. "SPY"
    string Range,               // "1m" | "3m" | "6m" | "1y" | "all"
    List<PerformancePoint> Points,
    double? FinalPortfolioReturnPct,
    double? FinalBenchmarkReturnPct,
    double? FinalAlphaPct
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

/// <summary>
/// Return decomposition for the portfolio header (pillar #1 of the 10-pillar spec).
/// Mirrors SimplyWall.st's demo: total return broken into its three sources, plus
/// annualized IRR so a +115% lifetime return makes sense alongside its 22% CAGR.
///
/// <para><b>CAGR formula:</b> assumes money-weighted return approximation —
/// <c>((currentValue + dividends + cashProceeds) / totalInvested) ^ (1/years) - 1</c>.
/// This is the retail-tool convention; a true IRR with ongoing deposits needs
/// solving for the IRR root, which we'll add when it matters for the Elite-tier
/// PDF report. Until then this is close enough for a header number.</para>
/// </summary>
public record ReturnBreakdownResponse(
    double CostBasis,             // sum of BUY totals (money invested, gross of any sales)
    double CurrentValue,          // live holdings value at latest market prices
    double UnrealizedPnl,         // CurrentValue - (cost basis still held)
    double RealizedPnl,           // proceeds from SELLs - cost basis of those shares (approx.)
    double DividendsReceived,     // sum of DIVIDEND transaction totals
    double TotalReturn,           // UnrealizedPnl + RealizedPnl + DividendsReceived
    double TotalReturnPct,        // TotalReturn / CostBasis * 100
    double? AnnualizedReturnPct,  // CAGR — null if < 30 days of history (annualizing noise)
    DateTime? InceptionDate,      // date of the earliest transaction
    int DaysSinceInception,
    double? BenchmarkReturnPct,   // SPY simple return over the inception window (same start/end)
    double? AlphaPct              // TotalReturnPct - BenchmarkReturnPct; positive = beating the market
);

/// <summary>
/// Letter-graded portfolio rating, WSZ-style. Maps our 0-100 factor profile to
/// A/B/C/D/F on each axis + an overall grade. UI uses this for the coarse "how
/// does my portfolio look" read; the underlying numeric score is still available
/// via <see cref="PortfolioFactorProfile"/> for the advanced view.
/// </summary>
public record PortfolioRatingResponse(
    string Overall,               // "A"..."F" — weighted avg of component grades
    int OverallScore,             // 0-100, the number the letter is derived from
    Dictionary<string, CategoryGrade> Categories,
    List<string> Strengths,       // categories at A/B
    List<string> Watchouts,       // categories at D/F
    int Coverage                  // holdings contributing (= had an active signal)
);

public record CategoryGrade(string Grade, int Score, string Label);

public record AdvisorResponse(
    double HealthScore,
    List<RecommendationResponse> Recommendations,
    List<string> Alerts,
    PortfolioFactorProfile? FactorProfile = null,
    Dictionary<string, int>? VerdictMix = null,
    string? RegimeContext = null
);

/// <summary>
/// Position-weighted average of the 7-factor percentile scores across every holding
/// that has a current Signal/Breakdown. A portfolio at 80 Momentum + 40 Risk tells a
/// very different story than one at 50 Momentum + 75 Risk — this is how we show that.
/// </summary>
public record PortfolioFactorProfile(
    double Momentum,
    double Volume,
    double Catalyst,
    double Fundamental,
    double Sentiment,
    double Trend,
    double Risk,
    int Coverage  // how many holdings contributed (= had an active signal)
);
