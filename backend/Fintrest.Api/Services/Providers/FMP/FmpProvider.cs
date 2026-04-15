using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Fintrest.Api.Services.Providers;
using Fintrest.Api.Services.Providers.Contracts;

namespace Fintrest.Api.Services.Providers.FMP;

/// <summary>
/// Financial Modeling Prep — fundamentals and earnings data.
/// Docs: https://financialmodelingprep.com/developer/docs
/// </summary>
public class FmpProvider(HttpClient http, IConfiguration config, ILogger<FmpProvider> logger, FmpRateLimiter rateLimiter)
    : IFundamentalsProvider
{
    private readonly string _apiKey = config["Providers:FMP:ApiKey"] ?? "";
    private readonly string _baseUrl = "https://financialmodelingprep.com/stable";

    public async Task<List<QuarterlyEarnings>> GetQuarterlyEarningsAsync(
        string ticker, int quarters = 4, CancellationToken ct = default)
    {
        var url = $"{_baseUrl}/income-statement?symbol={ticker}&period=quarter&limit={quarters}&apikey={_apiKey}";

        try
        {
            var statements = await TryFetch<List<FmpIncomeStatement>>(url, ct);
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
        var url = $"{_baseUrl}/ratios-ttm?symbol={ticker}&apikey={_apiKey}";

        try
        {
            var ratios = await TryFetch<List<FmpRatios>>(url, ct);
            var r = ratios?.FirstOrDefault();
            if (r is null) return null;

            return new FinancialMetrics(
                Ticker: ticker,
                PeRatio: r.PeRatioTTM,
                PsRatio: r.PriceToSalesRatioTTM,
                PbRatio: r.PriceToBookRatioTTM,
                DebtToEquity: r.DebtEquityRatioTTM,
                CurrentRatio: r.CurrentRatioTTM,
                Roe: null // ROE is now in key-metrics-ttm, fetched by GetStockProfileAsync
            );
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "FMP: Failed to fetch metrics for {Ticker}", ticker);
            return null;
        }
    }

    public async Task<StockProfile?> GetStockProfileAsync(string ticker, CancellationToken ct = default)
    {
        // Fan out 5 endpoints in parallel — total time ≈ slowest call.
        var profileTask = TryFetch<List<FmpProfile>>($"{_baseUrl}/profile?symbol={ticker}&apikey={_apiKey}", ct);
        var keyMetricsTask = TryFetch<List<FmpKeyMetricsTtm>>($"{_baseUrl}/key-metrics-ttm?symbol={ticker}&apikey={_apiKey}", ct);
        var ratiosTask = TryFetch<List<FmpRatiosFull>>($"{_baseUrl}/ratios-ttm?symbol={ticker}&apikey={_apiKey}", ct);
        var targetTask = TryFetch<List<FmpPriceTargetConsensus>>($"{_baseUrl}/price-target-consensus?symbol={ticker}&apikey={_apiKey}", ct);
        var today = DateTime.UtcNow.Date;
        var earningsTask = TryFetch<List<FmpEarningCalendar>>($"{_baseUrl}/earning-calendar?symbol={ticker}&from={today:yyyy-MM-dd}&to={today.AddDays(120):yyyy-MM-dd}&apikey={_apiKey}", ct);

        await Task.WhenAll(profileTask, keyMetricsTask, ratiosTask, targetTask, earningsTask);

        var profile = profileTask.Result?.FirstOrDefault();
        var keyMetrics = keyMetricsTask.Result?.FirstOrDefault();
        var ratios = ratiosTask.Result?.FirstOrDefault();
        var target = targetTask.Result?.FirstOrDefault();
        var nextEarnings = earningsTask.Result?
            .Where(e => DateTime.TryParse(e.Date, out _))
            .Select(e => DateTime.Parse(e.Date!))
            .Where(d => d >= today)
            .OrderBy(d => d)
            .FirstOrDefault();

        // Treat the default DateTime as null
        DateTime? nextEarningsDate = nextEarnings == default ? null : nextEarnings;

        if (profile is null && keyMetrics is null && ratios is null && target is null && nextEarningsDate is null)
            return null;

        // Forward P/E: prefer key-metrics ForwardPE; fall back to ratios PriceEarningsRatio if absent.
        // PEG: from key-metrics. P/B: from ratios or key-metrics. ROE/ROA: from ratios. OpMargin: from ratios.
        return new StockProfile(
            Beta: profile?.Beta,
            AnalystTargetPrice: target?.TargetConsensus,
            NextEarningsDate: nextEarningsDate,
            ForwardPe: ratios?.PeRatioTTM, // PE from ratios-ttm
            PegRatio: ratios?.PegRatioTTM, // PEG from ratios-ttm
            PriceToBook: ratios?.PriceToBookRatioTTM,
            ReturnOnEquity: keyMetrics?.RoeTTM,  // ROE from key-metrics-ttm
            ReturnOnAssets: keyMetrics?.RoaTTM,   // ROA from key-metrics-ttm
            OperatingMargin: ratios?.OperatingProfitMarginTTM
        );
    }

    public async Task<List<string>> GetIndexConstituentsAsync(string indexKey, CancellationToken ct = default)
    {
        // FMP exposes one endpoint per major index. Free tier covers all three.
        var path = indexKey.ToLowerInvariant() switch
        {
            "sp500" or "s&p500" or "spx" => "sp500-constituent",
            "nasdaq" or "nasdaq100" or "ndx" => "nasdaq-constituent",
            "dow" or "dowjones" or "dji" => "dowjones-constituent",
            _ => null
        };

        if (path is null)
        {
            logger.LogWarning("FMP: Unknown index key {IndexKey}", indexKey);
            return [];
        }

        var url = $"{_baseUrl}/{path}?apikey={_apiKey}";
        try
        {
            var rows = await TryFetch<List<FmpConstituent>>(url, ct);
            if (rows is null) return [];
            return rows
                .Where(r => !string.IsNullOrWhiteSpace(r.Symbol))
                .Select(r => r.Symbol!.Trim().ToUpperInvariant())
                .Distinct()
                .ToList();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "FMP: Failed to fetch index constituents for {IndexKey}", indexKey);
            return [];
        }
    }

    public async Task<OwnershipSnapshot?> GetOwnershipAsync(string ticker, CancellationToken ct = default)
    {
        // FMP stable: /institutional-ownership/symbol-ownership for aggregate, /insider-trading for transactions.
        var summaryTask = TryFetch<List<FmpInstitutionalOwnership>>(
            $"{_baseUrl}/institutional-ownership/symbol-ownership?symbol={ticker}&apikey={_apiKey}", ct);
        var insiderTask = TryFetch<List<FmpInsiderTrade>>(
            $"{_baseUrl}/insider-trading?symbol={ticker}&page=0&apikey={_apiKey}", ct);

        await Task.WhenAll(summaryTask, insiderTask);

        var summary = summaryTask.Result?.OrderByDescending(s => s.Date).FirstOrDefault();
        var insiderRows = insiderTask.Result ?? [];

        if (summary is null && insiderRows.Count == 0)
            return null;

        var trades = insiderRows.Take(8).Select(t => new InsiderTransaction(
            TransactionDate: DateTime.TryParse(t.TransactionDate, out var d) ? d : null,
            ReportingName: t.ReportingName,
            Relationship: t.TypeOfOwner,
            TransactionType: t.TransactionType,
            SharesTraded: t.SecuritiesTransacted,
            Price: t.Price,
            TotalValue: t.SecuritiesTransacted.HasValue && t.Price.HasValue
                ? t.SecuritiesTransacted * t.Price
                : null
        )).ToList();

        return new OwnershipSnapshot(
            Ticker: ticker.ToUpperInvariant(),
            InstitutionalPercent: summary?.OwnershipPercent,
            InvestorsHolding: summary?.InvestorsHolding,
            InvestorsHoldingChange: summary?.InvestorsHoldingChange,
            TotalInvested: summary?.TotalInvested,
            OwnershipPercentChange: summary?.OwnershipPercentChange,
            RecentInsiderTrades: trades
        );
    }

    public async Task<List<InsiderTradeEvent>> GetLatestInsiderTradesAsync(int limit = 50, CancellationToken ct = default)
    {
        // FMP stable: /insider-trading/latest returns the firehose (no symbol filter).
        var url = $"{_baseUrl}/insider-trading/latest?page=0&limit=100&apikey={_apiKey}";
        var rows = await TryFetch<List<FmpInsiderTradeFull>>(url, ct);
        if (rows is null) return [];

        return rows
            .Take(limit)
            .Select(t => new InsiderTradeEvent(
                Ticker: (t.Symbol ?? "").ToUpperInvariant(),
                TransactionDate: DateTime.TryParse(t.TransactionDate, out var td) ? td : null,
                FilingDate: DateTime.TryParse(t.FilingDate, out var fd) ? fd : null,
                ReportingName: t.ReportingName,
                Relationship: t.TypeOfOwner,
                TransactionType: t.TransactionType,
                SharesTraded: t.SecuritiesTransacted,
                Price: t.Price,
                TotalValue: t.SecuritiesTransacted.HasValue && t.Price.HasValue
                    ? t.SecuritiesTransacted * t.Price
                    : null
            ))
            .Where(a => !string.IsNullOrEmpty(a.Ticker))
            .ToList();
    }

    public async Task<List<CongressTrade>> GetCongressTradesAsync(int limit = 50, CancellationToken ct = default)
    {
        // FMP stable: senate + house latest trades (firehose feeds).
        var senateTask = TryFetch<List<FmpCongressTrade>>(
            $"{_baseUrl}/senate-latest?page=0&limit=100&apikey={_apiKey}", ct);
        var houseTask = TryFetch<List<FmpCongressTrade>>(
            $"{_baseUrl}/house-latest?page=0&limit=100&apikey={_apiKey}", ct);

        await Task.WhenAll(senateTask, houseTask);

        var merged = new List<CongressTrade>();
        foreach (var row in senateTask.Result ?? [])
            merged.Add(Map(row, "senate"));
        foreach (var row in houseTask.Result ?? [])
            merged.Add(Map(row, "house"));

        return merged
            .OrderByDescending(t => t.DisclosureDate ?? t.TransactionDate ?? DateTime.MinValue)
            .Take(limit)
            .ToList();

        static CongressTrade Map(FmpCongressTrade t, string chamber) => new(
            Chamber: chamber,
            Ticker: (t.Symbol ?? "").ToUpperInvariant(),
            AssetDescription: t.AssetDescription,
            Representative: t.FirstName != null || t.LastName != null
                ? $"{t.FirstName} {t.LastName}".Trim()
                : (t.Office ?? t.Representative),
            TransactionType: t.Type ?? t.TransactionType,
            TransactionDate: DateTime.TryParse(t.TransactionDate, out var td) ? td : null,
            DisclosureDate: DateTime.TryParse(t.DisclosureDate, out var dd) ? dd : null,
            Amount: t.Amount,
            SourceUrl: t.Link
        );
    }

    private async Task<T?> TryFetch<T>(string url, CancellationToken ct) where T : class
    {
        // Throttle through the shared rate limiter (250/min leaves headroom under FMP Starter 300/min)
        await rateLimiter.WaitAsync(ct);
        try
        {
            return await HttpRetry.WithBackoffAsync(
                token => http.GetFromJsonAsync<T>(url, token),
                logger,
                "FMP fetch",
                ct: ct);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "FMP: Failed to fetch {Url}", url);
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
    [property: JsonPropertyName("priceToEarningsRatioTTM")] double? PeRatioTTM,
    [property: JsonPropertyName("priceToSalesRatioTTM")] double? PriceToSalesRatioTTM,
    [property: JsonPropertyName("priceToBookRatioTTM")] double? PriceToBookRatioTTM,
    [property: JsonPropertyName("debtToEquityRatioTTM")] double? DebtEquityRatioTTM,
    [property: JsonPropertyName("currentRatioTTM")] double? CurrentRatioTTM,
    [property: JsonPropertyName("operatingProfitMarginTTM")] double? OperatingProfitMarginTTM
);

