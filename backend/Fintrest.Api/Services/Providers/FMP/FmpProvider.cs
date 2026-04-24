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
        // Note: endpoint is `earnings-calendar` (plural) — the singular
        // `earning-calendar` form exists but returns empty on FMP Ultimate.
        var earningsTask = TryFetch<List<FmpEarningCalendar>>($"{_baseUrl}/earnings-calendar?symbol={ticker}&from={today:yyyy-MM-dd}&to={today.AddDays(120):yyyy-MM-dd}&apikey={_apiKey}", ct);

        await Task.WhenAll(profileTask, keyMetricsTask, ratiosTask, targetTask, earningsTask);

        var profile = profileTask.Result?.FirstOrDefault();
        var keyMetrics = keyMetricsTask.Result?.FirstOrDefault();
        var ratios = ratiosTask.Result?.FirstOrDefault();
        var target = targetTask.Result?.FirstOrDefault();
        // FMP returns calendar-date strings like "2026-05-12" — DateTime.Parse
        // produces Kind=Unspecified, which Npgsql rejects when writing to the
        // timestamptz column Stock.NextEarningsDate. Anchor every parsed value
        // to UTC midnight; the column only cares about the date component
        // anyway. No-match case returns null rather than DateTime.MinValue.
        var nextEarningsDate = earningsTask.Result?
            .Where(e => DateTime.TryParse(e.Date, out _))
            .Select(e => (DateTime?)DateTime.SpecifyKind(DateTime.Parse(e.Date!), DateTimeKind.Utc))
            .Where(d => d >= today)
            .OrderBy(d => d)
            .FirstOrDefault();

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
        // Hard-coded index endpoints for S&P 500 / Nasdaq 100 / Dow.
        // For mid-cap expansion ("midcap", "russell1k") we fall through to the
        // stock-screener with a market-cap band.
        var path = indexKey.ToLowerInvariant() switch
        {
            "sp500" or "s&p500" or "spx" => "sp500-constituent",
            "nasdaq" or "nasdaq100" or "ndx" => "nasdaq-constituent",
            "dow" or "dowjones" or "dji" => "dowjones-constituent",
            _ => null
        };

        if (path is not null)
        {
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

        // Screener-backed presets — use FMP's stock-screener to pull a market-cap band.
        // marketCapMoreThan / marketCapLowerThan are in USD; we restrict to US common
        // stocks on NYSE/NASDAQ, actively trading, not an ETF or fund.
        var (minCap, maxCap) = indexKey.ToLowerInvariant() switch
        {
            // Russell 1000 approximation — everything ≥ $2B (covers large + mid).
            // S&P 500 members are already ≥ $14B, so this is additive when merged.
            "russell1k" or "russell1000" => ((long?)2_000_000_000L, (long?)null),
            // Russell 2000 approximation — mid + smaller names, cap ≥ $500M.
            // Adds ~1500–2000 tickers on top of russell1k.
            "russell2k" or "russell2000" => ((long?)500_000_000L, (long?)null),
            // Russell 3000 approximation — covers ~98% of US equity market cap.
            // Drops the floor to $150M to pull in the long tail. Can return 3000+.
            "russell3k" or "russell3000" => ((long?)150_000_000L, (long?)null),
            // Pure mid-cap band ($2B–$20B) — the S&P 400 substitute. Excludes most
            // mega-caps already in the sp500 preset, so combined coverage is
            // sp500 ∪ midcap ≈ Russell 1000 without the noisy small-cap tail.
            "midcap" => ((long?)2_000_000_000L, (long?)20_000_000_000L),
            _ => (null, null)
        };

        if (minCap is null)
        {
            logger.LogWarning("FMP: Unknown index key {IndexKey}", indexKey);
            return [];
        }

        var parts = new List<string>
        {
            $"marketCapMoreThan={minCap}",
            "exchange=NYSE,NASDAQ",
            "isEtf=false",
            "isFund=false",
            "isActivelyTrading=true",
            "country=US",
            "limit=3500",
            $"apikey={_apiKey}",
        };
        if (maxCap is not null) parts.Insert(1, $"marketCapLowerThan={maxCap}");
        var screenerUrl = $"{_baseUrl}/company-screener?{string.Join("&", parts)}";

        try
        {
            var rows = await TryFetch<List<FmpScreenerRow>>(screenerUrl, ct);
            if (rows is null) return [];
            return rows
                .Where(r => !string.IsNullOrWhiteSpace(r.Symbol))
                .Select(r => r.Symbol!.Trim().ToUpperInvariant())
                // Filter out obvious non-common-stock garbage: preferreds, warrants,
                // rights, and units usually have a '.', '-W', '-U', or '.PR' suffix.
                .Where(s => !s.Contains('.')
                            && !s.EndsWith("-W")
                            && !s.EndsWith("-U")
                            && !s.EndsWith("-R"))
                .Distinct()
                .ToList();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "FMP: screener failed for {IndexKey}", indexKey);
            return [];
        }
    }

    private class FmpScreenerRow
    {
        [JsonPropertyName("symbol")] public string? Symbol { get; set; }
        [JsonPropertyName("marketCap")] public long? MarketCap { get; set; }
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
        // FMP stable firehose: /insider-trading/latest (with slash, not hyphen).
        // Confirmed by brute-forcing URL variants — FMP's doc page shows a different
        // URL format than the actual API path here.
        var url = $"{_baseUrl}/insider-trading/latest?page=0&limit=100&apikey={_apiKey}";
        var rows = await TryFetch<List<FmpInsiderTradeFull>>(url, ct);
        logger.LogInformation(
            "FMP insider-trading/latest: rows={Rows} (null={Null})",
            rows?.Count ?? 0, rows is null);
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

    public async Task<AnalystConsensus?> GetAnalystConsensusAsync(string ticker, CancellationToken ct = default)
    {
        // FMP stable: /grades-consensus returns aggregate counts across the 5 rating
        // buckets plus a numeric consensus. Different path from the older /v3
        // /upgrades-downgrades-consensus endpoint; same semantics.
        var url = $"{_baseUrl}/grades-consensus?symbol={ticker}&apikey={_apiKey}";
        var rows = await TryFetch<List<FmpGradesConsensus>>(url, ct);
        var row = rows?.FirstOrDefault();
        if (row is null) return null;

        var strongBuy  = row.StrongBuy  ?? 0;
        var buy        = row.Buy        ?? 0;
        var hold       = row.Hold       ?? 0;
        var sell       = row.Sell       ?? 0;
        var strongSell = row.StrongSell ?? 0;
        var total      = strongBuy + buy + hold + sell + strongSell;
        if (total == 0) return null;

        // Numeric rating: Finnhub-style 1-5 where 5 = strong buy. Weighted avg.
        var rating = (strongBuy * 5 + buy * 4 + hold * 3 + sell * 2 + strongSell * 1)
                     / (double)total;

        return new AnalystConsensus(
            Ticker:        ticker.ToUpperInvariant(),
            Rating:        Math.Round(rating, 2),
            TotalAnalysts: total,
            StrongBuy:     strongBuy,
            Buy:           buy,
            Hold:          hold,
            Sell:          sell,
            StrongSell:    strongSell,
            TargetPrice:   null
        );
    }

    public async Task<PriceTargetSummary?> GetPriceTargetSummaryAsync(string ticker, CancellationToken ct = default)
    {
        // FMP stable: /price-target-summary returns recent avg targets aggregated
        // across multiple horizons. Only the most relevant bucket surfaces in
        // the widget (latest consensus + high/low range implied by it).
        var url = $"{_baseUrl}/price-target-summary?symbol={ticker}&apikey={_apiKey}";
        var rows = await TryFetch<List<FmpPriceTargetSummary>>(url, ct);
        var row = rows?.FirstOrDefault();
        if (row is null) return null;

        // Use lastMonth when present, else fall back through lastQuarter → allTime.
        var avg = row.LastMonthAvgPriceTarget
               ?? row.LastQuarterAvgPriceTarget
               ?? row.AllTimeAvgPriceTarget;
        var count = row.LastMonth
                 ?? row.LastQuarter
                 ?? row.AllTime
                 ?? 0;
        if (avg is null or 0) return null;

        return new PriceTargetSummary(
            TargetHigh:      null,
            TargetLow:       null,
            TargetConsensus: avg,
            TargetMedian:    null,
            AnalystCount:    count
        );
    }

    public async Task<List<AnalystGradeEvent>> GetAnalystGradeEventsAsync(
        string ticker, DateTime since, CancellationToken ct = default)
    {
        // FMP stable: /grades returns the firehose of analyst grade changes for a
        // symbol (up / down / initialize / reiterate / target). Filter client-side
        // by date so downstream code doesn't need to know the endpoint quirks.
        var url = $"{_baseUrl}/grades?symbol={ticker}&apikey={_apiKey}";
        var rows = await TryFetch<List<FmpGradeEvent>>(url, ct);
        if (rows is null) return [];

        var sinceUtc = since.Kind == DateTimeKind.Utc ? since : DateTime.SpecifyKind(since, DateTimeKind.Utc);
        var events = new List<AnalystGradeEvent>();
        foreach (var r in rows)
        {
            if (!DateTime.TryParse(r.Date, out var d)) continue;
            d = DateTime.SpecifyKind(d, DateTimeKind.Utc);
            if (d < sinceUtc) continue;
            events.Add(new AnalystGradeEvent(
                Date:           d,
                Action:         r.Action?.Trim().ToLowerInvariant(),
                NewGrade:       r.NewGrade,
                PreviousGrade:  r.PreviousGrade,
                GradingCompany: r.GradingCompany
            ));
        }
        events.Sort((a, b) => b.Date.CompareTo(a.Date));
        return events;
    }

    public async Task<List<EarningCalendarEntry>> GetEarningCalendarAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        // FMP stable: /earnings-calendar (plural!) with date range returns all
        // companies reporting. The singular /earning-calendar form is a FMP
        // doc-page typo that returns empty — confirmed via API test.
        var url = $"{_baseUrl}/earnings-calendar?from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}&apikey={_apiKey}";
        var rows = await TryFetch<List<FmpEarningCalendar>>(url, ct);
        if (rows is null) return [];

        return rows
            .Where(r => !string.IsNullOrWhiteSpace(r.Symbol) && DateTime.TryParse(r.Date, out _))
            .Select(r => new EarningCalendarEntry(
                Ticker: r.Symbol!.ToUpperInvariant(),
                Date: DateTime.Parse(r.Date!),
                EpsEstimated: r.EpsEstimated,
                RevenueEstimated: r.RevenueEstimated
            ))
            .OrderBy(e => e.Date)
            .ToList();
    }

    public async Task<List<IpoCalendarEntry>> GetIpoCalendarAsync(CancellationToken ct = default)
    {
        // FMP stable: /ipos-calendar (plural). No date range params supported;
        // server returns a ~30-day forward + small back window. Filter at the
        // controller if we want a narrower window.
        var url = $"{_baseUrl}/ipos-calendar?apikey={_apiKey}";
        var rows = await TryFetch<List<FmpIpoCalendar>>(url, ct);
        if (rows is null) return [];

        return rows
            .Where(r => !string.IsNullOrWhiteSpace(r.Symbol) && DateTime.TryParse(r.Date, out _))
            .Select(r => new IpoCalendarEntry(
                Ticker: r.Symbol!.ToUpperInvariant(),
                Company: r.Company ?? "",
                Date: DateTime.Parse(r.Date!),
                Exchange: r.Exchange,
                Status: r.Actions,
                Shares: r.Shares,
                PriceRange: r.PriceRange,
                MarketCap: r.MarketCap
            ))
            .OrderByDescending(e => e.Date)
            .ToList();
    }

    public async Task<List<CongressTrade>> GetCongressTradesAsync(int limit = 50, CancellationToken ct = default)
    {
        // FMP stable: /senate-latest + /house-latest are the disclosure firehoses
        // (no symbol filter). Confirmed via FMP docs at /developer/docs/stable/senate-latest
        // and /developer/docs/stable/house-latest. Available on Ultimate + Ownership datasets.
        var senateTask = TryFetch<List<FmpCongressTrade>>(
            $"{_baseUrl}/senate-latest?page=0&limit=100&apikey={_apiKey}", ct);
        var houseTask = TryFetch<List<FmpCongressTrade>>(
            $"{_baseUrl}/house-latest?page=0&limit=100&apikey={_apiKey}", ct);

        await Task.WhenAll(senateTask, houseTask);
        logger.LogInformation(
            "FMP congress firehose: senate={S} house={H}",
            senateTask.Result?.Count ?? 0, houseTask.Result?.Count ?? 0);

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

    public async Task<FinancialScoresDto?> GetFinancialScoresAsync(string ticker, CancellationToken ct = default)
    {
        // FMP stable: /financial-scores returns Altman Z + Piotroski F +
        // a few underlying balance-sheet items. One row per symbol; we
        // take the first (FMP only ships current-period).
        var url = $"{_baseUrl}/financial-scores?symbol={ticker}&apikey={_apiKey}";
        var rows = await TryFetch<List<FmpFinancialScores>>(url, ct);
        if (rows is null || rows.Count == 0) return null;
        var r = rows[0];
        return new FinancialScoresDto(
            Ticker: ticker.ToUpperInvariant(),
            AltmanZScore: r.AltmanZScore,
            PiotroskiScore: r.PiotroskiScore,
            WorkingCapital: r.WorkingCapital,
            TotalAssets: r.TotalAssets,
            RetainedEarnings: r.RetainedEarnings,
            Ebit: r.Ebit,
            MarketCap: r.MarketCap,
            TotalLiabilities: r.TotalLiabilities,
            Revenue: r.Revenue
        );
    }

    public async Task<ShortInterestSnapshotDto?> GetShortInterestAsync(string ticker, CancellationToken ct = default)
    {
        // FMP stable: /short-interest returns the latest FINRA snapshot per
        // symbol. FINRA publishes bi-monthly; this endpoint surfaces the
        // most recent settlement. If the path isn't live on the caller's
        // tier, the response is null or empty — returns null so callers
        // degrade gracefully.
        var url = $"{_baseUrl}/short-interest?symbol={ticker}&apikey={_apiKey}";
        var rows = await TryFetch<List<FmpShortInterest>>(url, ct);
        if (rows is null || rows.Count == 0) return null;

        var latest = rows
            .Where(r => DateTime.TryParse(r.SettlementDate, out _))
            .OrderByDescending(r => DateTime.Parse(r.SettlementDate!))
            .FirstOrDefault();
        if (latest is null) return null;

        return new ShortInterestSnapshotDto(
            Ticker: ticker.ToUpperInvariant(),
            SettlementDate: DateTime.SpecifyKind(DateTime.Parse(latest.SettlementDate!), DateTimeKind.Utc),
            ShortInterestShares: latest.ShortInterest,
            FloatShares: latest.FloatShares,
            ShortPctFloat: latest.ShortPercentOfFloat ?? (latest.ShortInterest.HasValue && latest.FloatShares is > 0
                ? (decimal)latest.ShortInterest.Value / latest.FloatShares.Value * 100m
                : null),
            DaysToCover: latest.DaysToCover,
            AvgDailyVolume: latest.AvgDailyVolume
        );
    }

    private async Task<T?> TryFetch<T>(string url, CancellationToken ct) where T : class
    {
        // Throttle through the shared rate limiter (650/min leaves headroom under FMP Premier 750/min)
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
            // Elevate log level for insider/congress so silent deserialization failures are visible.
            var isDiagnostic = url.Contains("insider-trading") || url.Contains("senate-latest") || url.Contains("house-latest");
            if (isDiagnostic)
                logger.LogWarning(ex, "FMP: Failed to fetch {Url}", url);
            else
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

file record FmpIpoCalendar(
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("date")] string? Date,
    [property: JsonPropertyName("company")] string? Company,
    [property: JsonPropertyName("exchange")] string? Exchange,
    [property: JsonPropertyName("actions")] string? Actions,
    [property: JsonPropertyName("shares")] long? Shares,
    [property: JsonPropertyName("priceRange")] string? PriceRange,
    [property: JsonPropertyName("marketCap")] long? MarketCap
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

file record FmpGradesConsensus(
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("strongBuy")]  int? StrongBuy,
    [property: JsonPropertyName("buy")]        int? Buy,
    [property: JsonPropertyName("hold")]       int? Hold,
    [property: JsonPropertyName("sell")]       int? Sell,
    [property: JsonPropertyName("strongSell")] int? StrongSell,
    [property: JsonPropertyName("consensus")]  string? Consensus
);

file record FmpGradeEvent(
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("date")] string? Date,
    [property: JsonPropertyName("gradingCompany")] string? GradingCompany,
    [property: JsonPropertyName("previousGrade")] string? PreviousGrade,
    [property: JsonPropertyName("newGrade")] string? NewGrade,
    [property: JsonPropertyName("action")] string? Action
);

