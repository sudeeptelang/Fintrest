using Fintrest.Api.Data;
using Fintrest.Api.DTOs.Signals;
using Fintrest.Api.DTOs.Stocks;
using Fintrest.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Controllers;

[ApiController]
[Route("api/v1")]
public class MarketController(AppDbContext db) : ControllerBase
{
    [HttpGet("market/summary")]
    public async Task<IActionResult> MarketSummary()
    {
        var latestScan = await db.ScanRuns
            .Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefaultAsync();

        var signalCount = latestScan is not null
            ? await db.Signals.CountAsync(s => s.ScanRunId == latestScan.Id)
            : 0;

        return Ok(new
        {
            LatestScanAt = latestScan?.CompletedAt,
            SignalsToday = signalCount,
            MarketStatus = "pre_market"
        });
    }

    [HttpGet("market/sectors")]
    public async Task<ActionResult<List<SectorPerformanceResponse>>> SectorPerformance()
    {
        // Stocks with a sector assigned
        var stocks = await db.Stocks
            .Where(s => s.Active && s.Sector != null)
            .Select(s => new { s.Id, s.Sector, s.MarketCap })
            .ToListAsync();

        if (stocks.Count == 0) return Ok(new List<SectorPerformanceResponse>());

        var stockIds = stocks.Select(s => s.Id).ToList();

        // Pull last 7 days of bars; we only need the most recent per stock to read close + prev_close
        var cutoff = DateTime.UtcNow.AddDays(-7);
        var recentBars = await db.MarketData
            .Where(m => stockIds.Contains(m.StockId) && m.Ts >= cutoff)
            .Select(m => new { m.StockId, m.Ts, m.Close, m.PrevClose })
            .ToListAsync();

        var latestPerStock = recentBars
            .GroupBy(m => m.StockId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(m => m.Ts).First());

        // Signal counts per sector — from latest completed scan
        var latestScan = await db.ScanRuns
            .Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefaultAsync();

        Dictionary<string, int> sigCounts = new();
        if (latestScan is not null)
        {
            var rows = await db.Signals
                .Include(s => s.Stock)
                .Where(s => s.ScanRunId == latestScan.Id && s.Stock.Sector != null)
                .GroupBy(s => s.Stock.Sector!)
                .Select(g => new { Sector = g.Key, Count = g.Count() })
                .ToListAsync();
            sigCounts = rows.ToDictionary(r => r.Sector, r => r.Count);
        }

        var result = stocks
            .GroupBy(s => s.Sector!)
            .Select(g =>
            {
                var sector = g.Key;
                var members = g.ToList();
                double totalMcap = 0;
                double weightedChange = 0;
                var simpleChanges = new List<double>();
                foreach (var st in members)
                {
                    if (!latestPerStock.TryGetValue(st.Id, out var bar)) continue;
                    if (!bar.PrevClose.HasValue || bar.PrevClose.Value == 0) continue;
                    var ch = (bar.Close - bar.PrevClose.Value) / bar.PrevClose.Value * 100;
                    simpleChanges.Add(ch);
                    if (st.MarketCap is > 0)
                    {
                        totalMcap += st.MarketCap.Value;
                        weightedChange += ch * st.MarketCap.Value;
                    }
                }

                double? change = totalMcap > 0
                    ? weightedChange / totalMcap
                    : (simpleChanges.Count > 0 ? simpleChanges.Average() : null);

                return new SectorPerformanceResponse(
                    Sector: sector,
                    StockCount: members.Count,
                    ChangePct: change.HasValue ? Math.Round(change.Value, 2) : null,
                    SignalCount: sigCounts.GetValueOrDefault(sector, 0)
                );
            })
            .OrderByDescending(r => r.ChangePct ?? -999)
            .ToList();

        return Ok(result);
    }

    [HttpGet("market/indices")]
    public async Task<ActionResult<List<MarketIndexResponse>>> Indices()
    {
        // Index ETF proxies. Order matters — we use it for display order.
        var tickers = new[] { "SPY", "QQQ", "DIA", "IWM" };
        var labels = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["SPY"] = "S&P 500",
            ["QQQ"] = "Nasdaq",
            ["DIA"] = "Dow",
            ["IWM"] = "Russell 2000",
        };

