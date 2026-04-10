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
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(alerts.Select(a =>
            new AlertResponse(a.Id, a.AlertType, a.Channel, a.Active, a.StockId, a.ThresholdJson, a.CreatedAt)
        ).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<AlertResponse>> CreateAlert(AlertCreateRequest request)
    {
        var userId = await GetUserId();
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

        return Created("", new AlertResponse(alert.Id, alert.AlertType, alert.Channel, alert.Active, alert.StockId, alert.ThresholdJson, alert.CreatedAt));
    }
}
