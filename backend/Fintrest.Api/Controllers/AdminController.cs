using System.Security.Claims;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/v1/admin")]
public class AdminController(AppDbContext db) : ControllerBase
{
    private Guid AdminUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("scan/run")]
    public async Task<IActionResult> TriggerScan()
    {
        var scan = new ScanRun { Status = "running", StrategyVersion = "v1.0" };
        db.ScanRuns.Add(scan);

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            AdminUserId = AdminUserId,
            Action = "trigger_scan",
            ResourceType = "scan_run",
            ResourceId = scan.Id.ToString(),
        });

        await db.SaveChangesAsync();
        return Ok(new { ScanRunId = scan.Id, Status = "running" });
    }

    [HttpGet("scan-runs")]
    public async Task<IActionResult> ListScanRuns([FromQuery] int limit = 20)
    {
        var scans = await db.ScanRuns
            .OrderByDescending(s => s.StartedAt)
            .Take(limit)
            .Select(s => new
            {
                s.Id, s.StartedAt, s.CompletedAt, s.Status,
                s.SignalsGenerated, s.DurationMs, s.StrategyVersion
            })
            .ToListAsync();

        return Ok(scans);
    }

    [HttpPost("signals/recompute/{signalId}")]
    public async Task<IActionResult> RecomputeSignal(Guid signalId)
    {
        var signal = await db.Signals.FindAsync(signalId);
        if (signal is null) return NotFound(new { message = "Signal not found" });

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            AdminUserId = AdminUserId,
            Action = "recompute_signal",
            ResourceType = "signal",
            ResourceId = signalId.ToString(),
        });
        await db.SaveChangesAsync();

        // TODO: Dispatch to scoring engine worker
        return Ok(new { SignalId = signalId, Status = "recompute_queued" });
    }

    [HttpGet("provider-health")]
    public IActionResult ProviderHealth()
    {
        return Ok(new
        {
            Providers = new[]
            {
                new { Name = "Polygon", Status = "healthy", LatencyMs = 45 },
                new { Name = "Financial Modeling Prep", Status = "healthy", LatencyMs = 120 },
                new { Name = "Finnhub", Status = "healthy", LatencyMs = 89 },
            },
            CheckedAt = DateTime.UtcNow,
        });
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> ListAuditLogs([FromQuery] int limit = 50)
    {
        var logs = await db.AdminAuditLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(limit)
            .Select(l => new
            {
                l.Id, l.AdminUserId, l.Action, l.ResourceType,
                l.ResourceId, l.Details, l.CreatedAt
            })
            .ToListAsync();

        return Ok(logs);
    }
}