        var stocks = await db.Stocks
            .Where(s => tickers.Contains(s.Ticker))
            .ToListAsync();

        if (stocks.Count == 0) return Ok(new List<MarketIndexResponse>());

        var stockIds = stocks.Select(s => s.Id).ToList();
        var cutoff = DateTime.UtcNow.AddDays(-7);
        var recentBars = await db.MarketData
            .Where(m => stockIds.Contains(m.StockId) && m.Ts >= cutoff)
            .Select(m => new { m.StockId, m.Ts, m.Close, m.PrevClose })
            .ToListAsync();

        var latest = recentBars
            .GroupBy(m => m.StockId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(m => m.Ts).First());

        var result = stocks
            .Select(s =>
            {
                latest.TryGetValue(s.Id, out var bar);
                double? changePct = null;
                if (bar?.PrevClose is > 0)
                    changePct = Math.Round((bar.Close - bar.PrevClose.Value) / bar.PrevClose.Value * 100, 2);
                return new MarketIndexResponse(
                    Ticker: s.Ticker,
                    Label: labels.GetValueOrDefault(s.Ticker, s.Name),
                    Price: bar?.Close,
                    PrevClose: bar?.PrevClose,
                    ChangePct: changePct
                );
            })
            .OrderBy(r => Array.IndexOf(tickers, r.Ticker))
            .ToList();

