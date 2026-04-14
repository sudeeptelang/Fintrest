using Fintrest.Api.Data;
using Fintrest.Api.DTOs.Signals;
using Fintrest.Api.DTOs.Stocks;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Providers.Contracts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Controllers;

[ApiController]
[Route("api/v1")]
public class MarketController(AppDbContext db, INewsProvider newsProvider, IFundamentalsProvider fundamentalsProvider) : ControllerBase
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

    /// <summary>Top movers by day change % — the "Trending" widget.</summary>
    [HttpGet("market/trending")]
    public async Task<ActionResult<List<TrendingStockResponse>>> Trending([FromQuery] int limit = 10)
    {
        var stockBars = await GetLatestTwoBarsPerStock();
        var signalScores = await GetLatestSignalScores();

        var trending = stockBars
            .Where(x => x.ChangePct.HasValue)
            .OrderByDescending(x => Math.Abs(x.ChangePct!.Value))
            .Take(limit)
            .Select(x => new TrendingStockResponse(
                x.Stock.Ticker, x.Stock.Name, x.Stock.Sector,
                Math.Round(x.Latest.Close, 2),
                Math.Round(x.ChangePct!.Value, 2),
                x.Latest.Volume,
                x.RelVolume.HasValue ? Math.Round(x.RelVolume.Value, 2) : null,
                signalScores.GetValueOrDefault(x.Stock.Id, 0)
            ))
            .ToList();

        return Ok(trending);
    }

    /// <summary>Highest volume stocks today — the "Most Active" widget.</summary>
    [HttpGet("market/most-active")]
    public async Task<ActionResult<List<TrendingStockResponse>>> MostActive([FromQuery] int limit = 10)
    {
        var stockBars = await GetLatestTwoBarsPerStock();
        var signalScores = await GetLatestSignalScores();

        var active = stockBars
            .OrderByDescending(x => x.Latest.Volume)
            .Take(limit)
            .Select(x => new TrendingStockResponse(
                x.Stock.Ticker, x.Stock.Name, x.Stock.Sector,
                Math.Round(x.Latest.Close, 2),
                x.ChangePct.HasValue ? Math.Round(x.ChangePct.Value, 2) : 0,
                x.Latest.Volume,
                x.RelVolume.HasValue ? Math.Round(x.RelVolume.Value, 2) : null,
                signalScores.GetValueOrDefault(x.Stock.Id, 0)
            ))
            .ToList();

        return Ok(active);
    }

    /// <summary>Load latest 2 bars per active stock to compute day change %.</summary>
    private async Task<List<StockBarPair>> GetLatestTwoBarsPerStock()
    {
        var cutoff = DateTime.UtcNow.AddDays(-14);
        var bars = await db.MarketData
            .Include(m => m.Stock)
            .Where(m => m.Ts >= cutoff && m.Stock.Active)
            .OrderByDescending(m => m.Ts)
            .ToListAsync();

        return bars
            .GroupBy(m => m.StockId)
            .Select(g =>
            {
                var sorted = g.OrderByDescending(m => m.Ts).Take(2).ToList();
                var latest = sorted[0];
                var prev = sorted.Count > 1 ? sorted[1] : null;
                double? changePct = prev is not null && prev.Close > 0
                    ? (latest.Close - prev.Close) / prev.Close * 100
                    : null;

                // Compute rel volume from last 30 bars
                var last30 = g.OrderByDescending(m => m.Ts).Take(30).ToList();
                double? avgVol = last30.Count >= 5 ? last30.Skip(1).Average(m => (double)m.Volume) : null;
                double? relVol = avgVol is > 0 ? latest.Volume / avgVol.Value : null;

                return new StockBarPair(latest.Stock, latest, prev, changePct, relVol);
            })
            .ToList();
    }

    private record StockBarPair(Stock Stock, MarketData Latest, MarketData? Prev, double? ChangePct, double? RelVolume);

    private async Task<Dictionary<long, double>> GetLatestSignalScores()
    {
        var latestScan = await db.ScanRuns.Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt).FirstOrDefaultAsync();
        return latestScan is not null
            ? await db.Signals.Where(s => s.ScanRunId == latestScan.Id)
                .ToDictionaryAsync(s => s.StockId, s => s.ScoreTotal)
            : new Dictionary<long, double>();
    }

    /// <summary>Upcoming earnings in the next N days — "Earnings Calendar" widget.</summary>
    [HttpGet("market/earnings-calendar")]
    public async Task<ActionResult<List<EarningsCalendarItem>>> EarningsCalendar([FromQuery] int days = 14)
    {
        var from = DateTime.UtcNow.Date;
        var to = from.AddDays(days);

        var stocks = await db.Stocks
            .Where(s => s.Active && s.NextEarningsDate >= from && s.NextEarningsDate <= to)
            .OrderBy(s => s.NextEarningsDate)
            .Take(30)
            .ToListAsync();

        var stockIds = stocks.Select(s => s.Id).ToList();

        // Latest prices
        var cutoff = DateTime.UtcNow.AddDays(-7);
        var prices = await db.MarketData
            .Where(m => stockIds.Contains(m.StockId) && m.Ts >= cutoff)
            .GroupBy(m => m.StockId)
            .Select(g => new { StockId = g.Key, Close = g.OrderByDescending(m => m.Ts).First().Close })
            .ToDictionaryAsync(x => x.StockId, x => x.Close);

        // Signal scores
        var latestScan = await db.ScanRuns.Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt).FirstOrDefaultAsync();
        var signalScores = latestScan is not null
            ? await db.Signals.Where(s => s.ScanRunId == latestScan.Id && stockIds.Contains(s.StockId))
                .ToDictionaryAsync(s => s.StockId, s => s.ScoreTotal)
            : new Dictionary<long, double>();

        return Ok(stocks.Select(s => new EarningsCalendarItem(
            s.Ticker, s.Name, s.NextEarningsDate!.Value,
            prices.GetValueOrDefault(s.Id),
            signalScores.GetValueOrDefault(s.Id)
        )).ToList());
    }

    /// <summary>Latest market-moving news across all stocks — "Trending News" widget.</summary>
    [HttpGet("market/news")]
    public async Task<ActionResult<List<NewsResponse>>> TrendingNews([FromQuery] int limit = 10)
    {
        var cutoff = DateTime.UtcNow.AddDays(-3);
        var news = await db.NewsItems
            .Include(n => n.Stock)
            .Where(n => n.PublishedAt >= cutoff)
            .OrderByDescending(n => n.PublishedAt)
            .Take(limit)
            .Select(n => new NewsResponse(
                n.Headline, n.Summary, n.Source, n.Url,
                n.SentimentScore, n.CatalystType, n.PublishedAt
            ))
            .ToListAsync();

        return Ok(news);
    }

    /// <summary>Dashboard screener table — batch of stocks with full snapshot + signal data.</summary>
    [HttpGet("market/screener")]
    public async Task<ActionResult<List<ScreenerRowResponse>>> Screener([FromQuery] int limit = 50)
    {
        // Get latest scan's signals (for score + signal type)
        var latestScan = await db.ScanRuns.Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt).FirstOrDefaultAsync();

        var signalsByStock = latestScan is not null
            ? await db.Signals
                .Where(s => s.ScanRunId == latestScan.Id)
                .OrderByDescending(s => s.ScoreTotal)
                .Take(limit)
                .ToDictionaryAsync(s => s.StockId, s => new { s.ScoreTotal, s.SignalType })
            : new();

        if (signalsByStock.Count == 0) return Ok(new List<ScreenerRowResponse>());

        var stockIds = signalsByStock.Keys.ToList();

        // Load stocks (has TTM metrics: Beta, Forward P/E, PEG, ROE, ROA, analyst target, next earnings)
        var stocks = await db.Stocks
            .Where(s => stockIds.Contains(s.Id))
            .ToListAsync();

        // Load latest fundamental per stock (has EPS growth, revenue growth, gross/net margin)
        var funds = await db.Fundamentals
            .Where(f => stockIds.Contains(f.StockId))
            .GroupBy(f => f.StockId)
            .Select(g => g.OrderByDescending(x => x.ReportDate).First())
            .ToListAsync();
        var fundByStock = funds.ToDictionary(f => f.StockId);

        // Load bars for each stock (last year for performance calcs)
        var cutoff = DateTime.UtcNow.AddDays(-400);
        var allBars = await db.MarketData
            .Where(m => stockIds.Contains(m.StockId) && m.Ts >= cutoff)
            .Select(m => new { m.StockId, m.Ts, m.Close, m.High, m.Low, m.Volume })
            .ToListAsync();
        var barsByStock = allBars
            .GroupBy(m => m.StockId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(m => m.Ts).ToList());

        var rows = new List<ScreenerRowResponse>();

        foreach (var stock in stocks)
        {
            if (!barsByStock.TryGetValue(stock.Id, out var bars) || bars.Count == 0) continue;

            var latest = bars[0];
            var prev = bars.Count > 1 ? bars[1] : null;

            double? price = latest.Close;
            double? changePct = prev is not null && prev.Close > 0
                ? Math.Round((latest.Close - prev.Close) / prev.Close * 100, 2)
                : null;

            double? avgVol30 = bars.Count >= 30
                ? bars.Take(30).Average(b => (double)b.Volume)
                : null;
            double? relVol = avgVol30 is > 0 ? Math.Round(latest.Volume / avgVol30.Value, 2) : null;

            double? PerfN(int n) => bars.Count > n && bars[n].Close > 0
                ? Math.Round((latest.Close - bars[n].Close) / bars[n].Close * 100, 2) : null;

            var w52High = bars.Max(b => b.High);
            var w52Low = bars.Min(b => b.Low);
            double? w52RangePct = w52High > w52Low
                ? Math.Round((latest.Close - w52Low) / (w52High - w52Low) * 100, 1) : null;

            double? perfYtd = null;
            var ytdAnchor = bars.LastOrDefault(b => b.Ts.Year == latest.Ts.Year);
            if (ytdAnchor is not null && ytdAnchor.Close > 0 && ytdAnchor != latest)
                perfYtd = Math.Round((latest.Close - ytdAnchor.Close) / ytdAnchor.Close * 100, 2);

            fundByStock.TryGetValue(stock.Id, out var fund);
            signalsByStock.TryGetValue(stock.Id, out var signal);

            rows.Add(new ScreenerRowResponse(
                Ticker: stock.Ticker,
                Name: stock.Name,
                Sector: stock.Sector,
                Price: price,
                ChangePct: changePct,
                Volume: latest.Volume,
                RelVolume: relVol,
                MarketCap: stock.MarketCap,
                PeRatio: fund?.PeRatio,
                ForwardPe: stock.ForwardPe,
                PegRatio: stock.PegRatio,
                PriceToBook: stock.PriceToBook,
                Beta: stock.Beta,
                ReturnOnEquity: stock.ReturnOnEquity,
                OperatingMargin: stock.OperatingMargin,
                RevenueGrowth: fund?.RevenueGrowth,
                EpsGrowth: fund?.EpsGrowth,
                DividendYield: null, // TODO: add dividend field
                PerfWeek: PerfN(5),
                PerfMonth: PerfN(22),
                PerfQuarter: PerfN(66),
                PerfYtd: perfYtd,
                PerfYear: PerfN(252),
                Week52High: Math.Round(w52High, 2),
                Week52Low: Math.Round(w52Low, 2),
                Week52RangePct: w52RangePct,
                Rsi: null, // RSI not stored per bar, computed at scan time
                AnalystTargetPrice: stock.AnalystTargetPrice,
                NextEarningsDate: stock.NextEarningsDate,
                SignalScore: signal?.ScoreTotal,
                SignalType: signal?.SignalType.ToString()
            ));
        }

        // Return in signal-score order (top picks first)
        return Ok(rows.OrderByDescending(r => r.SignalScore ?? 0).ToList());
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
        // ETF proxies for global markets. Order = display order.
        // US indices → International → Commodities → Bonds → Crypto
        var tickers = new[]
        {
            // US equity indices
            "SPY", "QQQ", "DIA", "IWM",
            // International equities
            "EFA", "VWO", "FXI", "EWJ", "EWG", "EWU",
            // Commodities
            "GLD", "SLV", "USO", "UNG",
            // Bonds
            "TLT", "IEF", "SHY", "HYG",
            // Crypto
            "IBIT", "ETHA",
        };
        var labels = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            // US
            ["SPY"] = "S&P 500",
            ["QQQ"] = "Nasdaq 100",
            ["DIA"] = "Dow Jones",
            ["IWM"] = "Russell 2000",
            // International
            ["EFA"] = "EAFE (Developed)",
            ["VWO"] = "Emerging Mkts",
            ["FXI"] = "China 50",
            ["EWJ"] = "Japan (Nikkei)",
            ["EWG"] = "Germany (DAX)",
            ["EWU"] = "UK (FTSE)",
            // Commodities
            ["GLD"] = "Gold",
            ["SLV"] = "Silver",
            ["USO"] = "Crude Oil",
            ["UNG"] = "Natural Gas",
            // Bonds
            ["TLT"] = "20Y Treasury",
            ["IEF"] = "10Y Treasury",
            ["SHY"] = "1-3Y Treasury",
            ["HYG"] = "High-Yield Bonds",
            // Crypto
            ["IBIT"] = "Bitcoin ETF",
            ["ETHA"] = "Ethereum ETF",
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

        var categories = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["SPY"] = "US", ["QQQ"] = "US", ["DIA"] = "US", ["IWM"] = "US",
            ["EFA"] = "International", ["VWO"] = "International", ["FXI"] = "International",
            ["EWJ"] = "International", ["EWG"] = "International", ["EWU"] = "International",
            ["GLD"] = "Commodities", ["SLV"] = "Commodities",
            ["USO"] = "Commodities", ["UNG"] = "Commodities",
            ["TLT"] = "Bonds", ["IEF"] = "Bonds", ["SHY"] = "Bonds", ["HYG"] = "Bonds",
            ["IBIT"] = "Crypto", ["ETHA"] = "Crypto",
        };

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
                    Category: categories.GetValueOrDefault(s.Ticker, "Other"),
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

    [HttpGet("stocks/{ticker}/analyst")]
    public async Task<ActionResult<AnalystConsensusResponse>> GetAnalystConsensus(string ticker)
    {
        // Analyst ratings from Finnhub
        var ratings = await newsProvider.GetAnalystRatingsAsync(ticker);

        // Price target from FMP (already on Stock model if ingested, but also fetch fresh)
        var stock = await db.Stocks.FirstOrDefaultAsync(s => s.Ticker.ToUpper() == ticker.ToUpper());

        if (ratings is null && stock?.AnalystTargetPrice is null)
            return Ok(new AnalystConsensusResponse(ticker, 0, 0, 0, 0, 0, 0, 0, null, null, null, null));

        return Ok(new AnalystConsensusResponse(
            Ticker: ticker.ToUpperInvariant(),
            StrongBuy: ratings?.StrongBuy ?? 0,
            Buy: ratings?.Buy ?? 0,
            Hold: ratings?.Hold ?? 0,
            Sell: ratings?.Sell ?? 0,
            StrongSell: ratings?.StrongSell ?? 0,
            TotalAnalysts: ratings?.TotalAnalysts ?? 0,
            Rating: ratings?.Rating ?? 0,
            TargetHigh: null, // Would need FMP /price-target endpoint for per-analyst targets
            TargetLow: null,
            TargetConsensus: stock?.AnalystTargetPrice,
            TargetMedian: null
        ));
    }

    [HttpGet("stocks/{ticker}/earnings")]
    public async Task<ActionResult<List<EarningsHistoryItem>>> GetEarningsHistory(string ticker)
    {
        var earnings = await fundamentalsProvider.GetQuarterlyEarningsAsync(ticker, 8);
        return Ok(earnings.Select(e => new EarningsHistoryItem(
            e.Period, e.ReportedAt, e.Revenue, e.RevenueGrowth,
            e.Eps, e.EpsSurprise, e.GrossMargin, e.OperatingMargin
        )).ToList());
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

    /// <summary>Batch-load latest 2 bars per signal stock for price + change %.</summary>
    private async Task<Dictionary<long, (double Close, double? ChangePct)>> GetLatestPricesAsync(IEnumerable<Signal> signals)
    {
        var stockIds = signals.Select(s => s.StockId).Distinct().ToList();
        if (stockIds.Count == 0) return new();

        var cutoff = DateTime.UtcNow.AddDays(-14);
        var recentBars = await db.MarketData
            .Where(m => stockIds.Contains(m.StockId) && m.Ts >= cutoff)
            .Select(m => new { m.StockId, m.Ts, m.Close })
            .ToListAsync();

        return recentBars
            .GroupBy(m => m.StockId)
            .ToDictionary(
                g => g.Key,
                g =>
                {
                    var sorted = g.OrderByDescending(m => m.Ts).Take(2).ToList();
                    var latest = sorted[0].Close;
                    double? changePct = sorted.Count > 1 && sorted[1].Close > 0
                        ? Math.Round((latest - sorted[1].Close) / sorted[1].Close * 100, 2)
                        : null;
                    return (latest, changePct);
                });
    }

    private async Task<SignalListResponse> ToSignalList(List<Signal> signals)
    {
        var prices = await GetLatestPricesAsync(signals);
        return new SignalListResponse(
            signals.Select(s =>
            {
                var (close, changePct) = prices.GetValueOrDefault(s.StockId);
                return ToDto(s, close > 0 ? close : null, changePct);
            }).ToList(),
            signals.Count);
    }

    private static SignalResponse ToDto(Signal s, double? currentPrice = null, double? changePct = null) => new(
        s.Id, s.Stock.Ticker, s.Stock.Name, s.SignalType.ToString(), s.ScoreTotal,
        currentPrice, changePct,
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
