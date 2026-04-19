using Fintrest.Api.Core;
using Fintrest.Api.Data;
using Fintrest.Api.DTOs.Portfolio;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Portfolio;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Controllers;

[Authorize]
[RequiresPlan(Models.PlanType.Pro)]  // Portfolio features are Pro tier
[ApiController]
[Route("api/v1/portfolios")]
public class PortfolioController(
    AppDbContext db,
    PortfolioService portfolioService,
    PortfolioAiAdvisor advisor,
    RiskAnalytics riskAnalytics,
    PortfolioImporter importer,
    ClaudeFinancialAdvisor claudeAdvisor) : ControllerBase
{
    private async Task<long> GetUserId()
    {
        var id = await User.ResolveUserId(db);
        return id ?? throw new UnauthorizedAccessException();
    }

    /// <summary>
    /// Download a canonical CSV template users can fill in by hand. Minimal columns —
    /// just Symbol, Quantity, AvgCost. Works across every broker; paste holdings + upload.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("/api/v1/portfolio-template.csv")]
    public IActionResult DownloadTemplate()
    {
        const string content = "Symbol,Quantity,AvgCost\nAAPL,10,175.50\nNVDA,5,460.00\nMSFT,8,405.25\n";
        return File(
            System.Text.Encoding.UTF8.GetBytes(content),
            "text/csv",
            "fintrest-portfolio-template.csv");
    }

    /// <summary>List all portfolios for the authenticated user.</summary>
    [HttpGet]
    public async Task<ActionResult<List<PortfolioResponse>>> ListPortfolios()
    {
        var userId = await GetUserId();
        var portfolios = await portfolioService.GetPortfolios(userId);

        var responses = new List<PortfolioResponse>();
        foreach (var p in portfolios)
        {
            var investedValue = p.Holdings.Sum(h => h.CurrentValue);
            var totalValue = p.CashBalance + investedValue;

            var latestSnapshot = await db.Set<Models.PortfolioSnapshot>()
                .Where(s => s.PortfolioId == p.Id)
                .OrderByDescending(s => s.Date)
                .FirstOrDefaultAsync();

            responses.Add(new PortfolioResponse(
                p.Id, p.Name, p.Strategy, p.CashBalance, totalValue,
                latestSnapshot?.DailyReturnPct ?? 0,
                p.Holdings.Count, p.CreatedAt
            ));
        }

        return Ok(responses);
    }

    /// <summary>Create a new portfolio.</summary>
    [HttpPost]
    public async Task<ActionResult<PortfolioResponse>> CreatePortfolio(PortfolioCreateRequest request)
    {
        var userId = await GetUserId();

        // Tier cap: Free = 1 portfolio, Pro = 3, Elite = unlimited.
        var plan = await db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.Plan)
            .FirstOrDefaultAsync();
        var cap = plan switch
        {
            PlanType.Elite => int.MaxValue,
            PlanType.Pro => 3,
            _ => 1,
        };
        var existing = await db.Portfolios.CountAsync(p => p.UserId == userId);
        if (existing >= cap)
        {
            return StatusCode(StatusCodes.Status402PaymentRequired, new
            {
                error = "plan_limit_reached",
                plan = plan.ToString().ToLower(),
                cap,
                current = existing,
                message = plan switch
                {
                    PlanType.Free => "Free plan is limited to 1 portfolio. Upgrade to Pro for 3 portfolios.",
                    PlanType.Pro => "Pro plan is limited to 3 portfolios. Upgrade to Elite for unlimited.",
                    _ => "Portfolio cap reached.",
                },
                upgradeUrl = "/pricing",
            });
        }

        var portfolio = await portfolioService.CreatePortfolio(userId, request);
        var response = new PortfolioResponse(
            portfolio.Id, portfolio.Name, portfolio.Strategy, portfolio.CashBalance,
            portfolio.CashBalance, 0, 0, portfolio.CreatedAt
        );
        return Created($"/api/v1/portfolios/{portfolio.Id}", response);
    }

    /// <summary>Get a single portfolio with summary.</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<PortfolioResponse>> GetPortfolio(long id)
    {
        var userId = await GetUserId();
        var portfolio = await portfolioService.GetPortfolio(userId, id);
        if (portfolio is null) return NotFound(new { message = "Portfolio not found" });

        var investedValue = portfolio.Holdings.Sum(h => h.CurrentValue);
        var totalValue = portfolio.CashBalance + investedValue;

        var latestSnapshot = await db.Set<Models.PortfolioSnapshot>()
            .Where(s => s.PortfolioId == id)
            .OrderByDescending(s => s.Date)
            .FirstOrDefaultAsync();

        return Ok(new PortfolioResponse(
            portfolio.Id, portfolio.Name, portfolio.Strategy, portfolio.CashBalance,
            totalValue, latestSnapshot?.DailyReturnPct ?? 0,
            portfolio.Holdings.Count, portfolio.CreatedAt
        ));
    }

    /// <summary>Get holdings with P&amp;L and signal scores.</summary>
    [HttpGet("{id}/holdings")]
    public async Task<ActionResult<List<HoldingResponse>>> GetHoldings(long id)
    {
        var userId = await GetUserId();
        var portfolio = await db.Portfolios
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (portfolio is null) return NotFound(new { message = "Portfolio not found" });

        var holdings = await portfolioService.GetHoldings(userId, id);

        // Batch-load recent bars once so we can compute BOTH the fresh current price and
        // today's % move without N+1 lookups. We don't want to trust `holding.CurrentPrice`
        // from the DB — it's only refreshed by the 6:30 AM cron, so any holding added
        // mid-day shows a stale price until the next run.
        var stockIds = holdings.Select(h => h.StockId).Distinct().ToList();
        var latestPriceByStock = new Dictionary<long, double>();
        var dayChangeByStock = new Dictionary<long, double>();
        if (stockIds.Count > 0)
        {
            var cutoff = DateTime.UtcNow.AddDays(-14);
            var recentBars = await db.MarketData
                .Where(m => stockIds.Contains(m.StockId) && m.Ts >= cutoff)
                .Select(m => new { m.StockId, m.Ts, m.Close, m.PrevClose })
                .ToListAsync();

            foreach (var grp in recentBars.GroupBy(b => b.StockId))
            {
                var sorted = grp.OrderByDescending(b => b.Ts).Take(2).ToList();
                var latest = sorted[0];
                latestPriceByStock[grp.Key] = latest.Close;

                double? prev = latest.PrevClose;
                if (prev is null or 0 && sorted.Count > 1) prev = sorted[1].Close;
                if (prev is > 0)
                    dayChangeByStock[grp.Key] = Math.Round((latest.Close - prev.Value) / prev.Value * 100, 2);
            }
        }

        var responses = new List<HoldingResponse>();
        foreach (var h in holdings)
        {
            var signalScore = await portfolioService.GetLatestSignalScore(h.StockId);
            double? dayChange = dayChangeByStock.TryGetValue(h.StockId, out var d) ? d : null;

            // Prefer the fresh price from the latest bar. Fall back to the persisted
            // CurrentPrice only if we have no market data for this ticker at all.
            double currentPrice = latestPriceByStock.TryGetValue(h.StockId, out var live) && live > 0
                ? live
                : h.CurrentPrice;
            double currentValue    = h.Quantity * currentPrice;
            double unrealizedPnl   = currentValue - h.Quantity * h.AvgCost;
            double unrealizedPnlPct = h.AvgCost > 0
                ? (currentPrice - h.AvgCost) / h.AvgCost * 100
                : 0;

            responses.Add(new HoldingResponse(
                h.Id, h.StockId, h.Stock.Ticker, h.Stock.Name,
                h.Quantity, h.AvgCost, currentPrice, currentValue,
                unrealizedPnl, unrealizedPnlPct, signalScore, dayChange
            ));
        }

        return Ok(responses);
    }

    /// <summary>Add a buy/sell/dividend transaction.</summary>
    [HttpPost("{id}/transactions")]
    public async Task<ActionResult<TransactionResponse>> AddTransaction(long id, TransactionRequest request)
    {
        try
        {
            var userId = await GetUserId();
            var transaction = await portfolioService.AddTransaction(userId, id, request);
            return Created($"/api/v1/portfolios/{id}/transactions", new TransactionResponse(
                transaction.Id, transaction.Stock.Ticker, transaction.Type,
                transaction.Quantity, transaction.Price, transaction.Fees,
                transaction.Total, transaction.ExecutedAt
            ));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Get transaction history.</summary>
    [HttpGet("{id}/transactions")]
    public async Task<ActionResult<List<TransactionResponse>>> GetTransactions(long id)
    {
        try
        {
            var userId = await GetUserId();
            var transactions = await portfolioService.GetTransactions(userId, id);
            return Ok(transactions.Select(t => new TransactionResponse(
                t.Id, t.Stock.Ticker, t.Type, t.Quantity, t.Price,
                t.Fees, t.Total, t.ExecutedAt
            )).ToList());
        }
        catch (InvalidOperationException)
        {
            return NotFound(new { message = "Portfolio not found" });
        }
    }

    /// <summary>Get historical snapshots with optional range filter.</summary>
    [HttpGet("{id}/snapshots")]
    public async Task<ActionResult<List<SnapshotResponse>>> GetSnapshots(long id, [FromQuery] string range = "3m")
    {
        var _uid = await GetUserId();
        var portfolio = await db.Portfolios
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == _uid);
        if (portfolio is null) return NotFound(new { message = "Portfolio not found" });

        var fromDate = range.ToLowerInvariant() switch
        {
            "1w" => DateTime.UtcNow.AddDays(-7),
            "1m" => DateTime.UtcNow.AddMonths(-1),
            "3m" => DateTime.UtcNow.AddMonths(-3),
            "6m" => DateTime.UtcNow.AddMonths(-6),
            "1y" => DateTime.UtcNow.AddYears(-1),
            "all" => DateTime.MinValue,
            _ => DateTime.UtcNow.AddMonths(-3),
        };

        var snapshots = await db.Set<Models.PortfolioSnapshot>()
            .Where(s => s.PortfolioId == id && s.Date >= fromDate)
            .OrderBy(s => s.Date)
            .ToListAsync();

        return Ok(snapshots.Select(s => new SnapshotResponse(
            s.Date, s.TotalValue, s.CashValue, s.InvestedValue,
            s.DailyReturnPct, s.CumulativeReturnPct
        )).ToList());
    }

    /// <summary>Get risk metrics and sector allocation analytics.</summary>
    [HttpGet("{id}/analytics")]
    public async Task<ActionResult<PortfolioAnalyticsResponse>> GetAnalytics(long id)
    {
        var _uid = await GetUserId();
        var portfolio = await db.Portfolios
            .Include(p => p.Holdings).ThenInclude(h => h.Stock)
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == _uid);
        if (portfolio is null) return NotFound(new { message = "Portfolio not found" });

        var holdings = portfolio.Holdings.ToList();

        // Prefer fresh on-demand metrics (90-day window from market_data × holdings)
        // over the cron-persisted row, which may be days stale or entirely absent for
        // portfolios that haven't cycled through the daily job yet.
        var riskResponse = await ComputeRiskMetricsAsync(holdings, windowDays: 90);
        if (riskResponse is null)
        {
            // Fallback to last persisted metric if on-demand compute had too little data
            // (tiny portfolio, missing bars).
            var latestRisk = await db.Set<Models.PortfolioRiskMetric>()
                .Where(r => r.PortfolioId == id)
                .OrderByDescending(r => r.Date)
                .FirstOrDefaultAsync();
            if (latestRisk is not null)
            {
                riskResponse = new RiskMetricsResponse(
                    latestRisk.Date, latestRisk.SharpeRatio, latestRisk.SortinoRatio,
                    latestRisk.MaxDrawdown, latestRisk.Beta, latestRisk.Var95,
                    latestRisk.Volatility, latestRisk.TotalReturn);
            }
        }
        var sectorAllocation = riskAnalytics.GetSectorAllocation(holdings);

        var topHoldings = holdings
            .OrderByDescending(h => h.CurrentValue)
            .Take(5)
            .Select(h => new HoldingResponse(
                h.Id, h.StockId, h.Stock.Ticker, h.Stock.Name,
                h.Quantity, h.AvgCost, h.CurrentPrice, h.CurrentValue,
                h.UnrealizedPnl, h.UnrealizedPnlPct, null
            )).ToList();

        // Calculate health score from latest advisor run or default
        var latestRecommendation = await db.Set<Models.PortfolioAiRecommendation>()
            .Where(r => r.PortfolioId == id)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();

        var totalValue = portfolio.CashBalance + holdings.Sum(h => h.CurrentValue);
        var healthScore = latestRecommendation is not null ? 70.0 : 50.0; // Simplified; full score comes from advisor

        return Ok(new PortfolioAnalyticsResponse(riskResponse, sectorAllocation, topHoldings, healthScore));
    }

    /// <summary>
    /// Return decomposition — total return broken into unrealized / realized /
    /// dividend sources plus annualized CAGR. Drives the pillar-#1 header card.
    /// </summary>
    [HttpGet("{id}/returns")]
    public async Task<ActionResult<ReturnBreakdownResponse>> GetReturnBreakdown(long id)
    {
        var userId = await GetUserId();
        var portfolio = await db.Portfolios
            .Include(p => p.Holdings).ThenInclude(h => h.Stock)
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (portfolio is null) return NotFound(new { message = "Portfolio not found" });

        // 1. Live holdings value — pull the latest market_data bar for each stock, same
        //    pattern as GetHoldings above so the number matches what's on screen.
        var stockIds = portfolio.Holdings.Select(h => h.StockId).Distinct().ToList();
        var latestPriceByStock = new Dictionary<long, double>();
        if (stockIds.Count > 0)
        {
            var cutoff = DateTime.UtcNow.AddDays(-14);
            var bars = await db.MarketData
                .Where(m => stockIds.Contains(m.StockId) && m.Ts >= cutoff)
                .Select(m => new { m.StockId, m.Ts, m.Close })
                .ToListAsync();
            foreach (var grp in bars.GroupBy(b => b.StockId))
                latestPriceByStock[grp.Key] = grp.OrderByDescending(b => b.Ts).First().Close;
        }

        double currentValue = 0;
        double heldCostBasis = 0;
        foreach (var h in portfolio.Holdings)
        {
            var price = latestPriceByStock.TryGetValue(h.StockId, out var live) && live > 0
                ? live
                : h.CurrentPrice;
            currentValue  += h.Quantity * price;
            heldCostBasis += h.Quantity * h.AvgCost;
        }

        // 2. Walk transactions to split invested $ vs proceeds vs dividends.
        var txns = await db.Set<Models.PortfolioTransaction>()
            .Where(t => t.PortfolioId == id)
            .OrderBy(t => t.ExecutedAt)
            .ToListAsync();

        double grossInvested  = 0; // sum of BUY totals (money in)
        double grossProceeds  = 0; // sum of SELL totals (money out from sales)
        double dividends      = 0; // sum of DIVIDEND totals (cash from dividends)
        double realizedPnl    = 0; // proceeds - cost basis of the shares sold
        // Per-stock running avg cost to compute realized PnL on each SELL.
        var avgCostByStock = new Dictionary<long, (double qty, double costBasis)>();

        foreach (var t in txns)
        {
            var type = (t.Type ?? "").Trim().ToUpperInvariant();
            switch (type)
            {
                case "BUY":
                    grossInvested += t.Total;
                    var cur = avgCostByStock.GetValueOrDefault(t.StockId);
                    avgCostByStock[t.StockId] = (cur.qty + t.Quantity, cur.costBasis + t.Total);
                    break;

                case "SELL":
                    grossProceeds += t.Total;
                    var lot = avgCostByStock.GetValueOrDefault(t.StockId);
                    if (lot.qty > 0)
                    {
                        var avgCost    = lot.costBasis / lot.qty;
                        var costOfSold = avgCost * t.Quantity;
                        realizedPnl += t.Total - costOfSold;
                        var remaining = lot.qty - t.Quantity;
                        avgCostByStock[t.StockId] = remaining > 0
                            ? (remaining, lot.costBasis - costOfSold)
                            : (0, 0);
                    }
                    break;

                case "DIVIDEND":
                    dividends += t.Total;
                    break;
            }
        }

        var unrealizedPnl  = currentValue - heldCostBasis;
        var costBasisAllTime = grossInvested; // lifetime money put in
        var totalReturn    = unrealizedPnl + realizedPnl + dividends;
        var totalReturnPct = costBasisAllTime > 0
            ? totalReturn / costBasisAllTime * 100
            : 0;

        // CAGR: (1 + r)^(1/years) - 1. Only meaningful with ≥ 30 days of history.
        var inceptionDate = txns.Count > 0 ? txns[0].ExecutedAt : (DateTime?)null;
        var daysSinceInception = inceptionDate is null ? 0
            : Math.Max(0, (int)(DateTime.UtcNow - inceptionDate.Value).TotalDays);
        double? cagr = null;
        if (daysSinceInception >= 30 && costBasisAllTime > 0)
        {
            var years = daysSinceInception / 365.25;
            var ratio = (totalReturn + costBasisAllTime) / costBasisAllTime;
            if (ratio > 0) cagr = (Math.Pow(ratio, 1.0 / years) - 1) * 100;
        }

        return Ok(new ReturnBreakdownResponse(
            CostBasis:           costBasisAllTime,
            CurrentValue:        currentValue,
            UnrealizedPnl:       unrealizedPnl,
            RealizedPnl:         realizedPnl,
            DividendsReceived:   dividends,
            TotalReturn:         totalReturn,
            TotalReturnPct:      totalReturnPct,
            AnnualizedReturnPct: cagr,
            InceptionDate:       inceptionDate,
            DaysSinceInception:  daysSinceInception
        ));
    }

    /// <summary>Get AI advisor recommendations and alerts.</summary>
    [HttpGet("{id}/advisor")]
    public async Task<ActionResult<AdvisorResponse>> GetAdvisor(long id)
    {
        var _uid = await GetUserId();
        var portfolio = await db.Portfolios
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == _uid);
        if (portfolio is null) return NotFound(new { message = "Portfolio not found" });

        try
        {
            var result = await advisor.AnalyzePortfolio(id);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Apply or dismiss a recommendation.</summary>
    [HttpPost("{id}/advisor/apply/{recommendationId}")]
    public async Task<IActionResult> ApplyRecommendation(long id, long recommendationId, [FromQuery] string action = "APPLIED")
    {
        var _uid = await GetUserId();
        var portfolio = await db.Portfolios
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == _uid);
        if (portfolio is null) return NotFound(new { message = "Portfolio not found" });

        var recommendation = await db.Set<Models.PortfolioAiRecommendation>()
            .FirstOrDefaultAsync(r => r.Id == recommendationId && r.PortfolioId == id);
        if (recommendation is null) return NotFound(new { message = "Recommendation not found" });

        var status = action.ToUpperInvariant();
        if (status is not ("APPLIED" or "DISMISSED"))
            return BadRequest(new { message = "Action must be APPLIED or DISMISSED" });

        recommendation.Status = status;
        await db.SaveChangesAsync();

        return Ok(new { recommendation.Id, recommendation.Status });
    }

    // --- Portfolio Import ---

    /// <summary>
    /// Upload a CSV file to create a portfolio.
    /// Supports Robinhood, Schwab, Fidelity, and generic CSV formats.
    /// Columns auto-detected: ticker/symbol, quantity/shares, cost/avg cost
    /// </summary>
    [HttpPost("import/csv")]
    [RequestSizeLimit(10_000_000)] // 10MB max
    public async Task<IActionResult> ImportCsv(
        IFormFile file,
        [FromQuery] string name = "Imported Portfolio",
        [FromQuery] double? cash = null,
        CancellationToken ct = default)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded" });

        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase) &&
            !file.FileName.EndsWith(".txt", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Only CSV and TXT files are supported" });

        using var stream = file.OpenReadStream();
        var result = await importer.ImportFromCsvAsync(await GetUserId(), name, stream, cash, ct);

        return Ok(result);
    }

    /// <summary>
    /// Import portfolio from text — paste holdings directly.
    /// Format: one per line, "AAPL 100 150.00" or "AAPL,100,150.00"
    /// </summary>
    [HttpPost("import/text")]
    public async Task<IActionResult> ImportText(
        [FromBody] ImportTextRequest request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Holdings))
            return BadRequest(new { message = "No holdings provided" });

        var result = await importer.ImportFromTextAsync(
            await GetUserId(), request.Name ?? "Imported Portfolio", request.Holdings, request.Cash, ct);

        return Ok(result);
    }

    /// <summary>
    /// Import and immediately analyze — upload + AI advisor in one call.
    /// </summary>
    [HttpPost("import/analyze")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> ImportAndAnalyze(
        IFormFile file,
        [FromQuery] string name = "Imported Portfolio",
        [FromQuery] double? cash = null,
        CancellationToken ct = default)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded" });

        // Step 1: Import
        using var stream = file.OpenReadStream();
        var importResult = await importer.ImportFromCsvAsync(await GetUserId(), name, stream, cash, ct);

        // Step 2: Run AI analysis
        AdvisorResponse? analysis = null;
        try
        {
            analysis = await advisor.AnalyzePortfolio(importResult.PortfolioId);
        }
        catch (Exception ex)
        {
            // Analysis is best-effort
            return Ok(new { Import = importResult, Analysis = (object?)null, AnalysisError = ex.Message });
        }

        return Ok(new { Import = importResult, Analysis = analysis });
    }

    /// <summary>
    /// Deep AI analysis powered by Claude.
    /// Analyzes portfolio composition, signal alignment, risk, and generates
    /// natural language recommendations.
    /// </summary>
    [HttpGet("{id}/ai-analysis")]
    public async Task<IActionResult> GetAiAnalysis(long id, CancellationToken ct)
    {
        var _uid = await GetUserId();
        var portfolio = await db.Portfolios
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == _uid, ct);
        if (portfolio is null) return NotFound(new { message = "Portfolio not found" });

        var analysis = await claudeAdvisor.AnalyzePortfolioAsync(id, ct);
        return Ok(analysis);
    }

    /// <summary>
    /// Compute Sharpe / Sortino / drawdown / beta / VaR / volatility on-demand from
    /// market_data. Rebuilds the portfolio value series day-by-day using current
    /// holdings × each day's closing price (so the returned metrics reflect the
    /// CURRENT book — historical rebalancing is ignored on purpose; the user wants
    /// "how risky is what I'm holding right now"). Beta is measured against SPY.
    /// Returns null when there's too little data (&lt; 20 trading days) so the UI
    /// shows an empty state rather than misleading numbers.
    /// </summary>
    private async Task<RiskMetricsResponse?> ComputeRiskMetricsAsync(
        List<Models.PortfolioHolding> holdings, int windowDays)
    {
        if (holdings.Count == 0) return null;

        var stockIds = holdings.Select(h => h.StockId).Distinct().ToList();
        var fromDate = DateTime.UtcNow.AddDays(-windowDays);

        var bars = await db.MarketData
            .Where(m => stockIds.Contains(m.StockId) && m.Ts >= fromDate)
            .Select(m => new { m.StockId, m.Ts, m.Close })
            .ToListAsync();

        // Pivot: barsByDay[date][stockId] = close.
        var barsByDay = bars
            .GroupBy(b => b.Ts.Date)
            .OrderBy(g => g.Key)
            .Select(g => new
            {
                Date = g.Key,
                Closes = g.ToDictionary(b => b.StockId, b => b.Close),
            })
            .ToList();

        if (barsByDay.Count < 20) return null;

        // Portfolio value per day = sum(qty × close); skip days where any holding's
        // bar is missing so we don't create phantom daily returns.
        var portfolioValues = new List<double>();
        foreach (var day in barsByDay)
        {
            double value = 0;
            bool complete = true;
            foreach (var h in holdings)
            {
                if (!day.Closes.TryGetValue(h.StockId, out var close))
                {
                    complete = false;
                    break;
                }
                value += h.Quantity * close;
            }
            if (complete && value > 0) portfolioValues.Add(value);
        }
        if (portfolioValues.Count < 20) return null;

        // Daily log-return-ish (simple pct return). Array of length N-1.
        var dailyReturns = new List<double>();
        for (int i = 1; i < portfolioValues.Count; i++)
        {
            var prev = portfolioValues[i - 1];
            if (prev > 0) dailyReturns.Add((portfolioValues[i] - prev) / prev);
        }

        // Beta vs SPY over the same window, aligned on dates.
        List<double>? spyReturns = null;
        var spyStock = await db.Stocks.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Ticker == "SPY");
        if (spyStock is not null)
        {
            var spyBars = await db.MarketData
                .Where(m => m.StockId == spyStock.Id && m.Ts >= fromDate)
                .OrderBy(m => m.Ts)
                .Select(m => m.Close)
                .ToListAsync();
            if (spyBars.Count >= 2)
            {
                spyReturns = new List<double>();
                for (int i = 1; i < spyBars.Count; i++)
                {
                    var prev = spyBars[i - 1];
                    if (prev > 0) spyReturns.Add((spyBars[i] - prev) / prev);
                }
            }
        }

        var sharpe     = riskAnalytics.CalculateSharpeRatio(dailyReturns);
        var sortino    = riskAnalytics.CalculateSortinoRatio(dailyReturns);
        var maxDd      = riskAnalytics.CalculateMaxDrawdown(portfolioValues);
        var var95      = riskAnalytics.CalculateVar95(dailyReturns);
        var volatility = riskAnalytics.CalculateVolatility(dailyReturns);
        var beta       = spyReturns is not null
            ? riskAnalytics.CalculateBeta(dailyReturns, spyReturns)
            : null;

        // Total return over the window — for the UI, same convention as Sharpe numerator.
        var totalRet = portfolioValues[^1] / portfolioValues[0] - 1;

        return new RiskMetricsResponse(
            Date:          DateTime.UtcNow.Date,
            SharpeRatio:   sharpe,
            SortinoRatio:  sortino,
            MaxDrawdown:   maxDd,
            Beta:          beta,
            Var95:         var95,
            Volatility:    volatility,
            TotalReturn:   totalRet);
    }
}

public record ImportTextRequest(string Holdings, string? Name = null, double? Cash = null);
