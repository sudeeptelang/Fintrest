using Fintrest.Api.Data;
using Fintrest.Api.DTOs.Signals;
using Fintrest.Api.DTOs.Stocks;
using Fintrest.Api.Core;
using Fintrest.Api.Models;
using Microsoft.AspNetCore.Authorization;
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

    /// <summary>Upcoming earnings in the next N days — "Earnings Calendar" widget.
    /// Primary source: FMP global earning-calendar (no per-stock ingestion needed).
    /// Fallback: stocks in our universe that have <c>NextEarningsDate</c> populated.</summary>
    [HttpGet("market/earnings-calendar")]
    public async Task<ActionResult<List<EarningsCalendarItem>>> EarningsCalendar(
        [FromServices] ILogger<MarketController> logger,
        [FromQuery] int days = 14)
    {
        var from = DateTime.UtcNow.Date;
        var to = from.AddDays(days);

        // 1. Try FMP first for fresh calendar data (requires Premier plan).
        var live = await fundamentalsProvider.GetEarningCalendarAsync(from, to);

        // Tickers we actually track — only surface earnings for stocks in our universe
        // so clicking a row lands on a valid /stock/{ticker} page.
        var universeTickers = await db.Stocks
            .Where(s => s.Active)
            .Select(s => new { s.Id, s.Ticker, s.Name })
            .ToListAsync();
        var tickerToMeta = universeTickers.ToDictionary(
            s => s.Ticker, s => (s.Id, s.Name), StringComparer.OrdinalIgnoreCase);

        List<(long StockId, string Ticker, string Name, DateTime Date)> matched;
        if (live.Count > 0)
        {
            matched = live
                .Where(e => tickerToMeta.ContainsKey(e.Ticker))
                .Select(e => (tickerToMeta[e.Ticker].Id, e.Ticker, tickerToMeta[e.Ticker].Name, e.Date))
                .DistinctBy(x => x.Ticker)
                .OrderBy(x => x.Date)
                .Take(30)
                .ToList();

            // Self-heal: persist the earnings dates back to the stocks
            // table so the fallback path below has data next time the
            // FMP feed hiccups. Also populates the column for all
            // clients that read stock.NextEarningsDate directly (ticker
            // detail page, Risk factor, etc.) — the column was zero-
            // populated before this endpoint ran.
            var idToDate = matched.ToDictionary(m => m.StockId, m => m.Date);
            var stocksToUpdate = await db.Stocks
                .Where(s => idToDate.Keys.Contains(s.Id))
                .ToListAsync();
            foreach (var s in stocksToUpdate)
            {
                if (idToDate.TryGetValue(s.Id, out var d)) s.NextEarningsDate = d;
            }
            if (stocksToUpdate.Count > 0) await db.SaveChangesAsync();
        }
        else
        {
            // 2. Fallback — our stored NextEarningsDate from per-ticker ingestion.
            logger.LogWarning("Earnings calendar: FMP global feed empty, falling back to Stock.NextEarningsDate.");
            var fallback = await db.Stocks
                .Where(s => s.Active && s.NextEarningsDate >= from && s.NextEarningsDate <= to)
                .OrderBy(s => s.NextEarningsDate)
                .Take(30)
                .Select(s => new { s.Id, s.Ticker, s.Name, s.NextEarningsDate })
                .ToListAsync();
            matched = fallback
                .Select(s => (s.Id, s.Ticker, s.Name, s.NextEarningsDate!.Value))
                .ToList();
        }

        if (matched.Count == 0) return Ok(new List<EarningsCalendarItem>());

        var stockIds = matched.Select(m => m.StockId).ToList();

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

        return Ok(matched.Select(m => new EarningsCalendarItem(
            m.Ticker, m.Name, m.Date,
            prices.GetValueOrDefault(m.StockId),
            signalScores.GetValueOrDefault(m.StockId)
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
                n.Id, n.Headline, n.Summary, n.Source, n.Url,
                n.SentimentScore, n.CatalystType, n.PublishedAt, n.Stock.Ticker
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
                .ToDictionaryAsync(s => s.StockId, s => new
                {
                    s.ScoreTotal,
                    s.SignalType,
                    s.EntryLow, s.EntryHigh,
                    s.StopLoss, s.TargetLow, s.TargetHigh,
                    s.HorizonDays,
                })
            : new();

        // If no scan has completed yet, fall back to top-N active stocks by market cap so
        // screeners (gainers/losers/penny/etc.) still have data to filter. Signal fields
        // will be null for these rows.
        List<long> stockIds;
        if (signalsByStock.Count == 0)
        {
            stockIds = await db.Stocks
                .Where(s => s.Active)
                .OrderByDescending(s => s.MarketCap ?? 0)
                .Take(limit)
                .Select(s => s.Id)
                .ToListAsync();
            if (stockIds.Count == 0) return Ok(new List<ScreenerRowResponse>());
        }
        else
        {
            stockIds = signalsByStock.Keys.ToList();
        }

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

            // Risk:Reward from stored trade zone — TargetLow-EntryHigh vs EntryHigh-StopLoss.
            double? riskReward = null;
            if (signal?.EntryHigh is > 0 && signal.StopLoss is > 0 && signal.TargetLow is > 0)
            {
                var reward = (signal.TargetLow ?? 0) - (signal.EntryHigh ?? 0);
                var risk = (signal.EntryHigh ?? 0) - (signal.StopLoss ?? 0);
                if (risk > 0) riskReward = Math.Round(reward / risk, 2);
            }

            var row = new ScreenerRowResponse(
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
                SignalType: signal?.SignalType.ToString(),
                EntryLow: signal?.EntryLow,
                EntryHigh: signal?.EntryHigh,
                StopLoss: signal?.StopLoss,
                TargetLow: signal?.TargetLow,
                TargetHigh: signal?.TargetHigh,
                RiskReward: riskReward,
                HorizonDays: signal?.HorizonDays,
                Verdict: ClassifyVerdictLight(stock, fund, bars, signal?.SignalType.ToString(), changePct, PerfN(5), relVol, w52RangePct)
            );
            rows.Add(row);
        }

        // Return in signal-score order (top picks first)
        return Ok(rows.OrderByDescending(r => r.SignalScore ?? 0).ToList());
    }

    /// <summary>
    /// Lightweight verdict classifier operating only on data already loaded by the screener query.
    /// Not as precise as the full <c>AthenaThesisService.ClassifyVerdict</c> (which sees factor
    /// percentiles + regime) but good enough to power the dashboard's lens chips.
    /// </summary>
    private static string ClassifyVerdictLight(
        Fintrest.Api.Models.Stock stock,
        Fintrest.Api.Models.Fundamental? fund,
        IEnumerable<dynamic> bars,
        string? signalType,
        double? changePct,
        double? perfWeek,
        double? relVol,
        double? week52RangePct)
    {
        // Earnings within 14 days beats everything.
        if (stock.NextEarningsDate.HasValue)
        {
            var days = (stock.NextEarningsDate.Value - DateTime.UtcNow).TotalDays;
            if (days is >= 0 and <= 14) return "Event-Driven";
        }

        var peg = stock.PegRatio;

        // Buy the Dip: today red, week still up or flat, reasonable valuation
        if (changePct is <= -0.5 && (perfWeek ?? 0) > -1 && (peg is null || peg is > 0 and < 2))
            return "Buy the Dip";

        // Breakout Setup: elevated volume + near 52W high
        if ((relVol ?? 1) > 1.5 && (week52RangePct ?? 0) > 85)
            return "Breakout Setup";

        // Momentum Run: strong recent momentum
        if ((perfWeek ?? 0) > 3)
            return "Momentum Run";

        // Value Setup: cheap by PEG and not chasing
        if (peg is > 0 and < 1.2 && (perfWeek ?? 0) < 2)
            return "Value Setup";

        // Defensive: low beta name
        if ((stock.Beta ?? 1.0) < 0.8) return "Defensive Hold";

        return signalType == "BUY_TODAY" ? "Quality Setup" : "Watchlist";
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
        // ETF-proxy labels. Prices are the ETF price, NOT the underlying
        // index level (SPY ~$700 vs S&P 500 index ~5800+). Ticker is in
        // the label so users don't mistake 706.93 for a broken "S&P 500".
        var labels = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            // US
            ["SPY"] = "SPY · S&P 500",
            ["QQQ"] = "QQQ · Nasdaq 100",
            ["DIA"] = "DIA · Dow Jones",
            ["IWM"] = "IWM · Russell 2000",
            // International
            ["EFA"] = "EFA · EAFE",
            ["VWO"] = "VWO · Emerging Mkts",
            ["FXI"] = "FXI · China 50",
            ["EWJ"] = "EWJ · Japan",
            ["EWG"] = "EWG · Germany",
            ["EWU"] = "EWU · UK",
            // Commodities
            ["GLD"] = "GLD · Gold",
            ["SLV"] = "SLV · Silver",
            ["USO"] = "USO · Crude Oil",
            ["UNG"] = "UNG · Nat Gas",
            // Bonds
            ["TLT"] = "TLT · 20Y Treasury",
            ["IEF"] = "IEF · 10Y Treasury",
            ["SHY"] = "SHY · 1-3Y Treasury",
            ["HYG"] = "HYG · High-Yield",
            // Crypto
            ["IBIT"] = "IBIT · Bitcoin",
            ["ETHA"] = "ETHA · Ethereum",
        };

        var stocks = await db.Stocks
            .Where(s => tickers.Contains(s.Ticker))
            .ToListAsync();

        if (stocks.Count == 0) return Ok(new List<MarketIndexResponse>());

        var stockIds = stocks.Select(s => s.Id).ToList();
        // 90-day lookback so we can always find 2 bars for day-over-day change, even
        // when ingestion has gaps or a ticker just joined the universe. For ~20 index
        // ETFs the row count stays well under a thousand.
        var cutoff = DateTime.UtcNow.AddDays(-90);
        var recentBars = await db.MarketData
            .Where(m => stockIds.Contains(m.StockId) && m.Ts >= cutoff)
            .Select(m => new { m.StockId, m.Ts, m.Close, m.PrevClose })
            .ToListAsync();

        // Get last 2 bars per stock so we can compute changePct even when PrevClose is null.
        var barsByStock = recentBars
            .GroupBy(m => m.StockId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(m => m.Ts).Take(2).ToList());
        var latest = barsByStock.ToDictionary(
            kv => kv.Key,
            kv => kv.Value.First());

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
                barsByStock.TryGetValue(s.Id, out var bars);
                double? changePct = null;
                double? prevClose = bar?.PrevClose;
                // Prefer PrevClose from the bar; fall back to the prior day's close.
                if (prevClose is null or 0 && bars?.Count >= 2)
                    prevClose = bars[1].Close;
                if (prevClose is > 0 && bar is not null)
                    changePct = Math.Round((bar.Close - prevClose.Value) / prevClose.Value * 100, 2);
                return new MarketIndexResponse(
                    Ticker: s.Ticker,
                    Label: labels.GetValueOrDefault(s.Ticker, s.Name),
                    Category: categories.GetValueOrDefault(s.Ticker, "Other"),
                    Price: bar?.Close,
                    PrevClose: prevClose,
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
    public async Task<ActionResult<AnalystConsensusResponse>> GetAnalystConsensus(string ticker, CancellationToken ct = default)
    {
        // Try Finnhub first (historic primary). If it returns nothing — as the
        // free tier does for most tickers — fall back to FMP's grades-consensus
        // endpoint which covers the Premier universe. Price targets always
        // enrich via FMP's price-target-summary.
        var finnhubTask = newsProvider.GetAnalystRatingsAsync(ticker);
        var fmpConsensusTask = fundamentalsProvider.GetAnalystConsensusAsync(ticker, ct);
        var fmpPriceTargetTask = fundamentalsProvider.GetPriceTargetSummaryAsync(ticker, ct);
        await Task.WhenAll(finnhubTask, fmpConsensusTask, fmpPriceTargetTask);

        var finnhub = await finnhubTask;
        var fmpConsensus = await fmpConsensusTask;
        var priceTargets = await fmpPriceTargetTask;

        var stock = await db.Stocks
            .FirstOrDefaultAsync(s => s.Ticker.ToUpper() == ticker.ToUpper(), ct);

        int strongBuy  = finnhub?.StrongBuy  ?? fmpConsensus?.StrongBuy  ?? 0;
        int buy        = finnhub?.Buy        ?? fmpConsensus?.Buy        ?? 0;
        int hold       = finnhub?.Hold       ?? fmpConsensus?.Hold       ?? 0;
        int sell       = finnhub?.Sell       ?? fmpConsensus?.Sell       ?? 0;
        int strongSell = finnhub?.StrongSell ?? fmpConsensus?.StrongSell ?? 0;
        int total      = finnhub?.TotalAnalysts ?? fmpConsensus?.TotalAnalysts ?? 0;
        double rating  = finnhub?.Rating ?? fmpConsensus?.Rating ?? 0;

        double? targetConsensus = priceTargets?.TargetConsensus ?? stock?.AnalystTargetPrice;
        double? targetHigh   = priceTargets?.TargetHigh;
        double? targetLow    = priceTargets?.TargetLow;
        double? targetMedian = priceTargets?.TargetMedian;

        return Ok(new AnalystConsensusResponse(
            Ticker:          ticker.ToUpperInvariant(),
            StrongBuy:       strongBuy,
            Buy:             buy,
            Hold:            hold,
            Sell:            sell,
            StrongSell:      strongSell,
            TotalAnalysts:   total,
            Rating:          rating,
            TargetHigh:      targetHigh,
            TargetLow:       targetLow,
            TargetConsensus: targetConsensus,
            TargetMedian:    targetMedian
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

        return Ok(news.Select(n => new NewsResponse(n.Id, n.Headline, n.Summary, n.Source, n.Url, n.SentimentScore, n.CatalystType, n.PublishedAt, stock.Ticker)).ToList());
    }

    [Authorize]
    [RequiresPlan(PlanType.Pro)]
    [HttpGet("market/insiders/latest")]
    public async Task<ActionResult<List<InsiderActivityItem>>> GetLatestInsiderTrades(
        [FromServices] ILogger<MarketController> logger,
        [FromQuery] int limit = 50)
    {
        // Read from the write-through cache (migration 020). FirehoseIngestJob
        // refreshes rows nightly at 6:15 AM ET. If the cache is empty — e.g.
        // first boot before the job has run — fall back to a live FMP call so
        // the user doesn't see a blank page.
        var clamped = Math.Clamp(limit, 1, 200);
        var rows = await db.MarketFirehoseSnapshots
            .AsNoTracking()
            .Where(s => s.Kind == "insider")
            .OrderByDescending(s => s.FilingDate ?? s.TransactionDate)
            .ThenByDescending(s => s.Id)
            .Take(clamped)
            .ToListAsync();

        if (rows.Count > 0)
        {
            return Ok(rows.Select(r => new InsiderActivityItem(
                r.Ticker ?? "",
                r.TransactionDate?.ToDateTime(TimeOnly.MinValue),
                r.FilingDate?.ToDateTime(TimeOnly.MinValue),
                r.ActorName,
                r.ActorRole,
                r.TransactionType,
                r.Shares,
                r.Price,
                r.TotalValue
            )).ToList());
        }

        logger.LogWarning("Insider cache empty — falling back to live FMP call. Check FirehoseIngestJob.");
        var live = await fundamentalsProvider.GetLatestInsiderTradesAsync(clamped);
        return Ok(live.Select(t => new InsiderActivityItem(
            t.Ticker, t.TransactionDate, t.FilingDate, t.ReportingName, t.Relationship,
            t.TransactionType, t.SharesTraded, t.Price, t.TotalValue
        )).ToList());
    }

    [Authorize]
    [RequiresPlan(PlanType.Pro)]
    [HttpGet("market/congress/latest")]
    public async Task<ActionResult<List<CongressTradeItem>>> GetCongressTrades(
        [FromServices] ILogger<MarketController> logger,
        [FromQuery] int limit = 50)
    {
        var clamped = Math.Clamp(limit, 1, 200);
        var rows = await db.MarketFirehoseSnapshots
            .AsNoTracking()
            .Where(s => s.Kind == "senate" || s.Kind == "house")
            .OrderByDescending(s => s.DisclosureDate ?? s.TransactionDate)
            .ThenByDescending(s => s.Id)
            .Take(clamped)
            .ToListAsync();

        if (rows.Count > 0)
        {
            return Ok(rows.Select(r => new CongressTradeItem(
                r.Chamber ?? r.Kind,
                r.Ticker ?? "",
                r.AssetDescription,
                r.ActorName,
                r.TransactionType,
                r.TransactionDate?.ToDateTime(TimeOnly.MinValue),
                r.DisclosureDate?.ToDateTime(TimeOnly.MinValue),
                r.AmountRange,
                r.SourceUrl
            )).ToList());
        }

        logger.LogWarning("Congress cache empty — falling back to live FMP call. Check FirehoseIngestJob.");
        var live = await fundamentalsProvider.GetCongressTradesAsync(clamped);
        return Ok(live.Select(t => new CongressTradeItem(
            t.Chamber, t.Ticker, t.AssetDescription, t.Representative, t.TransactionType,
            t.TransactionDate, t.DisclosureDate, t.Amount, t.SourceUrl
        )).ToList());
    }

    /// <summary>Manual trigger for the firehose cache — admin-only.</summary>
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("admin/firehose/refresh")]
    public async Task<IActionResult> TriggerFirehoseRefresh(
        [FromServices] Fintrest.Api.Services.Ingestion.FirehoseIngestJob job,
        CancellationToken ct)
    {
        var summary = await job.RunOnceAsync(ct);
        return Ok(summary);
    }

    [HttpGet("stocks/{ticker}/ownership")]
    public async Task<ActionResult<OwnershipResponse>> GetOwnership(string ticker)
    {
        var snapshot = await fundamentalsProvider.GetOwnershipAsync(ticker);
        if (snapshot is null)
            return Ok(new OwnershipResponse(ticker.ToUpperInvariant(), null, null, null, null, null, []));

        return Ok(new OwnershipResponse(
            snapshot.Ticker,
            snapshot.InstitutionalPercent,
            snapshot.InvestorsHolding,
            snapshot.InvestorsHoldingChange,
            snapshot.TotalInvested,
            snapshot.OwnershipPercentChange,
            snapshot.RecentInsiderTrades.Select(t => new InsiderTradeDto(
                t.TransactionDate, t.ReportingName, t.Relationship, t.TransactionType,
                t.SharesTraded, t.Price, t.TotalValue
            )).ToList()
        ));
    }

    /// <summary>
    /// Typeahead search over our local stock universe — matches tickers (prefix, cheaper) first,
    /// then name ILIKE (substring) so users can find stocks by company name. Intentionally
    /// scoped to the ingested universe so search results are always scorable.
    /// </summary>
    [HttpGet("stocks/search")]
    public async Task<IActionResult> SearchStocks([FromQuery] string q, [FromQuery] int limit = 8)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 1)
            return Ok(Array.Empty<object>());

        var needle = q.Trim().ToUpperInvariant();
        var clamped = Math.Clamp(limit, 1, 25);

        // Prefix match on ticker ranks first; then substring match on name (case-insensitive).
        var rows = await db.Stocks
            .Where(s => s.Active
                && (EF.Functions.ILike(s.Ticker, needle + "%")
                    || EF.Functions.ILike(s.Name, "%" + needle + "%")))
            .OrderBy(s => EF.Functions.ILike(s.Ticker, needle + "%") ? 0 : 1)
            .ThenBy(s => s.Ticker)
            .Take(clamped)
            .Select(s => new
            {
                s.Id,
                s.Ticker,
                s.Name,
                s.Sector,
                s.MarketCap,
            })
            .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("market/pulse")]
    public async Task<IActionResult> GetMarketPulse(CancellationToken ct)
    {
        // Resolve the most recent completed scan — it has the regime + signal counts we need.
        var latestScan = await db.ScanRuns
            .Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefaultAsync(ct);

        if (latestScan is null)
            return Ok(new { regime = "neutral", spyReturn1d = 0.0, vixLevel = (double?)null, signalsToday = 0, buyCount = 0, watchCount = 0, narrative = (string?)null, scanAt = (DateTime?)null });

        // Signal counts from the latest scan.
        var scanSignals = await db.Signals
            .Where(s => s.ScanRunId == latestScan.Id)
            .Select(s => s.SignalType)
            .ToListAsync(ct);

        var buyCount = scanSignals.Count(t => t == SignalType.BUY_TODAY);
        var watchCount = scanSignals.Count(t => t == SignalType.WATCH);

        // SPY today's % move — from the two most recent bars.
        double? spyReturn1d = null;
        double? vixLevel = null;
        var spy = await db.Stocks.FirstOrDefaultAsync(s => s.Ticker == "SPY", ct);
        if (spy is not null)
        {
            var spyBars = await db.MarketData
                .Where(m => m.StockId == spy.Id)
                .OrderByDescending(m => m.Ts)
                .Take(2)
                .Select(m => m.Close)
                .ToListAsync(ct);
            if (spyBars.Count == 2 && spyBars[1] > 0)
                spyReturn1d = Math.Round((spyBars[0] - spyBars[1]) / spyBars[1] * 100, 2);
        }

        var vix = await db.Stocks.FirstOrDefaultAsync(
            s => s.Ticker == "VIX" || s.Ticker == "^VIX" || s.Ticker == "VIXY", ct);
        if (vix is not null)
        {
            var vixBars = await db.MarketData
                .Where(m => m.StockId == vix.Id)
                .OrderByDescending(m => m.Ts)
                .Take(1)
                .Select(m => m.Close)
                .ToListAsync(ct);
            if (vixBars.Count > 0) vixLevel = Math.Round(vixBars[0], 1);
        }

        // Regime label derived from the same rules the scoring engine uses.
        string regime;
        if (vixLevel is > 25) regime = "highvol";
        else if (spyReturn1d is < -1.5) regime = "bear";
        else if (spyReturn1d is > 1.0) regime = "bull";
        else regime = "neutral";

        // Athena daily market narrative. Short-cache at 1h so we don't burn LLM tokens on every page view.
        var topTickers = await db.Signals
            .Include(s => s.Stock)
            .Where(s => s.ScanRunId == latestScan.Id && s.SignalType == SignalType.BUY_TODAY)
            .OrderByDescending(s => s.ScoreTotal)
            .Take(3)
            .Select(s => s.Stock!.Ticker)
            .ToListAsync(ct);

        return Ok(new
        {
            regime,
            spyReturn1d,
            vixLevel,
            signalsToday = scanSignals.Count,
            buyCount,
            watchCount,
            narrative = BuildPulseNarrative(regime, spyReturn1d, vixLevel, buyCount, watchCount, topTickers),
            scanAt = latestScan.CompletedAt,
            topTickers,
        });
    }

    /// <summary>
    /// Build a short market-pulse narrative from regime signals + top tickers without calling
    /// the LLM. Keeps dashboard loads free; the rich narrative lives on per-stock theses.
    /// </summary>
    private static string BuildPulseNarrative(
        string regime, double? spyReturn1d, double? vixLevel,
        int buyCount, int watchCount, List<string> topTickers)
    {
        var spyText = spyReturn1d.HasValue
            ? $"SPY {(spyReturn1d.Value >= 0 ? "+" : "")}{spyReturn1d.Value:F2}%"
            : "SPY flat";
        var vixText = vixLevel.HasValue ? $", VIX {vixLevel.Value:F0}" : "";
        var countText = buyCount > 0
            ? $"{buyCount} BUY + {watchCount} WATCH signals"
            : $"{watchCount} WATCH signals (no BUY_TODAY today)";

        var regimeLabel = regime switch
        {
            "bull" => "risk-on — momentum in favor",
            "bear" => "risk-off — defensive posture",
            "highvol" => "fear spike — elevated VIX, conviction lower",
            _ => "neutral — tape is quiet"
        };

        var topText = topTickers.Count > 0
            ? $" Top picks: {string.Join(", ", topTickers)}."
            : "";

        return $"{regimeLabel}. {spyText}{vixText}. {countText}.{topText}";
    }

    [HttpGet("market/news/{newsId:long}/athena")]
    public async Task<IActionResult> GetNewsAthenaSummary(
        long newsId,
        [FromServices] Services.Scoring.AthenaNewsService newsService,
        CancellationToken ct)
    {
        var item = await newsService.GetOrGenerateAsync(newsId, ct);
        if (item is null) return NotFound(new { message = "News item not found" });

        return Ok(new
        {
            id = item.Id,
            ticker = item.Stock?.Ticker,
            headline = item.Headline,
            source = item.Source,
            url = item.Url,
            publishedAt = item.PublishedAt,
            sentimentScore = item.SentimentScore,
            catalystType = item.CatalystType,
            athenaSummary = item.AthenaSummary,
            generatedAt = item.AthenaSummaryAt,
        });
    }

    [HttpGet("stocks/{ticker}/thesis")]
    public async Task<IActionResult> GetThesis(
        string ticker,
        [FromServices] Services.Scoring.AthenaThesisService thesisService,
        [FromServices] Services.Pipeline.ScanOrchestrator scanner,
        [FromQuery] bool force = false,
        CancellationToken ct = default)
    {
        var normalized = ticker.ToUpperInvariant();

        if (!force)
        {
            var cached = await thesisService.GetOrGenerateAsync(normalized, ct);
            if (cached is not null)
                return Ok(ProjectThesis(cached));
        }

        // On-demand generation: need a fresh snapshot + score for this ticker.
        var stock = await db.Stocks.FirstOrDefaultAsync(s => s.Ticker == normalized, ct);
        if (stock is null)
            return NotFound(new { message = $"Ticker '{normalized}' not in universe." });

        var freshlyGenerated = await scanner.GenerateThesisForTickerAsync(stock, ct);
        if (freshlyGenerated is null)
            return StatusCode(503, new { message = "Thesis generation unavailable — check Athena API key + fundamentals freshness." });

        return Ok(ProjectThesis(freshlyGenerated));
    }

    private static object ProjectThesis(Models.AthenaThesis t) => new
    {
        ticker = t.Ticker,
        verdict = t.Verdict,
        tier = t.Tier,
        thesis = t.ThesisMarkdown,
        catalysts = System.Text.Json.JsonDocument.Parse(t.CatalystsJson).RootElement,
        risks = System.Text.Json.JsonDocument.Parse(t.RisksJson).RootElement,
        tradePlan = System.Text.Json.JsonDocument.Parse(t.TradePlanJson).RootElement,
        generatedAt = t.GeneratedAt,
        model = t.Model,
    };

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

    /// <summary>
    /// Public audit log list. Every signal ever issued with its outcome —
    /// wins and losses both — per FINTREST_UX_SPEC §12. Sorted newest
    /// first. Optional ?status=win|loss|open filters the feed.
    /// </summary>
    [HttpGet("audit-log")]
    public async Task<ActionResult<List<AuditLogEntry>>> AuditLog(
        [FromQuery] string? status = null,
        [FromQuery] int limit = 100,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 500);

        var query =
            from signal in db.Signals
            join perf in db.PerformanceTracking.Where(p => p.Outcome != null)
                on signal.Id equals perf.SignalId into perfs
            from perf in perfs.DefaultIfEmpty()
            join stock in db.Stocks on signal.StockId equals stock.Id
            select new { signal, perf, stock };

        var rows = await query
            .OrderByDescending(x => x.signal.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

        var entries = rows.Select(x => new AuditLogEntry(
            x.signal.Id,
            x.stock.Ticker,
            x.stock.Name,
            x.signal.SignalType.ToString(),
            Math.Round(x.signal.ScoreTotal, 0),
            x.signal.CreatedAt,
            x.perf?.ClosedAt,
            x.perf?.EntryPrice,
            x.perf?.ExitPrice,
            x.perf == null ? null : Math.Round(x.perf.ReturnPct ?? 0, 2),
            x.perf?.DurationDays,
            x.perf?.Outcome ?? "open"
        )).ToList();

        if (!string.IsNullOrEmpty(status))
        {
            entries = status.ToLowerInvariant() switch
            {
                "win"  => entries.Where(e => e.Outcome == "target_hit").ToList(),
                "loss" => entries.Where(e => e.Outcome == "stop_hit").ToList(),
                "open" => entries.Where(e => e.Outcome == "open").ToList(),
                _      => entries,
            };
        }

        return Ok(entries);
    }

    /// <summary>Audit-log detail for one signal — entry/exit/outcome + factor profile at issue.</summary>
    [HttpGet("audit-log/{signalId:long}")]
    public async Task<ActionResult<AuditLogDetail>> AuditLogDetail(long signalId, CancellationToken ct)
    {
        var row = await (
            from signal in db.Signals
            join perf in db.PerformanceTracking.Where(p => p.Outcome != null)
                on signal.Id equals perf.SignalId into perfs
            from perf in perfs.DefaultIfEmpty()
            join stock in db.Stocks on signal.StockId equals stock.Id
            join breakdown in db.SignalBreakdowns on signal.Id equals breakdown.SignalId into breakdowns
            from breakdown in breakdowns.DefaultIfEmpty()
            where signal.Id == signalId
            select new { signal, perf, stock, breakdown }
        ).FirstOrDefaultAsync(ct);

        if (row is null) return NotFound();

        var factorProfile = row.breakdown is null ? null : new FactorProfileSnapshot(
            Math.Round(row.breakdown.MomentumScore, 0),
            Math.Round(row.breakdown.RelVolumeScore, 0),
            Math.Round(row.breakdown.NewsScore, 0),
            Math.Round(row.breakdown.FundamentalsScore, 0),
            Math.Round(row.breakdown.SentimentScore, 0),
            Math.Round(row.breakdown.TrendScore, 0),
            Math.Round(row.breakdown.RiskScore, 0)
        );

        return Ok(new AuditLogDetail(
            row.signal.Id,
            row.stock.Ticker,
            row.stock.Name,
            row.signal.SignalType.ToString(),
            Math.Round(row.signal.ScoreTotal, 0),
            row.signal.CreatedAt,
            row.perf?.ClosedAt,
            row.signal.EntryLow,
            row.signal.StopLoss,
            row.signal.TargetHigh ?? row.signal.TargetLow,
            row.perf?.ExitPrice,
            row.perf?.ReturnPct,
            row.perf?.MaxRunupPct,
            row.perf?.MaxDrawdownPct,
            row.perf?.DurationDays,
            row.perf?.Outcome ?? "open",
            factorProfile
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
        var subscores = await GetFundamentalSubscoresAsync(signals);
        return new SignalListResponse(
            signals.Select(s =>
            {
                var (close, changePct) = prices.GetValueOrDefault(s.StockId);
                subscores.TryGetValue(s.Stock.Ticker, out var sub);
                return ToDto(s, close > 0 ? close : null, changePct, sub);
            }).ToList(),
            signals.Count);
    }

    /// <summary>
    /// Batch-load the latest fundamental_subscore row per ticker for the
    /// signals being returned. One query regardless of list size. Returns
    /// empty dict if the table is empty (e.g. first boot before
    /// FundamentalSubscoreJob has run).
    /// </summary>
    private async Task<Dictionary<string, (double? Quality, double? Profitability, double? Growth)>> GetFundamentalSubscoresAsync(List<Signal> signals)
    {
        if (signals.Count == 0) return new();
        var tickers = signals.Select(s => s.Stock.Ticker).Distinct().ToList();
        var rows = await db.FundamentalSubscores
            .AsNoTracking()
            .Where(f => tickers.Contains(f.Ticker))
            .GroupBy(f => f.Ticker)
            .Select(g => g.OrderByDescending(f => f.AsOfDate).First())
            .Select(f => new { f.Ticker, f.QualityScore, f.ProfitabilityScore, f.GrowthScore })
            .ToListAsync();
        return rows.ToDictionary(
            r => r.Ticker,
            r => (r.QualityScore, r.ProfitabilityScore, r.GrowthScore));
    }

    private static SignalResponse ToDto(
        Signal s,
        double? currentPrice = null,
        double? changePct = null,
        (double? Quality, double? Profitability, double? Growth) sub = default) => new(
        s.Id, s.Stock.Ticker, s.Stock.Name, s.SignalType.ToString(), s.ScoreTotal,
        currentPrice, changePct,
        s.EntryLow, s.EntryHigh, s.StopLoss, s.TargetLow, s.TargetHigh,
        s.RiskLevel, s.HorizonDays,
        s.Breakdown is not null ? new SignalBreakdownDto(
            s.Breakdown.MomentumScore, s.Breakdown.RelVolumeScore, s.Breakdown.NewsScore,
            s.Breakdown.FundamentalsScore, s.Breakdown.SentimentScore, s.Breakdown.TrendScore,
            s.Breakdown.RiskScore, s.Breakdown.ExplanationJson, s.Breakdown.WhyNowSummary,
            QualityScore: sub.Quality,
            ProfitabilityScore: sub.Profitability,
            GrowthScore: sub.Growth
        ) : null,
        s.CreatedAt
    );
}
