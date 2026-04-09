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

        return Ok(new SignalListResponse(signals.Select(ToDto).ToList(), signals.Count));
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

        return Ok(new SignalListResponse(signals.Select(ToDto).ToList(), signals.Count));
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

        return Ok(new SignalListResponse(signals.Select(ToDto).ToList(), signals.Count));
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

    private static SignalResponse ToDto(Signal s) => new(
        s.Id, s.Stock.Ticker, s.Stock.Name, s.SignalType.ToString(), s.ScoreTotal,
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