file record FmpPriceTargetSummary(
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("lastMonth")] int? LastMonth,
    [property: JsonPropertyName("lastMonthAvgPriceTarget")] double? LastMonthAvgPriceTarget,
    [property: JsonPropertyName("lastQuarter")] int? LastQuarter,
    [property: JsonPropertyName("lastQuarterAvgPriceTarget")] double? LastQuarterAvgPriceTarget,
    [property: JsonPropertyName("lastYear")] int? LastYear,
    [property: JsonPropertyName("lastYearAvgPriceTarget")] double? LastYearAvgPriceTarget,
    [property: JsonPropertyName("allTime")] int? AllTime,
    [property: JsonPropertyName("allTimeAvgPriceTarget")] double? AllTimeAvgPriceTarget
);

/// <summary>FMP /stable/financial-scores row. Altman Z + Piotroski F
/// are the two primary quant-health measures we surface; the rest of
/// the fields (total assets, retained earnings, EBIT, etc.) are the
/// raw inputs that FMP exposes alongside — kept for future audit /
/// recomputation.</summary>
file record FmpFinancialScores(
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("altmanZScore")] decimal? AltmanZScore,
    [property: JsonPropertyName("piotroskiScore")] decimal? PiotroskiScore,
    [property: JsonPropertyName("workingCapital")] decimal? WorkingCapital,
    [property: JsonPropertyName("totalAssets")] decimal? TotalAssets,
    [property: JsonPropertyName("retainedEarnings")] decimal? RetainedEarnings,
    [property: JsonPropertyName("ebit")] decimal? Ebit,
    [property: JsonPropertyName("marketCap")] decimal? MarketCap,
    [property: JsonPropertyName("totalLiabilities")] decimal? TotalLiabilities,
    [property: JsonPropertyName("revenue")] decimal? Revenue
);

/// <summary>FMP /stable/short-interest row. Field names are best-guess
/// based on FMP's short-interest docs; if the live API uses different
/// names we fall back to null values and the sub-signal just stays
/// empty rather than crashing. Verify with a curl before wiring
/// heavy reliance on specific fields.</summary>
file record FmpShortInterest(
    [property: JsonPropertyName("symbol")] string? Symbol,
    [property: JsonPropertyName("settlementDate")] string? SettlementDate,
    [property: JsonPropertyName("shortInterest")] long? ShortInterest,
    [property: JsonPropertyName("floatShares")] long? FloatShares,
    [property: JsonPropertyName("shortPercentOfFloat")] decimal? ShortPercentOfFloat,
    [property: JsonPropertyName("daysToCover")] decimal? DaysToCover,
    [property: JsonPropertyName("avgDailyVolume")] long? AvgDailyVolume
);
