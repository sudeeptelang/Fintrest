using System.Security.Claims;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Ingestion;
using Fintrest.Api.Services.Pipeline;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Controllers;

[Authorize(Roles = "Admin")]
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
    /// </summary>
    [HttpGet("system-health")]
    public async Task<IActionResult> SystemHealth()
    {
        var utcNow = DateTime.UtcNow;
        var etZone = SafeEasternZone();
        var etNow = TimeZoneInfo.ConvertTimeFromUtc(utcNow, etZone);
        var todayEt = etNow.Date;
        var todayEtStartUtc = TimeZoneInfo.ConvertTimeToUtc(todayEt, etZone);

        var lastScan = await db.ScanRuns
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefaultAsync();
        var todaysScan = await db.ScanRuns
            .Where(s => s.StartedAt >= todayEtStartUtc)
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefaultAsync();

        // Morning briefings aren't persisted to alert_deliveries today (see
        // AlertDispatcher.DispatchMorningBriefingsAsync — the dispatcher sends
        // via emailService but doesn't write a row). So the best proxy is:
        // did the latest completed scan finish today, and how many users are
        // opted in? Real logging comes in a follow-up.
        var briefingAudience = await db.Users
            .Where(u => u.ReceiveMorningBriefing && u.Email != null && u.Email != "")
            .CountAsync();
        var weeklyAudience = await db.Users
            .Where(u => u.ReceiveWeeklyNewsletter && u.Email != null && u.Email != "")
            .CountAsync();

        var lastFeatureRun = await db.FeatureRunLogs
            .OrderByDescending(f => f.StartedAt)
            .FirstOrDefaultAsync();

        var lastIngestion = await db.AdminAuditLogs
            .Where(a => a.Action == "trigger_ingestion" || a.Action == "trigger_scan")
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync();

        var recentAuditLogs = await db.AdminAuditLogs
            .OrderByDescending(a => a.CreatedAt)
            .Take(10)
            .Select(a => new
            {
                a.Id,
                a.ActorUserId,
                a.Action,
                a.EntityType,
                a.EntityId,
                a.CreatedAt,
            })
            .ToListAsync();

        // Provider rollup — last 24h per provider.
        var providerSince = utcNow.AddHours(-24);
        var providerRows = await db.ProviderHealth
            .Where(p => p.CheckedAt >= providerSince)
            .ToListAsync();
        var providers = providerRows
            .GroupBy(p => p.Provider)
            .Select(g =>
            {
                var last = g.OrderByDescending(p => p.CheckedAt).First();
                return new
                {
                    Provider = g.Key,
                    TotalChecks = g.Count(),
                    Successes = g.Count(p => p.Success),
                    SuccessRate = g.Count() == 0 ? 0.0 : (double)g.Count(p => p.Success) / g.Count(),
                    LastCheckedAt = last.CheckedAt,
                    LastOk = last.Success,
                    LastLatencyMs = last.LatencyMs,
                };
            })
            .OrderBy(p => p.Provider)
            .ToList();

        // Alerts — only flag items a human should actually act on. Each alert
        // is a short, specific string so the email's subject line can say
        // "[ALERT] X, Y" without a template.
        var alerts = new List<string>();
        var todayRanScan = todaysScan != null && todaysScan.Status == "COMPLETED";
        var etPastScan = etNow.Hour > 6 || (etNow.Hour == 6 && etNow.Minute >= 35);
        var isWeekday = etNow.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday;
        if (isWeekday && etPastScan && !todayRanScan)
            alerts.Add($"Daily scan did not complete today (last scan: {FormatAgo(lastScan?.StartedAt, utcNow)})");
        if (lastScan != null && lastScan.Status == "FAILED")
            alerts.Add($"Last scan ({lastScan.StartedAt:MMM d HH:mm}Z) ended in FAILED state");
        foreach (var p in providers.Where(p => p.SuccessRate < 0.5 && p.TotalChecks >= 3))
            alerts.Add($"Provider {p.Provider} success rate {p.SuccessRate:P0} over last 24h");
        if (isWeekday && etPastScan && briefingAudience > 0 && !todayRanScan)
            alerts.Add("Morning briefing would not have sent (scan didn't complete)");

        var overallStatus = alerts.Count == 0 ? "ok" : "alert";

        // Next fire times — simple forward calculation, not DB-backed. These
        // match the hardcoded schedules in DailyCronJob, MorningBriefingJob,
        // FeaturePopulationJob, AlgorithmIcTrackingJob.
        var jobs = new[]
        {
            new { Name = "DailyCronJob",             Pattern = "Mon–Fri 6:30 AM ET", NextFireEt = NextWeekdayAt(etNow, 6, 30) },
            new { Name = "MorningBriefingJob",       Pattern = "Daily 6:30 AM ET + Fri 4:30 PM ET newsletter", NextFireEt = NextDailyAt(etNow, 6, 30) },
            new { Name = "FeaturePopulationJob",     Pattern = "Mon–Fri 5:45 AM ET", NextFireEt = NextWeekdayAt(etNow, 5, 45) },
            new { Name = "AlgorithmIcTrackingJob",   Pattern = "Mon–Fri 5:30 AM ET (stub)", NextFireEt = NextWeekdayAt(etNow, 5, 30) },
            new { Name = "IntradayDriftJob",         Pattern = "Every 15m when SPY>1% / VIX>15%", NextFireEt = etNow.AddMinutes(15) },
        };

        return Ok(new
        {
            OverallStatus = overallStatus,
            Alerts = alerts,
            NowUtc = utcNow,
            NowEt = etNow,
            Scan = new
            {
                LastRunAt = lastScan?.StartedAt,
                LastRunStatus = lastScan?.Status,
                LastRunSignals = lastScan?.SignalsGenerated,
                LastRunUniverse = lastScan?.UniverseSize,
                LastRunCompletedAt = lastScan?.CompletedAt,
                TodayRan = todayRanScan,
                HoursSinceLastRun = lastScan == null ? (double?)null : (utcNow - lastScan.StartedAt).TotalHours,
            },
            MorningBriefing = new
            {
                AudienceSize = briefingAudience,
                WeeklyAudienceSize = weeklyAudience,
                BriefingLogNote = "morning briefings are not persisted to alert_deliveries today; add a BriefingRun table to track sends",
                ProxyLastSentAt = todayRanScan ? todaysScan?.CompletedAt : lastScan?.CompletedAt,
            },
            FeaturePopulation = lastFeatureRun == null ? null : new
            {
                RunId = lastFeatureRun.RunId,
                TradeDate = lastFeatureRun.TradeDate,
                StartedAt = lastFeatureRun.StartedAt,
                EndedAt = lastFeatureRun.EndedAt,
                UniverseSize = lastFeatureRun.UniverseSize,
                SectorFallbacks = lastFeatureRun.SectorFallbacks,
            },
            LastIngestion = lastIngestion == null ? null : new
            {
                At = lastIngestion.CreatedAt,
                Action = lastIngestion.Action,
                ActorUserId = lastIngestion.ActorUserId,
            },
            Providers = providers,
            Jobs = jobs,
            RecentAdminActions = recentAuditLogs,
        });
    }

    private static TimeZoneInfo SafeEasternZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("America/New_York"); }
    }

    private static DateTime NextWeekdayAt(DateTime etNow, int hour, int minute)
    {
        var candidate = new DateTime(etNow.Year, etNow.Month, etNow.Day, hour, minute, 0, DateTimeKind.Unspecified);
        if (candidate <= etNow) candidate = candidate.AddDays(1);
        while (candidate.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            candidate = candidate.AddDays(1);
        return candidate;
    }

    private static DateTime NextDailyAt(DateTime etNow, int hour, int minute)
    {
        var candidate = new DateTime(etNow.Year, etNow.Month, etNow.Day, hour, minute, 0, DateTimeKind.Unspecified);
        if (candidate <= etNow) candidate = candidate.AddDays(1);
        return candidate;
    }

    private static string FormatAgo(DateTime? whenUtc, DateTime nowUtc)
    {
        if (whenUtc is null) return "never";
        var delta = nowUtc - whenUtc.Value;
        if (delta.TotalMinutes < 60) return $"{(int)delta.TotalMinutes}m ago";
        if (delta.TotalHours < 48) return $"{delta.TotalHours:F1}h ago";
        return $"{delta.TotalDays:F0}d ago";
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
