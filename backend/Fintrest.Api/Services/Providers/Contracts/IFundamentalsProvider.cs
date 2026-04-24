namespace Fintrest.Api.Services.Providers.Contracts;

/// <summary>
/// Provides earnings, revenue, margins, and valuation data.
/// Primary: Financial Modeling Prep | Backup: Finnhub
/// </summary>
public interface IFundamentalsProvider
{
    /// <summary>Get quarterly income statement data.</summary>
    Task<List<QuarterlyEarnings>> GetQuarterlyEarningsAsync(string ticker, int quarters = 4, CancellationToken ct = default);

    /// <summary>Get key financial ratios and metrics.</summary>
    Task<FinancialMetrics?> GetMetricsAsync(string ticker, CancellationToken ct = default);

    /// <summary>Get slow-changing per-stock profile data: Beta, analyst target, next earnings date,
    /// forward valuation ratios. Pulled from FMP /profile, /key-metrics-ttm, /ratios-ttm,
    /// /price-target-consensus, /earning_calendar.</summary>
    Task<StockProfile?> GetStockProfileAsync(string ticker, CancellationToken ct = default);

    /// <summary>Fetch constituent ticker list for a major index. Supported keys: "sp500", "nasdaq", "dowjones".
    /// Used by the seed/preset endpoints to expand the scan universe without hardcoding lists.</summary>
    Task<List<string>> GetIndexConstituentsAsync(string indexKey, CancellationToken ct = default);

    /// <summary>Get ownership breakdown: institutional %, insider %, and recent insider transactions.
    /// Used by the Simply Wall St-style ownership strip on stock detail pages.</summary>
    Task<OwnershipSnapshot?> GetOwnershipAsync(string ticker, CancellationToken ct = default);

    /// <summary>Global fire-hose of recent insider transactions across all US equities.
    /// Used by the /insiders activity page.</summary>
    Task<List<InsiderTradeEvent>> GetLatestInsiderTradesAsync(int limit = 50, CancellationToken ct = default);

    /// <summary>Merged Senate + House trading disclosures, most recent first.
    /// Used by the /congress tracker page.</summary>
    Task<List<CongressTrade>> GetCongressTradesAsync(int limit = 50, CancellationToken ct = default);

    /// <summary>Global earning calendar for a date range (no symbol filter).
    /// Used by the dashboard earnings widget so it works without per-stock ingestion.</summary>
    Task<List<EarningCalendarEntry>> GetEarningCalendarAsync(DateTime from, DateTime to, CancellationToken ct = default);

    /// <summary>Global IPO calendar — upcoming + recent IPOs across US exchanges.
    /// Used by the Markets page IPO card. FMP endpoint has no date range;
    /// returns ~30 days forward and ~7 back.</summary>
    Task<List<IpoCalendarEntry>> GetIpoCalendarAsync(CancellationToken ct = default);

    /// <summary>Analyst rating consensus — counts across 5 rating buckets + the
    /// aggregate recommendation. Used as a fallback when the primary Finnhub feed
    /// is unavailable. Returns null when FMP has no data for the ticker.
    /// Shares the <c>AnalystConsensus</c> record defined in INewsProvider so the
    /// controller can merge Finnhub + FMP results without field-mapping gymnastics.</summary>
    Task<AnalystConsensus?> GetAnalystConsensusAsync(string ticker, CancellationToken ct = default);

    /// <summary>Per-analyst price-target summary. Drives the high / low / median
    /// columns on the analyst consensus widget that Finnhub's free tier doesn't
    /// expose.</summary>
    Task<PriceTargetSummary?> GetPriceTargetSummaryAsync(string ticker, CancellationToken ct = default);

    /// <summary>Recent analyst rating change events (upgrades / downgrades /
    /// reiterations). Returned newest-first. Drives the v3 breadth feature that
    /// reads net direction of sentiment changes over rolling windows.</summary>
    Task<List<AnalystGradeEvent>> GetAnalystGradeEventsAsync(string ticker, DateTime since, CancellationToken ct = default);

    /// <summary>Latest short-interest snapshot for a ticker (FINRA bi-monthly,
    /// delivered via FMP). Returns null if FMP has no record. Feeds the
    /// Smart Money "Short dynamics" sub-signal.</summary>
    Task<ShortInterestSnapshotDto?> GetShortInterestAsync(string ticker, CancellationToken ct = default);

    /// <summary>FMP-computed financial-health scores — Altman Z, Piotroski F,
    /// working-capital score. Returns null if FMP has no record. Adds
    /// institutional-grade rigor to the Fundamentals factor.</summary>
    Task<FinancialScoresDto?> GetFinancialScoresAsync(string ticker, CancellationToken ct = default);

    /// <summary>FMP-computed discounted cash flow fair value, paired
    /// with the stock's current price so we can show implied upside /
    /// downside. Null if FMP has no DCF model on file for the ticker.</summary>
    Task<DcfValuationDto?> GetDcfAsync(string ticker, CancellationToken ct = default);

