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
    ILogger<DataIngestionService> logger)
{
    public record IngestionResult(
        int StocksProcessed,
        int BarsIngested,
        int FundamentalsIngested,
        int NewsIngested,
        int Errors,
        int DurationMs
    );

    /// <summary>Run full ingestion for all tracked stocks.</summary>
    public async Task<IngestionResult> IngestAllAsync(CancellationToken ct = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var stocks = await db.Stocks.Where(s => s.IsActive).ToListAsync(ct);

        logger.LogInformation("Starting ingestion for {Count} stocks", stocks.Count);

        int totalBars = 0, totalFundamentals = 0, totalNews = 0, errors = 0;

        foreach (var stock in stocks)
        {
            try
            {
                var bars = await IngestMarketDataAsync(stock, ct);
                totalBars += bars;

                var funds = await IngestFundamentalsAsync(stock, ct);
                totalFundamentals += funds;

                var news = await IngestNewsAsync(stock, ct);
                totalNews += news;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Ingestion failed for {Ticker}", stock.Ticker);
                errors++;
            }
        }

        await db.SaveChangesAsync(ct);
        sw.Stop();

        logger.LogInformation(
            "Ingestion complete: {Stocks} stocks, {Bars} bars, {Funds} fundamentals, {News} news in {Ms}ms",
            stocks.Count, totalBars, totalFundamentals, totalNews, sw.ElapsedMilliseconds);

        return new IngestionResult(stocks.Count, totalBars, totalFundamentals, totalNews, errors, (int)sw.ElapsedMilliseconds);
    }

    /// <summary>Ingest a single stock (for on-demand refresh).</summary>
    public async Task IngestStockAsync(string ticker, CancellationToken ct = default)
    {
        var stock = await db.Stocks.FirstOrDefaultAsync(s => s.Ticker.ToUpper() == ticker.ToUpper(), ct);
        if (stock is null)
        {
            // New stock — fetch details and create record
            stock = await CreateStockFromProviderAsync(ticker, ct);
            if (stock is null) return;
        }

        await IngestMarketDataAsync(stock, ct);
        await IngestFundamentalsAsync(stock, ct);
        await IngestNewsAsync(stock, ct);
        await db.SaveChangesAsync(ct);
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

        var from = latestDate != default
            ? latestDate.AddDays(1)
            : DateTime.UtcNow.AddYears(-1); // First load: 1 year of history

        if (from.Date >= DateTime.UtcNow.Date) return 0; // Already up to date

        var bars = await marketProvider.GetDailyBarsAsync(stock.Ticker, from, DateTime.UtcNow, ct);

        foreach (var bar in bars)
        {
            db.MarketData.Add(new MarketData
            {
                StockId = stock.Id,
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

        // Only insert new periods
        var existingPeriods = await db.Fundamentals
            .Where(f => f.StockId == stock.Id)
            .Select(f => f.Period)
            .ToListAsync(ct);

        var newEarnings = earnings.Where(e => !existingPeriods.Contains(e.Period)).ToList();

        foreach (var e in newEarnings)
        {
            db.Fundamentals.Add(new Fundamental
            {
                StockId = stock.Id,
                Period = e.Period,
                Revenue = e.Revenue,
                RevenueGrowth = e.RevenueGrowth,
                Eps = e.Eps,
                EpsSurprise = e.EpsSurprise,
                GrossMargin = e.GrossMargin,
                OperatingMargin = e.OperatingMargin,
                ReportedAt = e.ReportedAt,
            });
        }

        // Update metrics on stock record
        var metrics = await fundamentalsProvider.GetMetricsAsync(stock.Ticker, ct);
        if (metrics is not null)
        {
            stock.MarketCap = stock.MarketCap; // Keep existing unless provider updates
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
