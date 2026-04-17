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
}

public record EarningCalendarEntry(
    string Ticker,
    DateTime Date,
    double? EpsEstimated,
    double? RevenueEstimated
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
