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