        return Ok(result);
    }

    [HttpGet("picks/top-today")]
    public async Task<ActionResult<SignalListResponse>> TopPicksToday([FromQuery] int limit = 12)
    {
        var latestScan = await db.ScanRuns
            .Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefaultAsync();

        if (latestScan is null)
            return Ok(new SignalListResponse([], 0));

        var signals = await db.Signals
            .Include(s => s.Stock)
            .Include(s => s.Breakdown)
            .Where(s => s.ScanRunId == latestScan.Id)
            .OrderByDescending(s => s.ScoreTotal)
            .Take(limit)
            .ToListAsync();

        return Ok(await ToSignalList(signals));
    }

    [HttpGet("picks/swing-week")]
    public async Task<ActionResult<SignalListResponse>> SwingWeek()
    {
        var latestScan = await db.ScanRuns
            .Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefaultAsync();

        if (latestScan is null)
            return Ok(new SignalListResponse([], 0));

        var signals = await db.Signals
            .Include(s => s.Stock)
            .Include(s => s.Breakdown)
            .Where(s => s.ScanRunId == latestScan.Id && s.SignalType == SignalType.BUY_TODAY)
            .OrderByDescending(s => s.ScoreTotal)
            .Take(5)
            .ToListAsync();

        return Ok(await ToSignalList(signals));
    }

    [HttpGet("stocks/{ticker}")]
    public async Task<ActionResult<StockResponse>> GetStock(string ticker)
    {
        var stock = await db.Stocks.FirstOrDefaultAsync(s => s.Ticker.ToUpper() == ticker.ToUpper());
        if (stock is null) return NotFound(new { message = "Stock not found" });

        return Ok(new StockResponse(stock.Id, stock.Ticker, stock.Name, stock.Exchange, stock.Sector, stock.Industry, stock.MarketCap, stock.FloatShares, stock.Country));
    }

    [HttpGet("stocks/{ticker}/chart")]
    public async Task<ActionResult<List<MarketDataResponse>>> GetStockChart(string ticker, [FromQuery] string range = "3m")
    {
        var stock = await db.Stocks.FirstOrDefaultAsync(s => s.Ticker.ToUpper() == ticker.ToUpper());
        if (stock is null) return NotFound(new { message = "Stock not found" });

        var limitMap = new Dictionary<string, int>
        {
            ["1d"] = 1, ["1w"] = 5, ["1m"] = 22, ["3m"] = 66, ["6m"] = 132, ["1y"] = 252
        };
        var limit = limitMap.GetValueOrDefault(range, 66);

        var data = await db.MarketData
            .Where(m => m.StockId == stock.Id)
            .OrderByDescending(m => m.Ts)
            .Take(limit)
            .ToListAsync();

        return Ok(data.OrderBy(d => d.Ts).Select(d =>
            new MarketDataResponse(d.Ts, d.Open, d.High, d.Low, d.Close, d.Volume, d.Ma20, d.Ma50, d.Ma200, d.Rsi)
        ).ToList());
    }

    [HttpGet("stocks/{ticker}/signals")]
    public async Task<ActionResult<SignalListResponse>> GetStockSignals(string ticker, [FromQuery] int limit = 10)
    {
        var stock = await db.Stocks.FirstOrDefaultAsync(s => s.Ticker.ToUpper() == ticker.ToUpper());
        if (stock is null) return NotFound(new { message = "Stock not found" });

        var signals = await db.Signals
            .Include(s => s.Stock)
            .Include(s => s.Breakdown)
            .Where(s => s.StockId == stock.Id)
            .OrderByDescending(s => s.CreatedAt)
            .Take(limit)
            .ToListAsync();

        return Ok(await ToSignalList(signals));
    }

    [HttpGet("stocks/{ticker}/snapshot")]
    public async Task<ActionResult<StockSnapshotResponse>> GetStockSnapshot(string ticker)
    {
        var stock = await db.Stocks.FirstOrDefaultAsync(s => s.Ticker.ToUpper() == ticker.ToUpper());
        if (stock is null) return NotFound(new { message = "Stock not found" });

        var fund = await db.Fundamentals
            .Where(f => f.StockId == stock.Id)
            .OrderByDescending(f => f.ReportDate)
            .FirstOrDefaultAsync();

        // Pull ~1 year of bars (newest first) for 52W + perf calcs
        var bars = await db.MarketData
            .Where(m => m.StockId == stock.Id)
            .OrderByDescending(m => m.Ts)
            .Take(260)
            .ToListAsync();

        var latest = bars.FirstOrDefault();
        var prev = bars.Count > 1 ? bars[1] : null;

        double? price = latest?.Close;
        double? prevClose = latest?.PrevClose ?? prev?.Close;
        double? change = price.HasValue && prevClose.HasValue ? price.Value - prevClose.Value : null;
        double? changePct = price.HasValue && prevClose is > 0
            ? (price.Value - prevClose.Value) / prevClose.Value * 100 : null;

        double? relVolume = latest is { AvgVolume: > 0 }
            ? latest.Volume / latest.AvgVolume.Value : null;

        double? PctFromMa(double? ma) =>
            price.HasValue && ma is > 0 ? (price.Value - ma.Value) / ma.Value * 100 : null;

        double? week52High = bars.Count > 0 ? bars.Max(b => b.High) : null;
        double? week52Low = bars.Count > 0 ? bars.Min(b => b.Low) : null;
        double? week52RangePct = price.HasValue && week52High.HasValue && week52Low.HasValue && week52High > week52Low
            ? (price.Value - week52Low.Value) / (week52High.Value - week52Low.Value) * 100 : null;

        double? PerfBarsAgo(int n)
        {
            if (bars.Count <= n || !price.HasValue) return null;
            var old = bars[n].Close;
            return old != 0 ? (price.Value - old) / old * 100 : null;
        }

        // YTD = vs first trading day of current year
        double? perfYtd = null;
        if (latest is not null && price.HasValue)
        {
            var ytdAnchor = bars.LastOrDefault(b => b.Ts.Year == latest.Ts.Year);
            if (ytdAnchor is not null && ytdAnchor.Close != 0 && ytdAnchor != latest)
                perfYtd = (price.Value - ytdAnchor.Close) / ytdAnchor.Close * 100;
        }

        return Ok(new StockSnapshotResponse(
            stock.Ticker, stock.Name, stock.Sector, stock.Industry, stock.Exchange, stock.Country,
            price, prevClose, change, changePct,
            latest?.Open, latest?.High, latest?.Low,
            latest?.Volume, latest?.AvgVolume, relVolume,
            stock.MarketCap, stock.FloatShares,
            fund?.PeRatio, stock.ForwardPe, stock.PegRatio,
            fund?.PsRatio, stock.PriceToBook, fund?.DebtToEquity,
            fund?.GrossMargin, fund?.NetMargin, stock.OperatingMargin,
            stock.ReturnOnEquity, stock.ReturnOnAssets,
            fund?.RevenueGrowth, fund?.EpsGrowth,
            stock.Beta, stock.AnalystTargetPrice, stock.NextEarningsDate,
            latest?.Rsi, latest?.Atr, latest?.AtrPct,
            latest?.Ma20, latest?.Ma50, latest?.Ma200,
            PctFromMa(latest?.Ma20), PctFromMa(latest?.Ma50), PctFromMa(latest?.Ma200),
            week52High, week52Low, week52RangePct,
            PerfBarsAgo(5), PerfBarsAgo(22), PerfBarsAgo(66), perfYtd, PerfBarsAgo(252)
        ));
    }

    [HttpGet("stocks/{ticker}/news")]
    public async Task<ActionResult<List<NewsResponse>>> GetStockNews(string ticker, [FromQuery] int limit = 20)
    {
        var stock = await db.Stocks.FirstOrDefaultAsync(s => s.Ticker.ToUpper() == ticker.ToUpper());
        if (stock is null) return NotFound(new { message = "Stock not found" });

        var news = await db.NewsItems
            .Where(n => n.StockId == stock.Id)
            .OrderByDescending(n => n.PublishedAt)
            .Take(limit)
            .ToListAsync();

        return Ok(news.Select(n => new NewsResponse(n.Headline, n.Summary, n.Source, n.Url, n.SentimentScore, n.CatalystType, n.PublishedAt)).ToList());
    }

    [HttpGet("performance/overview")]
    public async Task<ActionResult<PerformanceOverviewResponse>> PerformanceOverview()
    {
        var closed = db.PerformanceTracking.Where(p => p.Outcome != null);
        var total = await closed.CountAsync();
        var wins = await closed.CountAsync(p => p.ReturnPct > 0);
        var avgReturn = total > 0 ? await closed.AverageAsync(p => p.ReturnPct ?? 0) : 0;
        var avgDrawdown = total > 0 ? await closed.AverageAsync(p => p.MaxDrawdownPct ?? 0) : 0;

        return Ok(new PerformanceOverviewResponse(
            total,
            total > 0 ? Math.Round((double)wins / total * 100, 1) : 0,
            Math.Round(avgReturn, 2),
            Math.Round(avgDrawdown, 2)
        ));
    }

    [HttpGet("blog/{slug}")]
    public async Task<IActionResult> GetBlogPost(string slug)
    {
        var article = await db.SeoArticles.FirstOrDefaultAsync(a => a.Slug == slug && a.Status == "published");
        if (article is null) return NotFound(new { message = "Article not found" });

        return Ok(new { article.Slug, article.Title, article.BodyMd, article.PublishedAt });
    }

    /// <summary>Batch-load latest close price for a list of signals' stocks.</summary>
    private async Task<Dictionary<long, double>> GetLatestPricesAsync(IEnumerable<Signal> signals)
    {
        var stockIds = signals.Select(s => s.StockId).Distinct().ToList();
        if (stockIds.Count == 0) return new();

        var cutoff = DateTime.UtcNow.AddDays(-7);
        var recentBars = await db.MarketData
            .Where(m => stockIds.Contains(m.StockId) && m.Ts >= cutoff)
            .Select(m => new { m.StockId, m.Ts, m.Close })
            .ToListAsync();

        return recentBars
            .GroupBy(m => m.StockId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(m => m.Ts).First().Close);
    }

    private async Task<SignalListResponse> ToSignalList(List<Signal> signals)
    {
        var prices = await GetLatestPricesAsync(signals);
        return new SignalListResponse(
            signals.Select(s => ToDto(s, prices.GetValueOrDefault(s.StockId))).ToList(),
            signals.Count);
    }

    private static SignalResponse ToDto(Signal s, double? currentPrice = null) => new(
        s.Id, s.Stock.Ticker, s.Stock.Name, s.SignalType.ToString(), s.ScoreTotal,
        currentPrice,
        s.EntryLow, s.EntryHigh, s.StopLoss, s.TargetLow, s.TargetHigh,
        s.RiskLevel, s.HorizonDays,
        s.Breakdown is not null ? new SignalBreakdownDto(
            s.Breakdown.MomentumScore, s.Breakdown.RelVolumeScore, s.Breakdown.NewsScore,
            s.Breakdown.FundamentalsScore, s.Breakdown.SentimentScore, s.Breakdown.TrendScore,
            s.Breakdown.RiskScore, s.Breakdown.ExplanationJson, s.Breakdown.WhyNowSummary
        ) : null,
        s.CreatedAt
    );
}
