using Fintrest.Api.Core;
using Fintrest.Api.Data;
using Fintrest.Api.DTOs.Watchlists;
using Fintrest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/alerts")]
public class AlertsController(AppDbContext db) : ControllerBase
{
    private async Task<long> GetUserId()
    {
        var id = await User.ResolveUserId(db);
        return id ?? throw new UnauthorizedAccessException();
    }

    [HttpGet]
    public async Task<ActionResult<List<AlertResponse>>> ListAlerts()
    {
        var userId = await GetUserId();
        var alerts = await db.Alerts
            .Include(a => a.Stock)
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(alerts.Select(a =>
            new AlertResponse(a.Id, a.AlertType, a.Channel, a.Active, a.StockId, a.Stock?.Ticker, a.ThresholdJson, a.CreatedAt)
        ).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<AlertResponse>> CreateAlert(AlertCreateRequest request)
    {
        var userId = await GetUserId();

        // Tier cap: Free = 1 active alert, Pro/Elite = unlimited (soft cap 200 for sanity).
        var plan = await db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.Plan)
            .FirstOrDefaultAsync();
        var cap = plan switch
        {
            PlanType.Elite => 500,
            PlanType.Pro => 200,
            _ => 1,  // Free
        };
        var activeCount = await db.Alerts.CountAsync(a => a.UserId == userId && a.Active);
        if (activeCount >= cap)
        {
            return StatusCode(StatusCodes.Status402PaymentRequired, new
            {
                error = "plan_limit_reached",
                plan = plan.ToString().ToLower(),
                cap,
                current = activeCount,
                message = plan == PlanType.Free
                    ? "Free plan is limited to 1 active alert. Upgrade to Pro for unlimited alerts."
                    : "Alert cap reached.",
                upgradeUrl = "/pricing",
            });
        }

        var alert = new Alert
        {
            UserId = userId,
            AlertType = request.AlertType,
            Channel = request.Channel,
            StockId = request.StockId,
            ThresholdJson = request.ThresholdJson,
        };
        db.Alerts.Add(alert);
        await db.SaveChangesAsync();

        // Load stock for ticker
        string? ticker = null;
        if (alert.StockId.HasValue)
        {
            var stock = await db.Stocks.FindAsync(alert.StockId.Value);
            ticker = stock?.Ticker;
        }

        return Created("", new AlertResponse(alert.Id, alert.AlertType, alert.Channel, alert.Active, alert.StockId, ticker, alert.ThresholdJson, alert.CreatedAt));
    }
}
