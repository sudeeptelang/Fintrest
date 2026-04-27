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

    /// <summary>Market movers — gainers, losers, most-actives. Pulls
    /// directly from FMP's authoritative endpoints (/biggest-gainers,
    /// /biggest-losers, /most-actives) rather than computing from our
    /// market_data bars. Bar-based computation was the source of the
    /// INTC +23.64% bug — gappy ingest meant the prev bar was 2 weeks
    /// old, so a multi-week move surfaced as today's change. FMP rows
    /// are filtered to symbols in our Stocks table so the row enrichment
    /// (sector, marketCap, signal score) lights up; symbols outside our
    /// universe are dropped rather than shown without context.</summary>
    [HttpGet("market/movers")]
    public async Task<ActionResult<List<MoverRowResponse>>> Movers(
        [FromQuery] string category = "gainers",
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        if (category is not ("gainers" or "losers" or "actives" or "active"))
            return BadRequest(new { error = "category must be one of: gainers, losers, actives" });

        limit = Math.Clamp(limit, 1, 100);
        var movers = await fundamentalsProvider.GetMoversAsync(category, ct);
        if (movers.Count == 0) return Ok(new List<MoverRowResponse>());

        // Pull a wider candidate set from FMP and filter down to our
        // universe — FMP returns full-market movers, but anything outside
        // our Stocks table can't be enriched (no sector, no signal score)
        // and the "Lens" CTA on the row would 404.
        var candidateTickers = movers
            .Select(m => m.Ticker)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(limit * 3)
            .ToList();

        var stocks = await db.Stocks
            .Where(s => candidateTickers.Contains(s.Ticker))
            .ToDictionaryAsync(s => s.Ticker, s => s, StringComparer.OrdinalIgnoreCase, ct);

        // Score history (signal-score-history is the per-day score table —
        // every active ticker has a row, not just signal-bearing ones).
        var historyCutoff = DateTime.UtcNow.Date.AddDays(-3);
        var historyRows = await db.SignalScoreHistory
            .AsNoTracking()
            .Where(h => candidateTickers.Contains(h.Ticker) && h.AsOfDate >= historyCutoff)
            .OrderByDescending(h => h.AsOfDate)
            .Select(h => new { h.Ticker, h.ScoreTotal })
            .ToListAsync(ct);
        var scoreByTicker = historyRows
            .GroupBy(r => r.Ticker, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().ScoreTotal, StringComparer.OrdinalIgnoreCase);

        // Don't drop tickers that aren't in our universe — Yahoo / Seeking
        // Alpha show full-market movers and let the user click through.
        // For tickers we track, the row gets enriched with sector + score
        // + our marketCap; for unknown tickers we still surface ticker /
        // name / price / changePct so the list is complete. The Lens CTA
        // on an untracked ticker would land on a page with limited data,
        // but that's better than hiding real gainers/losers.
        var rows = new List<MoverRowResponse>(limit);
        foreach (var m in movers)
        {
            if (rows.Count >= limit) break;
            stocks.TryGetValue(m.Ticker, out var stock);
            scoreByTicker.TryGetValue(m.Ticker, out var score);

            rows.Add(new MoverRowResponse(
                Ticker: m.Ticker,
                Name: stock?.Name ?? m.Name,
                Sector: stock?.Sector,
                Price: m.Price,
                Change: m.Change,
                ChangePct: m.ChangePct,
                MarketCap: stock?.MarketCap,
                SignalScore: score == 0 ? null : (double?)score
            ));
        }

        return Ok(rows);
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
    /// <summary>Freshness guard for live_quotes overlay. During market
    /// hours (9:30–16:00 ET, Mon–Fri) the LiveQuoteRefreshJob runs every
    /// 15 min, so a quote older than 60 min means the job died or fell
    /// behind — don't trust it. Outside market hours the last refresh is
    /// usually around the close and can legitimately be hours old, so we
    /// skip the staleness check.</summary>
    private static bool IsLiveQuoteFresh(LiveQuote lq)
    {
        TimeZoneInfo et;
        try { et = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time"); }
        catch (TimeZoneNotFoundException) { et = TimeZoneInfo.FindSystemTimeZoneById("America/New_York"); }
        var nowEt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, et);
        var inMarketHours = nowEt.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday)
            && (nowEt.Hour * 60 + nowEt.Minute) is >= 570 and < 960; // 9:30–16:00
        if (!inMarketHours) return true;
        var ageMinutes = (DateTime.UtcNow - lq.UpdatedAt).TotalMinutes;
        return ageMinutes <= 60;
    }

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
                // Same gappy-ingest guard as the screener — only trust
                // changePct when prev is within ~5 days of latest.
                double? changePct = prev is not null && prev.Close > 0
                        && (latest.Ts - prev.Ts).TotalDays <= 5
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
                // PostgreSQL timestamptz requires Kind=Utc. FMP hands back
                // dates parsed from "2026-04-30" strings with Kind=Unspecified,
                // which Npgsql refuses. Force UTC-kinded at midnight UTC.
                if (idToDate.TryGetValue(s.Id, out var d))
                    s.NextEarningsDate = DateTime.SpecifyKind(d.Date, DateTimeKind.Utc);
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

    /// <summary>Upcoming + recent IPOs from FMP. No date-range params — the FMP
    /// feed returns a ~30d forward / ~7d back window. Sorted newest-first.</summary>
    [HttpGet("market/ipos-calendar")]
    public async Task<ActionResult<List<IpoCalendarItem>>> IposCalendar(
        [FromQuery] int limit = 30,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 200);
        var rows = await fundamentalsProvider.GetIpoCalendarAsync(ct);
        return Ok(rows
            .Take(limit)
            .Select(r => new IpoCalendarItem(
                r.Ticker, r.Company, r.Date,
                r.Exchange, r.Status, r.Shares, r.PriceRange, r.MarketCap))
            .ToList());
    }

    /// <summary>Latest market-moving news across all stocks — "Trending News" widget.</summary>
    /// <summary>Signals diff between the last two completed scans — the
    /// "what changed overnight" panel on Today. Returns added (in latest,
    /// not in previous), fellOff (in previous, not in latest), biggest
    /// score jumps and biggest drops (in both). Each list capped at 5.</summary>
    [HttpGet("signals/overnight-changes")]
    public async Task<IActionResult> OvernightChanges()
    {
        var scans = await db.ScanRuns
            .Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt)
            .Take(2)
            .ToListAsync();

        if (scans.Count < 2)
        {
            return Ok(new
            {
                hasComparison = false,
                message = "Need two completed scans to compute overnight changes.",
                added = Array.Empty<object>(),
                fellOff = Array.Empty<object>(),
                jumps = Array.Empty<object>(),
                drops = Array.Empty<object>(),
            });
        }

        var latestId = scans[0].Id;
        var prevId = scans[1].Id;

        // Join Signals to Stocks so we can emit tickers. One query fetches
        // both scans; we partition in-memory.
        var rows = await db.Signals
            .Where(s => s.ScanRunId == latestId || s.ScanRunId == prevId)
            .Include(s => s.Stock)
            .Select(s => new
            {
                s.ScanRunId,
                s.StockId,
                Ticker = s.Stock.Ticker,
                StockName = s.Stock.Name,
                s.ScoreTotal,
                s.SignalType,
            })
            .ToListAsync();

        var latestByTicker = rows.Where(r => r.ScanRunId == latestId).ToDictionary(r => r.Ticker);
        var prevByTicker   = rows.Where(r => r.ScanRunId == prevId).ToDictionary(r => r.Ticker);

        var addedTickers = latestByTicker.Keys.Except(prevByTicker.Keys).ToList();
        var fellTickers  = prevByTicker.Keys.Except(latestByTicker.Keys).ToList();
        var bothTickers  = latestByTicker.Keys.Intersect(prevByTicker.Keys).ToList();

        var added = addedTickers
            .Select(t => latestByTicker[t])
            .OrderByDescending(r => r.ScoreTotal)
            .Take(5)
            .Select(r => new { ticker = r.Ticker, name = r.StockName, score = Math.Round(r.ScoreTotal), signalType = r.SignalType })
            .ToList();

        var fellOff = fellTickers
            .Select(t => prevByTicker[t])
            .OrderByDescending(r => r.ScoreTotal)
            .Take(5)
            .Select(r => new { ticker = r.Ticker, name = r.StockName, score = Math.Round(r.ScoreTotal), signalType = r.SignalType })
            .ToList();

        var deltas = bothTickers
            .Select(t => new
            {
                ticker = t,
                name = latestByTicker[t].StockName,
                currentScore = Math.Round(latestByTicker[t].ScoreTotal),
                previousScore = Math.Round(prevByTicker[t].ScoreTotal),
                delta = Math.Round(latestByTicker[t].ScoreTotal - prevByTicker[t].ScoreTotal, 1),
                signalType = latestByTicker[t].SignalType,
            })
            .ToList();

        var jumps = deltas.OrderByDescending(d => d.delta).Where(d => d.delta > 0).Take(5).ToList();
        var drops = deltas.OrderBy(d => d.delta).Where(d => d.delta < 0).Take(5).ToList();

        return Ok(new
        {
            hasComparison = true,
            latestScanAt = scans[0].CompletedAt,
            previousScanAt = scans[1].CompletedAt,
            addedCount = addedTickers.Count,
            fellOffCount = fellTickers.Count,
            added,
            fellOff,
            jumps,
            drops,
        });
    }

    [HttpGet("market/news")]
    public async Task<ActionResult<List<NewsResponse>>> TrendingNews([FromQuery] int limit = 10)
    {
        var cutoff = DateTime.UtcNow.AddDays(-3);
        // Sources we drop from the market-news feed: low-signal
        // template spam that posts the same headline for every ticker
        // ("Top S&P500 movers in Friday's session" across KLAC / AMD /
        // INTC / CHTR / ...). Still indexed for per-ticker news where
        // the ticker context rescues the redundancy; excluded from the
        // cross-market feed.
        var blockedSources = new[] { "ChartMill" };
        // We overfetch so that after de-duplication by headline we can
        // still return `limit` distinct stories.
        var fetchLimit = Math.Min(limit * 4, 200);

        var raw = await db.NewsItems
            .Include(n => n.Stock)
            .Where(n => n.PublishedAt >= cutoff && !blockedSources.Contains(n.Source ?? ""))
            .OrderByDescending(n => n.PublishedAt)
            .Take(fetchLimit)
            .ToListAsync();

        // Headline-prefix dedupe — two news items sharing the first 60
        // characters are almost always the same story republished per
        // ticker. Keep the first (most recent).
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var deduped = raw
            .Where(n => seen.Add((n.Headline ?? "").Length > 60 ? n.Headline!.Substring(0, 60) : (n.Headline ?? "")))
            .Take(limit)
            .Select(n => new NewsResponse(
                n.Id, n.Headline, n.Summary, n.Source, n.Url,
                n.SentimentScore, n.CatalystType, n.PublishedAt, n.Stock.Ticker
            ))
            .ToList();

        return Ok(deduped);
    }

    /// <summary>Dashboard screener table — batch of stocks with full snapshot + signal data.</summary>
    [HttpGet("market/screener")]
    public async Task<ActionResult<List<ScreenerRowResponse>>> Screener([FromQuery] int limit = 50)
    {
        // Get latest scan's signals (for score + signal type). Fetched unfiltered —
        // we attach them to whatever universe we assemble below.
        var latestScan = await db.ScanRuns.Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt).FirstOrDefaultAsync();

        var signalsByStock = latestScan is not null
            ? await db.Signals
                .Where(s => s.ScanRunId == latestScan.Id)
                .ToDictionaryAsync(s => s.StockId, s => new
                {
                    s.ScoreTotal,
                    s.SignalType,
                    s.EntryLow, s.EntryHigh,
                    s.StopLoss, s.TargetLow, s.TargetHigh,
                    s.HorizonDays,
                })
            : new();

        // Universe = top N active stocks by market cap, UNION with all stocks
        // that have a signal on the latest scan. Previously we only returned
        // rows that had a signal, which meant big movers (MU/AMD/INTC and
        // friends) silently disappeared from the screener when they didn't
        // clear the signal bar. Now every large-cap shows up with changePct
        // populated; signal fields stay null for rows without a signal.
        var topCapIds = await db.Stocks
            .Where(s => s.Active)
            .OrderByDescending(s => s.MarketCap ?? 0)
            .Take(limit)
            .Select(s => s.Id)
            .ToListAsync();

        var stockIds = topCapIds
            .Concat(signalsByStock.Keys.Where(k => !topCapIds.Contains(k)))
            .ToList();

        if (stockIds.Count == 0) return Ok(new List<ScreenerRowResponse>());

        // Load stocks (has TTM metrics: Beta, Forward P/E, PEG, ROE, ROA, analyst target, next earnings)
        var stocks = await db.Stocks
            .Where(s => stockIds.Contains(s.Id))
            .ToListAsync();

        // Phase 1 of multi-lens scoring: every ticker has a daily score now,
        // not just signal-bearing ones. Pull the most recent
        // signal_score_history row per ticker so AMD/AAPL/MSFT show real
        // composite scores even when the swing classifier didn't fire a
        // BUY_TODAY/WATCH for them. Falls back silently when the table
        // doesn't exist (migration 026 pending) — screener still works
        // with publishable-only scores from the signals table.
        var screenerTickers = stocks.Select(s => s.Ticker).ToList();
        Dictionary<string, decimal> historicalScores = new(StringComparer.OrdinalIgnoreCase);
        Dictionary<string, decimal> compositeScores = new(StringComparer.OrdinalIgnoreCase);
        Dictionary<string, decimal> qualityScores = new(StringComparer.OrdinalIgnoreCase);
        try
        {
            var historyCutoff = DateTime.UtcNow.Date.AddDays(-3);
            var historyRows = await db.SignalScoreHistory
                .AsNoTracking()
                .Where(h => screenerTickers.Contains(h.Ticker) && h.AsOfDate >= historyCutoff)
                .OrderByDescending(h => h.AsOfDate)
                .Select(h => new { h.Ticker, h.ScoreTotal, h.CompositeScore, h.QualityScore, h.AsOfDate })
                .ToListAsync();
            // Most-recent row per ticker; ToDictionary picks the first
            // occurrence which is the newest after OrderByDescending.
            var latestByTicker = historyRows
                .GroupBy(r => r.Ticker, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
            historicalScores = latestByTicker
                .ToDictionary(kv => kv.Key, kv => kv.Value.ScoreTotal, StringComparer.OrdinalIgnoreCase);
            compositeScores = latestByTicker
                .Where(kv => kv.Value.CompositeScore.HasValue)
                .ToDictionary(kv => kv.Key, kv => kv.Value.CompositeScore!.Value, StringComparer.OrdinalIgnoreCase);
            qualityScores = latestByTicker
                .Where(kv => kv.Value.QualityScore.HasValue)
                .ToDictionary(kv => kv.Key, kv => kv.Value.QualityScore!.Value, StringComparer.OrdinalIgnoreCase);
        }
        catch (Npgsql.PostgresException pex) when (pex.SqlState == "42P01")
        {
            // signal_score_history table missing — migration 026 not applied yet.
            // Fall back to publishable-only scoring.
        }

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
            .Select(m => new { m.StockId, m.Ts, m.Close, m.High, m.Low, m.Volume, m.Rsi })
            .ToListAsync();
        var barsByStock = allBars
            .GroupBy(m => m.StockId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(m => m.Ts).ToList());

        // Overlay intraday live quotes. The MarketData table only stores
        // EOD bars; without this overlay, intraday users see yesterday's
        // close until 4 PM when today's bar lands. live_quotes is
        // refreshed every 15 min during market hours by LiveQuoteRefreshJob.
        //
        // Wrapped in try/catch so the screener degrades gracefully when
        // migration 027 hasn't been applied yet — callers get
        // EOD-close data instead of a 500. Log once at Warning so ops
        // notices the missing migration without spamming every request.
        var tickerUpperSet = stocks.Select(s => s.Ticker).ToList();
        Dictionary<string, Models.LiveQuote> liveQuotes = new();
        try
        {
            liveQuotes = await db.LiveQuotes
                .AsNoTracking()
                .Where(l => tickerUpperSet.Contains(l.Ticker))
                .ToDictionaryAsync(l => l.Ticker);
        }
        catch (Npgsql.PostgresException pex) when (pex.SqlState == "42P01")
        {
            // live_quotes table missing — migration 027 not applied yet.
            // Continue without the intraday overlay.
        }

        var rows = new List<ScreenerRowResponse>();

        foreach (var stock in stocks)
        {
            // Previously `continue`'d when bars were missing, which silently
            // dropped big-caps whose market_data ingest lagged (MU / AMD /
            // INTC symptom). Emit the row with null price/changePct instead
            // so the ticker stays in the universe; downstream Gainers/Losers
            // filters naturally skip null-changePct rows.
            barsByStock.TryGetValue(stock.Id, out var bars);
            bars ??= new();
            var latest = bars.Count > 0 ? bars[0] : null;

            double? price = latest?.Close;
            // Day-over-day % change comes from live_quotes ONLY. We used
            // to fall back to (latest.Close - prev.Close) / prev.Close
            // from market_data bars, but gappy ingest produced wildly
            // wrong values — e.g. INTC at $82.57 was showing +23.64%
            // because the prev bar in the table was from 2 weeks ago,
            // not yesterday (real intraday move was ~1.3%). Better to
            // show "—" than mislead.
            //
            // Stale-quote guard: during market hours the
            // LiveQuoteRefreshJob runs every 15 min, so a quote older
            // than 60 min means the job died or fell behind. Outside
            // market hours, the last refresh can legitimately be hours
            // old (last close), so we don't gate it.
            double? changePct = null;
            if (liveQuotes.TryGetValue(stock.Ticker, out var lq) && IsLiveQuoteFresh(lq))
            {
                if (lq.Price.HasValue) price = (double)lq.Price.Value;
                if (lq.ChangePct.HasValue) changePct = Math.Round((double)lq.ChangePct.Value, 2);
            }

            double? avgVol30 = bars.Count >= 30
                ? bars.Take(30).Average(b => (double)b.Volume)
                : null;
            double? relVol = (latest is not null && avgVol30 is > 0)
                ? Math.Round(latest.Volume / avgVol30.Value, 2) : null;

            double? PerfN(int n) => (latest is not null && bars.Count > n && bars[n].Close > 0)
                ? Math.Round((latest.Close - bars[n].Close) / bars[n].Close * 100, 2) : null;

            double? w52High = bars.Count > 0 ? bars.Max(b => b.High) : null;
            double? w52Low = bars.Count > 0 ? bars.Min(b => b.Low) : null;
            double? w52RangePct = (latest is not null && w52High is > 0 && w52Low is > 0 && w52High > w52Low)
                ? Math.Round((latest.Close - w52Low.Value) / (w52High.Value - w52Low.Value) * 100, 1) : null;

            double? perfYtd = null;
            if (latest is not null)
            {
                var ytdAnchor = bars.LastOrDefault(b => b.Ts.Year == latest.Ts.Year);
                if (ytdAnchor is not null && ytdAnchor.Close > 0 && ytdAnchor != latest)
                    perfYtd = Math.Round((latest.Close - ytdAnchor.Close) / ytdAnchor.Close * 100, 2);
            }

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
                Volume: latest?.Volume,
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
                Week52High: w52High is not null ? Math.Round(w52High.Value, 2) : null,
                Week52Low: w52Low is not null ? Math.Round(w52Low.Value, 2) : null,
                Week52RangePct: w52RangePct,
                Rsi: latest?.Rsi is double r ? Math.Round(r, 1) : null,
                AnalystTargetPrice: stock.AnalystTargetPrice,
                NextEarningsDate: stock.NextEarningsDate,
                // Score precedence: today's published signal first (full
                // breakdown available), else the most recent
                // signal_score_history row (Phase 1 multi-lens — every
                // active ticker now carries a daily score). Coerce decimal
                // history scores to double for the DTO.
                SignalScore: signal?.ScoreTotal
                    ?? (historicalScores.TryGetValue(stock.Ticker, out var hs) ? (double)hs : null),
                SignalType: signal?.SignalType.ToString(),
                CompositeScore: compositeScores.TryGetValue(stock.Ticker, out var cs) ? (double)cs : null,
                QualityScore: qualityScores.TryGetValue(stock.Ticker, out var qs) ? (double)qs : null,
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
    public async Task<ActionResult<List<SectorPerformanceResponse>>> SectorPerformance(CancellationToken ct = default)
    {
        // Sector day-change comes from FMP's authoritative
        // /sector-performance-snapshot endpoint rather than aggregated
        // from our market_data bars (which used stale PrevClose values
        // and produced wrong %s — same gappy-ingest bug as the screener).
        // We still source StockCount + SignalCount from our DB since
        // those reflect our universe, not FMP's.
        var fmpSectors = await fundamentalsProvider.GetSectorPerformanceAsync(ct);
        var sectorPctByName = fmpSectors
            .Where(s => s.ChangePct.HasValue)
            .ToDictionary(s => NormalizeSectorName(s.Sector), s => s.ChangePct!.Value, StringComparer.OrdinalIgnoreCase);

        // Stocks with a sector assigned — for the count column.
        var stocks = await db.Stocks
            .Where(s => s.Active && s.Sector != null)
            .Select(s => new { s.Sector })
            .ToListAsync(ct);

        if (stocks.Count == 0) return Ok(new List<SectorPerformanceResponse>());

        // Signal counts per sector — from latest completed scan.
        var latestScan = await db.ScanRuns
            .Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefaultAsync(ct);

        Dictionary<string, int> sigCounts = new();
        if (latestScan is not null)
        {
            var rows = await db.Signals
                .Include(s => s.Stock)
                .Where(s => s.ScanRunId == latestScan.Id && s.Stock.Sector != null)
                .GroupBy(s => s.Stock.Sector!)
                .Select(g => new { Sector = g.Key, Count = g.Count() })
                .ToListAsync(ct);
            sigCounts = rows.ToDictionary(r => r.Sector, r => r.Count);
        }

        var result = stocks
            .GroupBy(s => s.Sector!)
            .Select(g =>
            {
                var sector = g.Key;
                // Match FMP's sector name to ours — they sometimes use
                // slightly different capitalization or naming. The
                // NormalizeSectorName helper handles common variants.
                sectorPctByName.TryGetValue(NormalizeSectorName(sector), out var changePct);
                return new SectorPerformanceResponse(
                    Sector: sector,
                    StockCount: g.Count(),
                    ChangePct: changePct == 0 && !sectorPctByName.ContainsKey(NormalizeSectorName(sector))
                        ? null
                        : Math.Round(changePct, 2),
                    SignalCount: sigCounts.GetValueOrDefault(sector, 0)
                );
            })
            .OrderByDescending(r => r.ChangePct ?? -999)
            .ToList();

        return Ok(result);
    }

    /// <summary>Normalize sector names so FMP's labels match ours.
    /// Strip casing + common suffix/punctuation differences. We use
    /// uppercase from the SIC tables; FMP returns title-case GICS-style.
    /// Falls back to a clean lowercase compare if no exact match.</summary>
    private static string NormalizeSectorName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "";
        return name.Trim().ToLowerInvariant()
            .Replace("&", "and")
            .Replace(",", "")
            .Replace(".", "")
            .Replace("  ", " ");
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

    /// <summary>Peer comparison set — FMP's /stock-peers list enriched
    /// with our own signal score + live quote so each peer row can
    /// render a letter grade, price, and today's % change. Powers the
    /// Compare Mode card on ticker detail. Returns 204 when FMP has no
    /// peer list (rare — happens for micro-caps or recent IPOs).</summary>
    [HttpGet("market/peers/{ticker}")]
    public async Task<IActionResult> GetPeers(
        string ticker,
        [FromServices] Fintrest.Api.Services.Providers.Contracts.IFundamentalsProvider fmp,
        CancellationToken ct)
    {
        var normalized = (ticker ?? "").Trim().ToUpperInvariant();
        if (normalized.Length == 0) return BadRequest("ticker required");

        var peerTickers = await fmp.GetPeersAsync(normalized, ct);
        if (peerTickers.Count == 0) return NoContent();

        // Join our own data: Stock, latest Signal, LiveQuote.
        var upperPeers = peerTickers.Select(p => p.ToUpperInvariant()).ToList();
        var peerStocks = await db.Stocks
            .AsNoTracking()
            .Where(s => upperPeers.Contains(s.Ticker))
            .Select(s => new { s.Id, s.Ticker, s.Name, s.Sector, s.MarketCap })
            .ToListAsync(ct);

        var latestScan = await db.ScanRuns
            .Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefaultAsync(ct);
        var peerIds = peerStocks.Select(s => s.Id).ToList();
        var peerSignals = latestScan is null
            ? new Dictionary<long, double>()
            : await db.Signals
                .Where(s => s.ScanRunId == latestScan.Id && peerIds.Contains(s.StockId))
                .ToDictionaryAsync(s => s.StockId, s => s.ScoreTotal, ct);
        Dictionary<string, Models.LiveQuote> peerQuotes = new();
        try
        {
            peerQuotes = await db.LiveQuotes
                .AsNoTracking()
                .Where(l => upperPeers.Contains(l.Ticker))
                .ToDictionaryAsync(l => l.Ticker, ct);
        }
        catch (Npgsql.PostgresException pex) when (pex.SqlState == "42P01") { /* migration 027 pending */ }

        // Preserve FMP's peer ordering (they rank by relevance) but
        // render only peers we actually carry. Fill any missing with
        // name-only placeholders so the card doesn't feel empty.
        var rows = new List<object>();
        foreach (var peer in upperPeers)
        {
            var stock = peerStocks.FirstOrDefault(s => s.Ticker == peer);
            peerQuotes.TryGetValue(peer, out var lq);
            double? score = null;
            if (stock is not null && peerSignals.TryGetValue(stock.Id, out var sc))
                score = sc;
            rows.Add(new
            {
                ticker = peer,
                name = stock?.Name,
                sector = stock?.Sector,
                marketCap = stock?.MarketCap,
                price = lq?.Price,
                changePct = lq?.ChangePct,
                score,
                inUniverse = stock is not null,
            });
        }

        return Ok(new
        {
            ticker = normalized,
            peerCount = peerTickers.Count,
            peers = rows,
        });
    }

    /// <summary>Per-ticker daily composite-score history. Written at
    /// scan time by ScanOrchestrator. Powers real sparklines on the
    /// Today grid + ticker hero and the real "delta vs yesterday"
    /// on ScoreGradeChip. Returns an ordered list of { date, score,
    /// signalType } up to `days` back.</summary>
    [HttpGet("stocks/{ticker}/score-history")]
    public async Task<IActionResult> GetScoreHistory(
        string ticker,
        [FromQuery] int days = 30,
        CancellationToken ct = default)
    {
        var normalized = (ticker ?? "").Trim().ToUpperInvariant();
        if (normalized.Length == 0) return BadRequest("ticker required");
        days = Math.Clamp(days, 5, 365);

        var cutoff = DateTime.SpecifyKind(DateTime.UtcNow.Date.AddDays(-days), DateTimeKind.Utc);
        try
        {
            var rows = await db.SignalScoreHistory
                .AsNoTracking()
                .Where(h => h.Ticker == normalized && h.AsOfDate >= cutoff)
                .OrderBy(h => h.AsOfDate)
                .Select(h => new
                {
                    date = h.AsOfDate,
                    score = (double)h.ScoreTotal,
                    signalType = h.SignalType,
                })
                .ToListAsync(ct);
            return Ok(new { ticker = normalized, days, points = rows });
        }
        catch (Npgsql.PostgresException pex) when (pex.SqlState == "42P01")
        {
            // migration 026 pending — degrade to empty history.
            return Ok(new { ticker = normalized, days, points = Array.Empty<object>() });
        }
    }

    /// <summary>Bulk score-history fetch — one call for a list of tickers.
    /// Used by the Today grid so each signal row gets a real sparkline
    /// without an N+1 request fan-out. Returns a map { ticker: [points] }.</summary>
    [HttpGet("stocks/score-history/bulk")]
    public async Task<IActionResult> GetScoreHistoryBulk(
        [FromQuery] string tickers,
        [FromQuery] int days = 30,
        CancellationToken ct = default)
    {
        var list = (tickers ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(t => t.ToUpperInvariant())
            .Distinct()
            .Take(200)
            .ToList();
        if (list.Count == 0) return BadRequest("pass ?tickers=T1,T2,…");
        days = Math.Clamp(days, 5, 365);

        var cutoff = DateTime.SpecifyKind(DateTime.UtcNow.Date.AddDays(-days), DateTimeKind.Utc);
        try
        {
            var rows = await db.SignalScoreHistory
                .AsNoTracking()
                .Where(h => list.Contains(h.Ticker) && h.AsOfDate >= cutoff)
                .OrderBy(h => h.AsOfDate)
                .Select(h => new { h.Ticker, date = h.AsOfDate, score = (double)h.ScoreTotal })
                .ToListAsync(ct);

            var map = rows
                .GroupBy(r => r.Ticker)
                .ToDictionary(g => g.Key, g => g.Select(x => new { x.date, x.score }).ToList());

            return Ok(new { days, tickers = map });
        }
        catch (Npgsql.PostgresException pex) when (pex.SqlState == "42P01")
        {
            // migration 026 pending — degrade to empty map.
            return Ok(new { days, tickers = new Dictionary<string, object>() });
        }
    }

    /// <summary>Recent analyst grade changes for a ticker (FMP /grades
    /// firehose, filtered to the last N days). Returns per-event rows
    /// plus an aggregate: upgrades / downgrades / reiterations /
    /// initializations over the window, and a "net revisions" integer
    /// that the News / Catalyst factor can ingest. Returns 204 when
    /// there's been no activity in the window.</summary>
    [HttpGet("market/analyst-revisions/{ticker}")]
    public async Task<IActionResult> GetAnalystRevisions(
        string ticker,
        [FromServices] Fintrest.Api.Services.Providers.Contracts.IFundamentalsProvider fmp,
        [FromQuery] int days = 30,
        CancellationToken ct = default)
    {
        var normalized = (ticker ?? "").Trim().ToUpperInvariant();
        if (normalized.Length == 0) return BadRequest("ticker required");
        days = Math.Clamp(days, 7, 365);

        var since = DateTime.UtcNow.AddDays(-days);
        var events = await fmp.GetAnalystGradeEventsAsync(normalized, since, ct);
        if (events.Count == 0) return NoContent();

        int upgrades = 0, downgrades = 0, reiterations = 0, initializations = 0, targets = 0;
        foreach (var e in events)
        {
            switch (e.Action)
            {
                case "up":          upgrades++; break;
                case "down":        downgrades++; break;
                case "reiterate":   reiterations++; break;
                case "initialize":  initializations++; break;
                case "target":      targets++; break;
            }
        }

        var net = upgrades - downgrades;
        string band;
        if (net >= 3) band = "strongly-positive";
        else if (net >= 1) band = "positive";
        else if (net == 0) band = "mixed";
        else if (net >= -2) band = "negative";
        else band = "strongly-negative";

        return Ok(new
        {
            ticker = normalized,
            windowDays = days,
            totalEvents = events.Count,
            upgrades,
            downgrades,
            reiterations,
            initializations,
            targets,
            netRevisions = net,
            band,
            events = events.Take(15).Select(e => new
            {
                date = e.Date,
                action = e.Action,
                newGrade = e.NewGrade,
                previousGrade = e.PreviousGrade,
                gradingCompany = e.GradingCompany,
            }),
        });
    }

    /// <summary>Earnings surprise history for a ticker. Returns the last
    /// N quarters plus a "beats X of Y" aggregate so the Lens thesis
    /// generator can quote the track record in a single sentence.</summary>
    [HttpGet("market/earnings-surprises/{ticker}")]
    public async Task<IActionResult> GetEarningsSurprises(
        string ticker,
        [FromServices] Fintrest.Api.Services.Providers.Contracts.IFundamentalsProvider fmp,
        [FromQuery] int quarters = 10,
        CancellationToken ct = default)
    {
        var normalized = (ticker ?? "").Trim().ToUpperInvariant();
        if (normalized.Length == 0) return BadRequest("ticker required");
        quarters = Math.Clamp(quarters, 4, 20);

        var rows = await fmp.GetEarningsSurprisesAsync(normalized, quarters, ct);
        if (rows.Count == 0) return NoContent();

        var beats = rows.Count(r => r.Beat);
        var avgSurprise = rows
            .Where(r => r.SurprisePct is not null)
            .Select(r => r.SurprisePct!.Value)
            .DefaultIfEmpty(0m)
            .Average();

        return Ok(new
        {
            ticker = normalized,
            quartersReviewed = rows.Count,
            beats,
            misses = rows.Count - beats,
            beatRatePct = Math.Round((decimal)beats / rows.Count * 100m, 1),
            avgSurprisePct = Math.Round(avgSurprise, 2),
            streak = ComputeBeatStreak(rows),
            quarters = rows.Select(r => new
            {
                reportDate = r.ReportDate,
                estimatedEps = r.EstimatedEps,
                actualEps = r.ActualEps,
                surprisePct = r.SurprisePct,
                beat = r.Beat,
            }),
        });
    }

    private static int ComputeBeatStreak(List<Fintrest.Api.Services.Providers.Contracts.EarningsSurpriseDto> rows)
    {
        // Rows arrive most-recent first. Count consecutive beats from
        // the top; break at the first miss. Negative means consecutive
        // misses (caller can render "missed last 3" differently).
        var streak = 0;
        foreach (var r in rows)
        {
            if (streak == 0)
            {
                streak = r.Beat ? 1 : -1;
            }
            else if ((streak > 0 && r.Beat) || (streak < 0 && !r.Beat))
            {
                streak += streak > 0 ? 1 : -1;
            }
            else
            {
                break;
            }
        }
        return streak;
    }

    /// <summary>FMP-computed DCF fair-value + implied upside/downside
    /// vs the stock's current price. Surfaces on the Fundamentals
    /// deep-dive as a Valuation anchor. Returns 204 if FMP has no DCF
    /// for this ticker.</summary>
    [HttpGet("market/dcf/{ticker}")]
    public async Task<IActionResult> GetDcf(
        string ticker,
        [FromServices] Fintrest.Api.Services.Providers.Contracts.IFundamentalsProvider fmp,
        CancellationToken ct)
    {
        var normalized = (ticker ?? "").Trim().ToUpperInvariant();
        if (normalized.Length == 0) return BadRequest("ticker required");

        var dcf = await fmp.GetDcfAsync(normalized, ct);
        if (dcf is null || dcf.DcfFairValue is null or 0m) return NoContent();

        decimal? impliedPct = null;
        if (dcf.StockPrice is > 0 && dcf.DcfFairValue.HasValue)
            impliedPct = Math.Round((dcf.DcfFairValue.Value - dcf.StockPrice.Value) / dcf.StockPrice.Value * 100m, 2);

        return Ok(new
        {
            ticker = dcf.Ticker,
            dcfFairValue = dcf.DcfFairValue,
            stockPrice = dcf.StockPrice,
            impliedUpsidePct = impliedPct,
            band = DcfBand(impliedPct),
            asOf = dcf.AsOf,
        });
    }

    private static string DcfBand(decimal? upsidePct)
    {
        if (upsidePct is null) return "unknown";
        if (upsidePct >= 20m) return "undervalued";
        if (upsidePct >= -10m) return "fair";
        return "overvalued";
    }

    /// <summary>FMP-computed financial health scores: Altman Z +
    /// Piotroski F + working capital. Surfaces on the Fundamentals
    /// deep-dive as institutional-grade rigor markers. Returns 204
    /// if FMP has no record for this ticker.</summary>
    [HttpGet("market/financial-scores/{ticker}")]
    public async Task<IActionResult> GetFinancialScores(
        string ticker,
        [FromServices] Fintrest.Api.Services.Providers.Contracts.IFundamentalsProvider fmp,
        CancellationToken ct)
    {
        var normalized = (ticker ?? "").Trim().ToUpperInvariant();
        if (normalized.Length == 0) return BadRequest("ticker required");

        var scores = await fmp.GetFinancialScoresAsync(normalized, ct);
        if (scores is null) return NoContent();

        // Enrich with interpretation bands so the frontend doesn't hardcode them.
        return Ok(new
        {
            ticker = scores.Ticker,
            altmanZScore = scores.AltmanZScore,
            altmanBand = AltmanBand(scores.AltmanZScore),
            piotroskiScore = scores.PiotroskiScore,
            piotroskiBand = PiotroskiBand(scores.PiotroskiScore),
            workingCapital = scores.WorkingCapital,
            totalAssets = scores.TotalAssets,
            marketCap = scores.MarketCap,
            totalLiabilities = scores.TotalLiabilities,
            revenue = scores.Revenue,
        });
    }

    private static string AltmanBand(decimal? z)
    {
        if (z is null) return "unknown";
        if (z >= 3m) return "safe";
        if (z >= 1.8m) return "grey";
        return "distress";
    }

    private static string PiotroskiBand(decimal? p)
    {
        if (p is null) return "unknown";
        if (p >= 7m) return "strong";
        if (p >= 4m) return "mid";
        return "weak";
    }

    /// <summary>Per-ticker Institutional flow signal — Smart Money
    /// Phase 2 row #4. Derives a 0-100 score from FMP's institutional
    /// ownership feed (13F-rolled-up). Score rewards rising ownership %
    /// and rising investor count; heavy already-owned names without
    /// recent change settle near neutral. Returns 204 when FMP has no
    /// ownership data for the ticker.</summary>
    [HttpGet("market/institutional-signal/{ticker}")]
    public async Task<IActionResult> GetInstitutionalSignal(
        string ticker,
        [FromServices] Fintrest.Api.Services.Providers.Contracts.IFundamentalsProvider fmp,
        CancellationToken ct)
    {
        var normalized = (ticker ?? "").Trim().ToUpperInvariant();
        if (normalized.Length == 0) return BadRequest("ticker required");

        var snap = await fmp.GetOwnershipAsync(normalized, ct);
        if (snap is null) return NoContent();

        // Score model (MVP):
        //   Base 50. Ownership-% change dominates (±30 pts for ±10%).
        //   Investor-count change adds ±20 pts for a ±10-investor swing.
        //   Clamp 0-100.
        var score = 50.0;
        var ownPctChange = snap.OwnershipPercentChange ?? 0;
        score += ownPctChange * 3.0;
        var investorChange = snap.InvestorsHoldingChange ?? 0;
        score += investorChange * 2.0;
        score = Math.Clamp(score, 0, 100);

        // Evidence line — the one-sentence Lens-style summary rendered
        // on the Smart Money sub-card.
        string evidence;
        if (snap.OwnershipPercentChange is > 0.5)
            evidence = $"Institutions +{snap.OwnershipPercentChange.Value:0.#}% of shares · "
                + $"{snap.InvestorsHolding ?? 0} holders"
                + (snap.InvestorsHoldingChange is > 0 ? $" (+{snap.InvestorsHoldingChange})" : "");
        else if (snap.OwnershipPercentChange is < -0.5)
            evidence = $"Institutions {snap.OwnershipPercentChange.Value:0.#}% of shares · "
                + $"{snap.InvestorsHolding ?? 0} holders"
                + (snap.InvestorsHoldingChange is < 0 ? $" ({snap.InvestorsHoldingChange})" : "");
        else
            evidence = $"{snap.InstitutionalPercent?.ToString("0.#%") ?? "—"} institutional · "
                + $"{snap.InvestorsHolding ?? 0} holders · flat";

        return Ok(new
        {
            ticker = normalized,
            score = (int)Math.Round(score),
            institutionalPercent = snap.InstitutionalPercent,
            investorsHolding = snap.InvestorsHolding,
            investorsHoldingChange = snap.InvestorsHoldingChange,
            ownershipPercentChange = snap.OwnershipPercentChange,
            totalInvested = snap.TotalInvested,
            evidence,
        });
    }

    /// <summary>Per-ticker Congressional sub-signal — Smart Money Phase 2.
    /// Derived at query-time from the last 90 days of firehose
    /// snapshots. Returns 204 when there are no disclosures on file for
    /// this ticker.</summary>
    [HttpGet("market/congress-signal/{ticker}")]
    public async Task<IActionResult> GetCongressSignal(
        string ticker,
        [FromServices] Fintrest.Api.Services.Scoring.CongressSignalService congressSvc,
        CancellationToken ct)
    {
        var normalized = (ticker ?? "").Trim().ToUpperInvariant();
        if (normalized.Length == 0) return BadRequest("ticker required");

        var result = await congressSvc.ComputeAsync(normalized, ct);
        if (result is null) return NoContent();

        return Ok(new
        {
            ticker = normalized,
            score = result.Score,
            buyCount90d = result.BuyCount90d,
            sellCount90d = result.SellCount90d,
            bipartisan = result.Bipartisan,
            evidence = result.Evidence,
            latestDisclosure = result.LatestDisclosure,
        });
    }

    /// <summary>Per-ticker short-interest snapshot — the Smart Money
    /// Phase 2 "Short dynamics" sub-signal. Reads the latest snapshot from
    /// short_interest_snapshots (populated by
    /// /admin/short-interest/ingest). Returns 204 if we haven't pulled
    /// one for this ticker yet.</summary>
    [HttpGet("market/short-interest/{ticker}")]
    public async Task<IActionResult> GetShortInterest(
        string ticker,
        [FromServices] Fintrest.Api.Services.Scoring.ShortInterestService shortSvc,
        CancellationToken ct)
    {
        var normalized = (ticker ?? "").Trim().ToUpperInvariant();
        if (normalized.Length == 0) return BadRequest("ticker required");

        var snap = await shortSvc.GetLatestAsync(normalized, ct);
        if (snap is null) return NoContent();

        var score = Fintrest.Api.Services.Scoring.ShortInterestService.ScoreFromShortPct(snap.ShortPctFloat);
        var evidence = Fintrest.Api.Services.Scoring.ShortInterestService.EvidenceFor(snap);

        return Ok(new
        {
            ticker = snap.Ticker,
            settlementDate = snap.SettlementDate,
            shortPctFloat = snap.ShortPctFloat,
            daysToCover = snap.DaysToCover,
            shortInterestShares = snap.ShortInterestShares,
            floatShares = snap.FloatShares,
            avgDailyVolume = snap.AvgDailyVolume,
            score,
            evidence,
        });
    }

    /// <summary>
    /// Per-ticker Smart Money score card. Reads the most recent row from
    /// insider_scores — produced nightly by InsiderScoreJob. Returns 204
    /// when no qualifying insider buying has been recorded in the trailing
    /// 30-day window (UI then renders "No recent insider buying").
    /// Public because the card lives on the ticker detail page.
    /// </summary>
    [HttpGet("market/insider-score/{ticker}")]
    public async Task<ActionResult<InsiderScoreResponse>> GetInsiderScore(string ticker)
    {
        var normalized = (ticker ?? "").Trim().ToUpperInvariant();
        if (normalized.Length == 0) return BadRequest("ticker required");

        Models.InsiderScore? row = null;
        try
        {
            row = await db.InsiderScores
                .AsNoTracking()
                .Where(s => s.Ticker == normalized)
                .OrderByDescending(s => s.AsOfDate)
                .FirstOrDefaultAsync();
        }
        catch (Npgsql.PostgresException pex) when (pex.SqlState == "42P01")
        {
            // migration 024 pending — degrade to 204.
            return NoContent();
        }

        if (row is null) return NoContent();

        return Ok(new InsiderScoreResponse(
            row.Ticker,
            row.AsOfDate,
            row.Score,
            row.NetDollarFlow30d,
            row.ClusterCount30d,
            row.OfficerBuyCount,
            row.DirectorBuyCount,
            row.LargestPurchaseValue,
            row.LargestPurchaserName,
            row.LargestPurchaserTitle,
            row.LargestPurchaserHistoryNote,
            row.MethodologyVersion
        ));
    }

    /// <summary>
    /// Per-ticker insider activity feed. Reads the same
    /// market_firehose_snapshots cache as /market/insiders/latest but
    /// filtered by ticker. Powers the "Insider activity" card on the
    /// ticker detail page — the replacement for the retired
    /// /insiders firehose page.
    /// </summary>
    [Authorize]
    [RequiresPlan(PlanType.Pro)]
    [HttpGet("market/insiders/{ticker}")]
    public async Task<ActionResult<List<InsiderActivityItem>>> GetInsiderTradesForTicker(
        string ticker,
        [FromQuery] int limit = 10)
    {
        var normalized = (ticker ?? "").Trim().ToUpperInvariant();
        if (normalized.Length == 0) return BadRequest("ticker required");
        var clamped = Math.Clamp(limit, 1, 100);

        // Read from insider_transactions (Edgar Form 4 ingest). Older code
        // read from market_firehose_snapshots — that's the legacy FMP path
        // that ran nightly and went stale within days. Edgar pulls every
        // weekday and is the canonical source now.
        var rows = await db.InsiderTransactions
            .AsNoTracking()
            .Where(t => t.Ticker == normalized)
            .OrderByDescending(t => t.FilingDate)
            .ThenByDescending(t => t.TransactionDate)
            .ThenByDescending(t => t.Id)
            .Take(clamped)
            .ToListAsync();

        return Ok(rows.Select(t => new InsiderActivityItem(
            t.Ticker,
            t.TransactionDate,
            t.FilingDate,
            t.InsiderName,
            t.InsiderTitle,
            t.TransactionCode,
            (double?)t.Shares,
            t.PricePerShare.HasValue ? (double?)t.PricePerShare.Value : null,
            t.TotalValue.HasValue ? (double?)t.TotalValue.Value : null
        )).ToList());
    }

    /// <summary>
    /// Per-ticker Congressional activity feed (Senate + House). Reads
    /// the same market_firehose_snapshots cache as
    /// /market/congress/latest but filtered by ticker. Powers the
    /// "Congressional activity" card on the ticker detail page.
    /// </summary>
    [Authorize]
    [RequiresPlan(PlanType.Pro)]
    [HttpGet("market/congress/{ticker}")]
    public async Task<ActionResult<List<CongressTradeItem>>> GetCongressTradesForTicker(
        string ticker,
        [FromQuery] int limit = 10)
    {
        var normalized = (ticker ?? "").Trim().ToUpperInvariant();
        if (normalized.Length == 0) return BadRequest("ticker required");
        var clamped = Math.Clamp(limit, 1, 100);

        var rows = await db.MarketFirehoseSnapshots
            .AsNoTracking()
            .Where(s => (s.Kind == "senate" || s.Kind == "house") && s.Ticker == normalized)
            .OrderByDescending(s => s.DisclosureDate ?? s.TransactionDate)
            .ThenByDescending(s => s.Id)
            .Take(clamped)
            .ToListAsync();

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

    /// <summary>Manual trigger for the firehose cache — admin-only. Fire-
    /// and-forget so the browser doesn't drop the request mid-fetch
    /// (same pattern as Edgar / short-interest).</summary>
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("admin/firehose/refresh")]
    public IActionResult TriggerFirehoseRefresh(
        [FromServices] Fintrest.Api.Services.Ingestion.FirehoseIngestJob job,
        [FromServices] IHostApplicationLifetime lifetime)
    {
        _ = Task.Run(() => job.RunOnceAsync(lifetime.ApplicationStopping));
        return Accepted(new
        {
            message = "Firehose ingest started — pulls FMP insider + congress feeds, ~30-60s. Check logs.",
        });
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
        var lenses = await GetLensScoresAsync(signals);
        return new SignalListResponse(
            signals.Select(s =>
            {
                var (close, changePct) = prices.GetValueOrDefault(s.StockId);
                subscores.TryGetValue(s.Stock.Ticker, out var sub);
                lenses.TryGetValue(s.Stock.Ticker, out var lens);
                return ToDto(s, close > 0 ? close : null, changePct, sub, lens);
            }).ToList(),
            signals.Count);
    }

    /// <summary>
    /// Phase 2 multi-lens scoring: load Composite + Quality lens scores
    /// from the latest signal_score_history row per ticker. Falls back
    /// to empty when the table doesn't exist (migration 026/029 pending)
    /// so the picks endpoint stays alive even without lens data.
    /// </summary>
    private async Task<Dictionary<string, (double? Composite, double? Quality)>> GetLensScoresAsync(List<Signal> signals)
    {
        if (signals.Count == 0) return new();
        var tickers = signals.Select(s => s.Stock.Ticker).Distinct().ToList();
        try
        {
            var cutoff = DateTime.UtcNow.Date.AddDays(-3);
            var rows = await db.SignalScoreHistory
                .AsNoTracking()
                .Where(h => tickers.Contains(h.Ticker) && h.AsOfDate >= cutoff)
                .Select(h => new { h.Ticker, h.AsOfDate, h.CompositeScore, h.QualityScore })
                .ToListAsync();
            return rows
                .GroupBy(r => r.Ticker)
                .ToDictionary(
                    g => g.Key,
                    g =>
                    {
                        var latest = g.OrderByDescending(r => r.AsOfDate).First();
                        return (
                            (double?)(latest.CompositeScore.HasValue ? (double)latest.CompositeScore.Value : null),
                            (double?)(latest.QualityScore.HasValue ? (double)latest.QualityScore.Value : null));
                    });
        }
        catch (Npgsql.PostgresException pex) when (pex.SqlState == "42P01")
        {
            return new();
        }
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

        // Fetch flat then group in-memory. The EF Core query
        //   GroupBy(t => t.Ticker).Select(g => g.OrderByDescending(...).First())
        // does not translate to PG SQL and throws
        // "EmptyProjectionMember not present in the dictionary". Pulling
        // the raw rows for N tickers (typical N=12) is trivially cheap
        // and groups cleanly in memory.
        var rows = await db.FundamentalSubscores
            .AsNoTracking()
            .Where(f => tickers.Contains(f.Ticker))
            .Select(f => new { f.Ticker, f.AsOfDate, f.QualityScore, f.ProfitabilityScore, f.GrowthScore })
            .ToListAsync();

        return rows
            .GroupBy(r => r.Ticker)
            .ToDictionary(
                g => g.Key,
                g =>
                {
                    var latest = g.OrderByDescending(r => r.AsOfDate).First();
                    return (latest.QualityScore, latest.ProfitabilityScore, latest.GrowthScore);
                });
    }

    private static SignalResponse ToDto(
        Signal s,
        double? currentPrice = null,
        double? changePct = null,
        (double? Quality, double? Profitability, double? Growth) sub = default,
        (double? Composite, double? Quality) lens = default) => new(
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
            GrowthScore: sub.Growth,
            SmartMoneyScore: s.Breakdown.SmartMoneyScore
        ) : null,
        s.CreatedAt,
        CompositeScore: lens.Composite,
        LensQualityScore: lens.Quality
    );
}
