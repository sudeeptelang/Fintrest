using System.Security.Claims;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Ingestion;
using Fintrest.Api.Services.Pipeline;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/v1/admin")]
public class AdminController(AppDbContext db, ScanOrchestrator scanner, DataIngestionService ingestion) : ControllerBase
{
    private long AdminUserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("scan/run")]
    public async Task<IActionResult> TriggerScan(CancellationToken ct)
    {
        // Audit log
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "trigger_scan",
            EntityType = "scan_run",
        });
        await db.SaveChangesAsync(ct);

        // Run the full scoring pipeline
        var result = await scanner.RunScanAsync(ct);

        return Ok(new
        {
            result.ScanRunId,
            result.SignalsGenerated,
            result.DurationMs,
            TopPicks = result.TopSignals.Take(5).Select(s => new
            {
                s.Ticker,
                s.Name,
                Score = Math.Round(s.ScoreTotal, 1),
                s.SignalType,
                s.EntryLow,
                s.EntryHigh,
                s.StopLoss,
                s.TargetLow,
                s.TargetHigh,
                s.RiskRewardRatio,
                Explanation = s.Explanation.Summary,
            }),
        });
    }

    [HttpGet("scan-runs")]
    public async Task<IActionResult> ListScanRuns([FromQuery] int limit = 20)
    {
        var scans = await db.ScanRuns
            .OrderByDescending(s => s.StartedAt)
            .Take(limit)
            .Select(s => new
            {
                s.Id, s.RunType, s.MarketSession, s.StartedAt, s.CompletedAt, s.Status,
                s.UniverseSize, s.SignalsGenerated, s.StrategyVersion
            })
            .ToListAsync();

        return Ok(scans);
    }

    [HttpPost("signals/recompute/{signalId}")]
    public async Task<IActionResult> RecomputeSignal(long signalId, CancellationToken ct)
    {
        var signal = await db.Signals
            .Include(s => s.Stock)
            .FirstOrDefaultAsync(s => s.Id == signalId, ct);
        if (signal is null) return NotFound(new { message = "Signal not found" });

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "recompute_signal",
            EntityType = "signal",
            EntityId = signalId,
        });
        await db.SaveChangesAsync(ct);

        return Ok(new { SignalId = signalId, Status = "recompute_queued" });
    }

    /// <summary>
    /// Single-blob dashboard of nightly-job health. Answers "did today's scan
    /// run, when did the last briefing fire, is any upstream provider red,
    /// what should I be worried about?"
    ///
    /// The heavy lifting lives in <c>SystemHealthService</c> so the daily
    /// health email (<c>DailyHealthEmailJob</c>) produces the same view.
    /// </summary>
    [HttpGet("system-health")]
    public async Task<IActionResult> SystemHealth([FromServices] Fintrest.Api.Services.Health.SystemHealthService health, CancellationToken ct)
    {
        var report = await health.GatherAsync(ct);
        return Ok(report);
    }

    /// <summary>
    /// Fire the daily health email on demand — useful for verifying the
    /// template + recipient config without waiting for the 7:00 AM ET slot.
    /// </summary>
    /// <summary>
    /// Compute + persist Q/P/G sub-scores for today's as-of-date across the
    /// active universe. §14.1 — manual trigger until the nightly job lands.
    /// </summary>
    [HttpPost("fundamentals/subscores/recompute")]
    public async Task<IActionResult> RecomputeFundamentalSubscores(
        [FromServices] Fintrest.Api.Services.Scoring.FundamentalSubscoreService svc,
        CancellationToken ct)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "recompute_fundamental_subscores",
            EntityType = "fundamental_subscore",
        });
        await db.SaveChangesAsync(ct);

        var etNow = TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow,
            TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time"));
        var summary = await svc.ComputeAndStoreAsync(DateOnly.FromDateTime(etNow), ct);
        return Ok(summary);
    }

    /// <summary>
    /// Backfill / recompute the audit-log outcome table. Walks every open
    /// signal forward through market data and writes target_hit / stop_hit /
    /// horizon_expired rows into performance_tracking. Idempotent — already-
    /// closed signals are skipped. Safe to run any time for a catch-up.
    /// </summary>
    [HttpPost("audit-log/recompute-outcomes")]
    public async Task<IActionResult> RecomputeSignalOutcomes(
        [FromServices] Fintrest.Api.Services.Performance.SignalOutcomeJob job,
        CancellationToken ct)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "recompute_signal_outcomes",
            EntityType = "performance_tracking",
        });
        await db.SaveChangesAsync(ct);

        var summary = await job.RunOnceAsync(ct);
        return Ok(summary);
    }

    /// <summary>
    /// Manually fire one pass of the user-defined price/target/stop/volume
    /// alert evaluator. Useful during off-hours or for smoke-testing a new
    /// alert condition. Idempotent within a single tick: already-deactivated
    /// alerts are skipped.
    /// </summary>
    [HttpPost("alerts/evaluate")]
    public async Task<IActionResult> EvaluateAlerts(
        [FromServices] Fintrest.Api.Services.Email.AlertEvaluator evaluator,
        CancellationToken ct)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "evaluate_user_alerts",
            EntityType = "alerts",
        });
        await db.SaveChangesAsync(ct);

        var result = await evaluator.RunOnceAsync(ct);
        return Ok(result);
    }

    [HttpPost("system-health/send-email")]
    public async Task<IActionResult> SendHealthEmail([FromServices] Fintrest.Api.Services.Health.DailyHealthEmailJob job, CancellationToken ct)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "trigger_health_email",
            EntityType = "health",
        });
        await db.SaveChangesAsync(ct);

        var outcome = await job.SendOnceAsync(ct);
        return Ok(new { outcome });
    }

    [HttpGet("provider-health")]
    public async Task<IActionResult> ProviderHealth()
    {
        var records = await db.ProviderHealth
            .OrderByDescending(p => p.CheckedAt)
            .Take(20)
            .Select(p => new
            {
                p.Provider, p.Success, p.LatencyMs, p.CheckedAt
            })
            .ToListAsync();

        return Ok(new { Providers = records, CheckedAt = DateTime.UtcNow });
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> ListAuditLogs([FromQuery] int limit = 50)
    {
        var logs = await db.AdminAuditLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(limit)
            .Select(l => new
            {
                l.Id, l.ActorUserId, l.Action, l.EntityType,
                l.EntityId, l.MetadataJson, l.CreatedAt
            })
            .ToListAsync();

        return Ok(logs);
    }

    // --- Data Ingestion ---

    /// <summary>Run full data ingestion for all tracked stocks.
    /// <paramref name="maxParallel"/> caps how many stocks are ingested concurrently (default 6,
    /// raise on paid provider tiers, lower on free tiers).</summary>
    [HttpPost("ingest/run")]
    public async Task<IActionResult> TriggerIngestion([FromQuery] int maxParallel = 6, CancellationToken ct = default)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "trigger_ingestion",
        });
        await db.SaveChangesAsync(ct);

        var result = await ingestion.IngestAllAsync(maxParallel, ct);

        return Ok(new
        {
            result.StocksProcessed,
            result.BarsIngested,
            result.FundamentalsIngested,
            result.NewsIngested,
            result.Errors,
            result.DurationMs,
        });
    }

    /// <summary>Ingest data for a single stock (on-demand).</summary>
    [HttpPost("ingest/{ticker}")]
    public async Task<IActionResult> IngestStock(string ticker, CancellationToken ct)
    {
        await ingestion.IngestStockAsync(ticker, ct);
        return Ok(new { Ticker = ticker, Status = "ingested" });
    }

    /// <summary>Add tickers to the stock universe.</summary>
    [HttpPost("universe/sync")]
    public async Task<IActionResult> SyncUniverse([FromBody] SyncUniverseRequest request, CancellationToken ct)
    {
        var added = await ingestion.SyncStockUniverseAsync(request.Tickers, ct);
        return Ok(new { Added = added, Total = request.Tickers.Count });
    }

    /// <summary>Run full pipeline: ingest → score → generate signals.</summary>
    [HttpPost("pipeline/run")]
    public async Task<IActionResult> RunFullPipeline([FromQuery] int maxParallel = 6, CancellationToken ct = default)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "run_full_pipeline",
        });
        await db.SaveChangesAsync(ct);

        // Step 1: Ingest latest data
        var ingestionResult = await ingestion.IngestAllAsync(maxParallel, ct);

        // Step 2: Run scoring engine
        var scanResult = await scanner.RunScanAsync(ct);

        return Ok(new
        {
            Ingestion = new
            {
                ingestionResult.StocksProcessed,
                ingestionResult.BarsIngested,
                ingestionResult.NewsIngested,
                ingestionResult.DurationMs,
            },
            Scan = new
            {
                scanResult.ScanRunId,
                scanResult.SignalsGenerated,
                scanResult.DurationMs,
                TopPicks = scanResult.TopSignals.Take(5).Select(s => new
                {
                    s.Ticker, s.Name,
                    Score = Math.Round(s.ScoreTotal, 1),
                    s.SignalType,
                    s.EntryLow, s.EntryHigh, s.StopLoss,
                    s.TargetLow, s.TargetHigh,
                }),
            },
        });
    }
}

public record SyncUniverseRequest(List<string> Tickers);
