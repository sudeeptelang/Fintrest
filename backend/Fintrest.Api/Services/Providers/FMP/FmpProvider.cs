using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Fintrest.Api.Services.Providers.Contracts;

namespace Fintrest.Api.Services.Providers.FMP;

/// <summary>
/// Financial Modeling Prep — fundamentals and earnings data.
/// Docs: https://financialmodelingprep.com/developer/docs
/// </summary>
public class FmpProvider(HttpClient http, IConfiguration config, ILogger<FmpProvider> logger)
    : IFundamentalsProvider
{
    private readonly string _apiKey = config["Providers:FMP:ApiKey"] ?? "";
    private readonly string _baseUrl = "https://financialmodelingprep.com/api/v3";

    public async Task<List<QuarterlyEarnings>> GetQuarterlyEarningsAsync(
        string ticker, int quarters = 4, CancellationToken ct = default)
    {
        var url = $"{_baseUrl}/income-statement/{ticker}?period=quarter&limit={quarters}&apikey={_apiKey}";

        try
        {
            var statements = await http.GetFromJsonAsync<List<FmpIncomeStatement>>(url, ct);
            if (statements is null or { Count: 0 }) return [];

            var results = new List<QuarterlyEarnings>();

            for (var i = 0; i < statements.Count; i++)
            {
                var s = statements[i];
                double? prevRevenue = i + 1 < statements.Count ? statements[i + 1].Revenue : null;

                double? revenueGrowth = null;
                if (prevRevenue is > 0 && s.Revenue > 0)
                    revenueGrowth = (s.Revenue - prevRevenue.Value) / prevRevenue.Value * 100;

                results.Add(new QuarterlyEarnings(
                    Period: s.Period ?? $"{s.CalendarYear}-Q{QuarterFromDate(s.Date)}",
                    ReportedAt: DateTime.TryParse(s.FillingDate, out var d) ? d : null,
                    Revenue: s.Revenue,
                    RevenueGrowth: revenueGrowth,
                    Eps: s.Eps,
                    EpsSurprise: null, // FMP doesn't provide surprise directly; use earnings calendar
                    GrossMargin: s.Revenue > 0 ? s.GrossProfit / s.Revenue * 100 : null,
                    OperatingMargin: s.Revenue > 0 ? s.OperatingIncome / s.Revenue * 100 : null
                ));
            }

            return results;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "FMP: Failed to fetch earnings for {Ticker}", ticker);
            return [];
        }
    }

    public async Task<FinancialMetrics?> GetMetricsAsync(string ticker, CancellationToken ct = default)
    {
        var url = $"{_baseUrl}/ratios-ttm/{ticker}?apikey={_apiKey}";

        try
        {
            var ratios = await http.GetFromJsonAsync<List<FmpRatios>>(url, ct);
            var r = ratios?.FirstOrDefault();
            if (r is null) return null;

            return new FinancialMetrics(
                Ticker: ticker,
                PeRatio: r.PeRatioTTM,
                PsRatio: r.PriceToSalesRatioTTM,
                PbRatio: r.PriceToBookRatioTTM,
                DebtToEquity: r.DebtEquityRatioTTM,
                CurrentRatio: r.CurrentRatioTTM,
                Roe: r.ReturnOnEquityTTM
            );
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "FMP: Failed to fetch metrics for {Ticker}", ticker);
            return null;
        }
    }

    private static int QuarterFromDate(string? date)
    {
        if (date is null || !DateTime.TryParse(date, out var d)) return 1;
        return (d.Month - 1) / 3 + 1;
    }
}

// --- FMP JSON response models ---

file record FmpIncomeStatement(
    [property: JsonPropertyName("date")] string? Date,
    [property: JsonPropertyName("period")] string? Period,
    [property: JsonPropertyName("calendarYear")] string? CalendarYear,
    [property: JsonPropertyName("fillingDate")] string? FillingDate,
    [property: JsonPropertyName("revenue")] double Revenue,
    [property: JsonPropertyName("grossProfit")] double GrossProfit,
    [property: JsonPropertyName("operatingIncome")] double OperatingIncome,
    [property: JsonPropertyName("eps")] double? Eps
);

file record FmpRatios(
    [property: JsonPropertyName("peRatioTTM")] double? PeRatioTTM,
    [property: JsonPropertyName("priceToSalesRatioTTM")] double? PriceToSalesRatioTTM,
    [property: JsonPropertyName("priceToBookRatioTTM")] double? PriceToBookRatioTTM,
    [property: JsonPropertyName("debtEquityRatioTTM")] double? DebtEquityRatioTTM,
    [property: JsonPropertyName("currentRatioTTM")] double? CurrentRatioTTM,
    [property: JsonPropertyName("returnOnEquityTTM")] double? ReturnOnEquityTTM
);
