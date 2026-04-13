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
}

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
