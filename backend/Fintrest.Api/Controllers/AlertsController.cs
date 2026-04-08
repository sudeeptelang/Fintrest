using System.Security.Claims;
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
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<List<AlertResponse>>> ListAlerts()
    {
        var alerts = await db.Alerts
            .Where(a => a.UserId == UserId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(alerts.Select(a =>
            new AlertResponse(a.Id, a.AlertType, a.Channel, a.IsActive, a.Config, a.CreatedAt)
        ).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<AlertResponse>> CreateAlert(AlertCreateRequest request)
    {
        var alert = new Alert
        {
            UserId = UserId,
            AlertType = request.AlertType,
            Channel = request.Channel,
            Config = request.Config,
        };
        db.Alerts.Add(alert);
        await db.SaveChangesAsync();

        return Created("", new AlertResponse(alert.Id, alert.AlertType, alert.Channel, alert.IsActive, alert.Config, alert.CreatedAt));
    }
}