file record FmpRatiosFull(
    [property: JsonPropertyName("priceToBookRatioTTM")] double? PriceToBookRatioTTM,
    [property: JsonPropertyName("priceToEarningsRatioTTM")] double? PeRatioTTM,
    [property: JsonPropertyName("priceToEarningsGrowthRatioTTM")] double? PegRatioTTM,
    [property: JsonPropertyName("operatingProfitMarginTTM")] double? OperatingProfitMarginTTM
);

file record FmpProfile(
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("beta")] double? Beta,
    [property: JsonPropertyName("companyName")] string? CompanyName
);

file record FmpKeyMetricsTtm(
    [property: JsonPropertyName("returnOnEquityTTM")] double? RoeTTM,
    [property: JsonPropertyName("returnOnAssetsTTM")] double? RoaTTM,
    [property: JsonPropertyName("returnOnInvestedCapitalTTM")] double? RoicTTM,
    [property: JsonPropertyName("earningsYieldTTM")] double? EarningsYieldTTM
);

file record FmpPriceTargetConsensus(
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("targetHigh")] double? TargetHigh,
    [property: JsonPropertyName("targetLow")] double? TargetLow,
    [property: JsonPropertyName("targetConsensus")] double? TargetConsensus,
    [property: JsonPropertyName("targetMedian")] double? TargetMedian
);

