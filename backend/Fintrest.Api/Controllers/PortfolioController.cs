using System.Security.Claims;
using Fintrest.Api.Data;
using Fintrest.Api.DTOs.Portfolio;
using Fintrest.Api.Services.Portfolio;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/portfolios")]
public class PortfolioController(
    AppDbContext db,
    PortfolioService portfolioService,
    PortfolioAiAdvisor advisor,
    RiskAnalytics riskAnalytics) : ControllerBase
{
    private long UserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>List all portfolios for the authenticated user.</summary>
    [HttpGet]
    public async Task<ActionResult<List<PortfolioResponse>>> ListPortfolios()
    {
        var portfolios = await portfolioService.GetPortfolios(UserId);

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
        var portfolio = await portfolioService.CreatePortfolio(UserId, request);
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
        var portfolio = await portfolioService.GetPortfolio(UserId, id);
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
        var portfolio = await db.Portfolios
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == UserId);
        if (portfolio is null) return NotFound(new { message = "Portfolio not found" });

        var holdings = await portfolioService.GetHoldings(UserId, id);

        var responses = new List<HoldingResponse>();
        foreach (var h in holdings)
        {
            var signalScore = await portfolioService.GetLatestSignalScore(h.StockId);
            responses.Add(new HoldingResponse(
                h.Id, h.StockId, h.Stock.Ticker, h.Stock.Name,
                h.Quantity, h.AvgCost, h.CurrentPrice, h.CurrentValue,
                h.UnrealizedPnl, h.UnrealizedPnlPct, signalScore
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
            var transaction = await portfolioService.AddTransaction(UserId, id, request);
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
            var transactions = await portfolioService.GetTransactions(UserId, id);
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
        var portfolio = await db.Portfolios
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == UserId);
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
        var portfolio = await db.Portfolios
            .Include(p => p.Holdings).ThenInclude(h => h.Stock)
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == UserId);
        if (portfolio is null) return NotFound(new { message = "Portfolio not found" });

        var latestRisk = await db.Set<Models.PortfolioRiskMetric>()
            .Where(r => r.PortfolioId == id)
            .OrderByDescending(r => r.Date)
            .FirstOrDefaultAsync();

        var riskResponse = latestRisk is not null
            ? new RiskMetricsResponse(
                latestRisk.Date, latestRisk.SharpeRatio, latestRisk.SortinoRatio,
                latestRisk.MaxDrawdown, latestRisk.Beta, latestRisk.Var95,
                latestRisk.Volatility, latestRisk.TotalReturn)
            : null;

        var holdings = portfolio.Holdings.ToList();
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

    /// <summary>Get AI advisor recommendations and alerts.</summary>
    [HttpGet("{id}/advisor")]
    public async Task<ActionResult<AdvisorResponse>> GetAdvisor(long id)
    {
        var portfolio = await db.Portfolios
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == UserId);
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
        var portfolio = await db.Portfolios
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == UserId);
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
}
