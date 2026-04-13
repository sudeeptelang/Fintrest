using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Providers.Contracts;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Ingestion;

/// <summary>
/// Fetches data from all providers, normalizes it, and persists to Supabase.
/// Designed to run daily before the scoring engine.
/// </summary>
public class DataIngestionService(
    AppDbContext db,
    IMarketDataProvider marketProvider,
    IFundamentalsProvider fundamentalsProvider,
    INewsProvider newsProvider,
    IServiceScopeFactory scopeFactory,
    ILogger<DataIngestionService> logger)
{
    /// <summary>Default parallelism for the bulk ingestion run. Tuned to be friendly to free-tier
    /// rate limits (Polygon = 5/min on free, FMP = 250/day on free) while still extracting
    /// throughput on paid tiers. Override via the maxParallel param on the controller endpoint.</summary>
    private const int DefaultMaxParallel = 6;

    public record IngestionResult(
        int StocksProcessed,
        int BarsIngested,
        int FundamentalsIngested,
        int NewsIngested,
        int Errors,
        int DurationMs
    );

    public record StockIngestCounts(int Bars, int Fundamentals, int News);

    /// <summary>Run full ingestion for all tracked stocks. Parallelism is bounded by
    /// <paramref name="maxParallel"/>; each parallel slot creates its own DI scope so it gets
    /// a fresh DbContext (DbContext is not thread-safe).</summary>
    public async Task<IngestionResult> IngestAllAsync(int maxParallel = DefaultMaxParallel, CancellationToken ct = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();

        // Read the ticker list once using the constructor-injected db (this scope)
        var tickers = await db.Stocks
            .Where(s => s.Active)
            .OrderBy(s => s.Ticker)
            .Select(s => s.Ticker)
            .ToListAsync(ct);

        logger.LogInformation(
            "Starting parallel ingestion for {Count} stocks (degree={Degree})",
            tickers.Count, maxParallel);

        int totalBars = 0, totalFundamentals = 0, totalNews = 0, errors = 0;

        await Parallel.ForEachAsync(
            tickers,
            new ParallelOptions { MaxDegreeOfParallelism = maxParallel, CancellationToken = ct },
            async (ticker, token) =>
            {
                try
                {
                    // Each parallel slot needs its own scope → its own DbContext + provider
                    // instances, since DbContext is not thread-safe.
                    using var scope = scopeFactory.CreateScope();
                    var svc = scope.ServiceProvider.GetRequiredService<DataIngestionService>();
                    var counts = await svc.IngestStockAsync(ticker, token);

                    Interlocked.Add(ref totalBars, counts.Bars);
                    Interlocked.Add(ref totalFundamentals, counts.Fundamentals);
                    Interlocked.Add(ref totalNews, counts.News);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Ingestion failed for {Ticker}", ticker);
                    Interlocked.Increment(ref errors);
                }
            });

        sw.Stop();

        logger.LogInformation(
            "Parallel ingestion complete: {Stocks} stocks, {Bars} bars, {Funds} fundamentals, {News} news in {Ms}ms ({Errors} errors)",
            tickers.Count, totalBars, totalFundamentals, totalNews, sw.ElapsedMilliseconds, errors);

        return new IngestionResult(tickers.Count, totalBars, totalFundamentals, totalNews, errors, (int)sw.ElapsedMilliseconds);
    }

    /// <summary>Ingest a single stock (for on-demand refresh). Returns per-source counts
    /// so the bulk runner can aggregate telemetry.</summary>
    public async Task<StockIngestCounts> IngestStockAsync(string ticker, CancellationToken ct = default)
    {
        var stock = await db.Stocks.FirstOrDefaultAsync(s => s.Ticker.ToUpper() == ticker.ToUpper(), ct);
        if (stock is null)
        {
            // New stock — fetch details and create record
            stock = await CreateStockFromProviderAsync(ticker, ct);
            if (stock is null) return new StockIngestCounts(0, 0, 0);
        }

        var bars = await IngestMarketDataAsync(stock, ct);
        var funds = await IngestFundamentalsAsync(stock, ct);
        var news = await IngestNewsAsync(stock, ct);
        await db.SaveChangesAsync(ct);

        return new StockIngestCounts(bars, funds, news);
    }

    /// <summary>Sync the stock universe from provider (add new tickers, update details).</summary>
    public async Task<int> SyncStockUniverseAsync(List<string> tickers, CancellationToken ct = default)
    {
        var existing = await db.Stocks.Select(s => s.Ticker.ToUpper()).ToListAsync(ct);
        var newTickers = tickers.Where(t => !existing.Contains(t.ToUpper())).ToList();

        logger.LogInformation("Syncing universe: {Existing} existing, {New} new tickers", existing.Count, newTickers.Count);

        var added = 0;
        foreach (var ticker in newTickers)
        {
            var stock = await CreateStockFromProviderAsync(ticker, ct);
            if (stock is not null) added++;
        }

        await db.SaveChangesAsync(ct);
        return added;
    }

    private async Task<Stock?> CreateStockFromProviderAsync(string ticker, CancellationToken ct)
    {
        var details = await marketProvider.GetTickerDetailsAsync(ticker, ct);
        if (details is null) return null;

        var stock = new Stock
        {
            Ticker = details.Ticker,
            Name = details.Name,
            Exchange = details.Exchange,
            Sector = details.Sector,
            Industry = details.Industry,
            MarketCap = details.MarketCap,
            FloatShares = details.FloatShares,
        };
        db.Stocks.Add(stock);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Added new stock: {Ticker} ({Name})", stock.Ticker, stock.Name);
        return stock;
    }

    private async Task<int> IngestMarketDataAsync(Stock stock, CancellationToken ct)
    {
        // Get the latest bar date we have
        var latestDate = await db.MarketData
            .Where(m => m.StockId == stock.Id)
            .OrderByDescending(m => m.Ts)
            .Select(m => m.Ts)
            .FirstOrDefaultAsync(ct);

        // Partitions exist for 2026 Q1+ only — don't fetch data before that
        var partitionStart = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var from = latestDate != default
            ? latestDate.AddDays(1)
            : partitionStart;

        if (from.Date >= DateTime.UtcNow.Date) return 0; // Already up to date

        var bars = await marketProvider.GetDailyBarsAsync(stock.Ticker, from, DateTime.UtcNow, ct);

        foreach (var bar in bars)
        {
            db.MarketData.Add(new MarketData
            {
                StockId = stock.Id,
                Timeframe = "1d",
                Ts = bar.Date,
                Open = bar.Open,
                High = bar.High,
                Low = bar.Low,
                Close = bar.Close,
                Volume = bar.Volume,
            });
        }

        return bars.Count;
    }

    private async Task<int> IngestFundamentalsAsync(Stock stock, CancellationToken ct)
    {
        var earnings = await fundamentalsProvider.GetQuarterlyEarningsAsync(stock.Ticker, 4, ct);
        if (earnings.Count == 0) return 0;

        // Only insert new reports (by report date)
        var existingDates = await db.Fundamentals
            .Where(f => f.StockId == stock.Id)
            .Select(f => f.ReportDate)
            .ToListAsync(ct);

        var newEarnings = earnings
            .Where(e => e.ReportedAt.HasValue && !existingDates.Contains(e.ReportedAt))
            .ToList();

        foreach (var e in newEarnings)
        {
            db.Fundamentals.Add(new Fundamental
            {
                StockId = stock.Id,
                ReportDate = e.ReportedAt,
                RevenueGrowth = e.RevenueGrowth,
                EpsGrowth = e.EpsSurprise, // Map eps surprise to eps growth
                GrossMargin = e.GrossMargin,
                NetMargin = e.OperatingMargin, // Map operating margin to net margin
            });
        }

        // Pull slow-changing TTM/profile metrics (Beta, analyst target, forward ratios, ROE/ROA, etc.)
        // and stamp them onto the Stock row. Idempotent — safe to call every ingestion run.
        var profile = await fundamentalsProvider.GetStockProfileAsync(stock.Ticker, ct);
        if (profile is not null)
        {
            if (profile.Beta.HasValue) stock.Beta = profile.Beta;
            if (profile.AnalystTargetPrice.HasValue) stock.AnalystTargetPrice = profile.AnalystTargetPrice;
            if (profile.NextEarningsDate.HasValue) stock.NextEarningsDate = profile.NextEarningsDate;
            if (profile.ForwardPe.HasValue) stock.ForwardPe = profile.ForwardPe;
            if (profile.PegRatio.HasValue) stock.PegRatio = profile.PegRatio;
            if (profile.PriceToBook.HasValue) stock.PriceToBook = profile.PriceToBook;
            if (profile.ReturnOnEquity.HasValue) stock.ReturnOnEquity = profile.ReturnOnEquity;
            if (profile.ReturnOnAssets.HasValue) stock.ReturnOnAssets = profile.ReturnOnAssets;
            if (profile.OperatingMargin.HasValue) stock.OperatingMargin = profile.OperatingMargin;
            stock.MetricsUpdatedAt = DateTime.UtcNow;
        }

        return newEarnings.Count;
    }

    private async Task<int> IngestNewsAsync(Stock stock, CancellationToken ct)
    {
        var from = DateTime.UtcNow.AddDays(-7);
        var to = DateTime.UtcNow;

        var articles = await newsProvider.GetNewsAsync(stock.Ticker, from, to, ct);
        if (articles.Count == 0) return 0;

        // Deduplicate by headline
        var existingHeadlines = await db.NewsItems
            .Where(n => n.StockId == stock.Id && n.PublishedAt >= from)
            .Select(n => n.Headline)
            .ToListAsync(ct);

        var newArticles = articles
            .Where(a => !existingHeadlines.Contains(a.Headline))
            .ToList();

        foreach (var a in newArticles)
        {
            db.NewsItems.Add(new NewsItem
            {
                StockId = stock.Id,
                Headline = a.Headline,
                Source = a.Source,
                Url = a.Url,
                SentimentScore = a.Sentiment,
                CatalystType = a.CatalystType,
                PublishedAt = a.PublishedAt,
            });
        }

        return newArticles.Count;
    }
}