file record FmpEarningCalendar(
    [property: JsonPropertyName("date")] string? Date,
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("epsEstimated")] double? EpsEstimated,
    [property: JsonPropertyName("revenueEstimated")] double? RevenueEstimated
);

file record FmpConstituent(
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("sector")] string? Sector
);

file record FmpInstitutionalOwnership(
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("date")] string? Date,
    [property: JsonPropertyName("investorsHolding")] int? InvestorsHolding,
    [property: JsonPropertyName("lastInvestorsHolding")] int? LastInvestorsHolding,
    [property: JsonPropertyName("investorsHoldingChange")] int? InvestorsHoldingChange,
    [property: JsonPropertyName("numberOf13Fshares")] long? NumberOf13Fshares,
    [property: JsonPropertyName("totalInvested")] double? TotalInvested,
    [property: JsonPropertyName("ownershipPercent")] double? OwnershipPercent,
    [property: JsonPropertyName("ownershipPercentChange")] double? OwnershipPercentChange
);

file record FmpInsiderTradeFull(
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("filingDate")] string? FilingDate,
    [property: JsonPropertyName("transactionDate")] string? TransactionDate,
    [property: JsonPropertyName("reportingName")] string? ReportingName,
    [property: JsonPropertyName("typeOfOwner")] string? TypeOfOwner,
    [property: JsonPropertyName("transactionType")] string? TransactionType,
    [property: JsonPropertyName("securitiesTransacted")] double? SecuritiesTransacted,
    [property: JsonPropertyName("price")] double? Price
);

file record FmpCongressTrade(
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("assetDescription")] string? AssetDescription,
    [property: JsonPropertyName("disclosureDate")] string? DisclosureDate,
    [property: JsonPropertyName("transactionDate")] string? TransactionDate,
    [property: JsonPropertyName("type")] string? Type,
    [property: JsonPropertyName("transactionType")] string? TransactionType,
    [property: JsonPropertyName("amount")] string? Amount,
    [property: JsonPropertyName("representative")] string? Representative,
    [property: JsonPropertyName("firstName")] string? FirstName,
    [property: JsonPropertyName("lastName")] string? LastName,
    [property: JsonPropertyName("office")] string? Office,
    [property: JsonPropertyName("link")] string? Link
);

file record FmpInsiderTrade(
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("transactionDate")] string? TransactionDate,
    [property: JsonPropertyName("reportingName")] string? ReportingName,
    [property: JsonPropertyName("typeOfOwner")] string? TypeOfOwner,
    [property: JsonPropertyName("transactionType")] string? TransactionType,
    [property: JsonPropertyName("securitiesTransacted")] double? SecuritiesTransacted,
    [property: JsonPropertyName("price")] double? Price
);