    /// <summary>Recent earnings-surprise history — one row per quarter
    /// with estimate, actual, and surprise %. Powers the "beats X of
    /// last Y" narrative on the ticker detail + feeds the Fundamentals
    /// factor quality check. Most-recent first, up to `quarters` rows.</summary>
    Task<List<EarningsSurpriseDto>> GetEarningsSurprisesAsync(string ticker, int quarters = 12, CancellationToken ct = default);
}

/// <summary>One earnings-surprise row. Surprise % is computed as
/// (actual - estimate) / |estimate| × 100; FMP sometimes ships it
/// pre-computed, sometimes we derive.</summary>
public record EarningsSurpriseDto(
    string Ticker,
    DateTime ReportDate,
    decimal? EstimatedEps,
    decimal? ActualEps,
    decimal? SurprisePct,
    bool Beat
);

/// <summary>FMP /stable/discounted-cash-flow output. DCF is a fair-value
/// estimate; we pair with StockPrice to compute implied upside or
/// downside in a single backend response.</summary>
public record DcfValuationDto(
    string Ticker,
    decimal? DcfFairValue,
    decimal? StockPrice,
    DateTime? AsOf
);

/// <summary>FMP /stable/financial-scores output. All three scores are
/// well-known quant measures:
///
///   Altman Z:  composite bankruptcy-risk score. &gt;3 safe, 1.8–3 grey, &lt;1.8 distress.
///   Piotroski F: 0–9 score of fundamental improvement. 7+ strong, &lt;=3 weak.
///   Working Cap: FMP-proprietary short-term liquidity metric.
/// </summary>
public record FinancialScoresDto(
    string Ticker,
    decimal? AltmanZScore,
    decimal? PiotroskiScore,
    decimal? WorkingCapital,
    decimal? TotalAssets,
    decimal? RetainedEarnings,
    decimal? Ebit,
    decimal? MarketCap,
    decimal? TotalLiabilities,
    decimal? Revenue
);

/// <summary>One short-interest snapshot. Percent-of-float is the key
/// number for the Smart Money sub-score; days-to-cover + avg-daily-volume
/// are kept for future squeeze/conviction modeling.</summary>
public record ShortInterestSnapshotDto(
    string Ticker,
    DateTime SettlementDate,
    long? ShortInterestShares,
    long? FloatShares,
    decimal? ShortPctFloat,
    decimal? DaysToCover,
    long? AvgDailyVolume
);

/// <summary>One rating-change event from a covering analyst. Action is a
/// string because FMP surfaces a half-dozen values ("up", "down", "initialize",
/// "reiterate", "target"); downstream code normalizes to three buckets.</summary>
public record AnalystGradeEvent(
    DateTime Date,
    string? Action,          // "up" | "down" | "reiterate" | "initialize" | "target"
    string? NewGrade,
    string? PreviousGrade,
    string? GradingCompany
);

public record PriceTargetSummary(
    double? TargetHigh,
    double? TargetLow,
    double? TargetConsensus,
    double? TargetMedian,
    int     AnalystCount
);

public record EarningCalendarEntry(
    string Ticker,
    DateTime Date,
    double? EpsEstimated,
    double? RevenueEstimated
);

public record IpoCalendarEntry(
    string Ticker,
    string Company,
    DateTime Date,
    string? Exchange,
    string? Status,         // "Expected", "Priced", "Withdrawn"
    long? Shares,
    string? PriceRange,
    long? MarketCap
);

public record InsiderTradeEvent(
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

public record CongressTrade(
    string Chamber,               // "senate" or "house"
    string Ticker,
    string? AssetDescription,
    string? Representative,
    string? TransactionType,      // "Purchase", "Sale (Partial)", etc.
    DateTime? TransactionDate,
    DateTime? DisclosureDate,
    string? Amount,               // FMP returns ranges like "$1,001 - $15,000"
    string? SourceUrl
);

public record OwnershipSnapshot(
    string Ticker,
    double? InstitutionalPercent,
    int? InvestorsHolding,
    int? InvestorsHoldingChange,
    double? TotalInvested,
    double? OwnershipPercentChange,
    List<InsiderTransaction> RecentInsiderTrades
);

public record InsiderTransaction(
    DateTime? TransactionDate,
    string? ReportingName,
    string? Relationship,
    string? TransactionType,   // "P-Purchase", "S-Sale", etc.
    double? SharesTraded,
    double? Price,
    double? TotalValue
);

public record QuarterlyEarnings(
    string Period,          // "2026-Q1"
    DateTime? ReportedAt,
    double? Revenue,
    double? RevenueGrowth,  // YoY %
    double? Eps,
    double? EpsSurprise,    // % beat/miss
    double? GrossMargin,
    double? OperatingMargin
);

public record FinancialMetrics(
    string Ticker,
    double? PeRatio,
    double? PsRatio,
    double? PbRatio,
    double? DebtToEquity,
    double? CurrentRatio,
    double? Roe
);

public record StockProfile(
    double? Beta,
    double? AnalystTargetPrice,
    DateTime? NextEarningsDate,
    double? ForwardPe,
    double? PegRatio,
    double? PriceToBook,
    double? ReturnOnEquity,
    double? ReturnOnAssets,
    double? OperatingMargin
);
