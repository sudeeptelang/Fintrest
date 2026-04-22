using Fintrest.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Health;

/// <summary>
/// Computes a point-in-time snapshot of nightly-job health. Shared by the
/// admin controller (<c>GET /admin/system-health</c>) and the daily health
/// email (<c>DailyHealthEmailJob</c>) so the two stay in sync by construction.
/// </summary>
public class SystemHealthService(AppDbContext db, ILogger<SystemHealthService> logger)
{
    public async Task<SystemHealthReport> GatherAsync(CancellationToken ct = default)
    {
        _ = logger; // reserved for future diagnostic logging
        var utcNow = DateTime.UtcNow;
        var etZone = SafeEasternZone();
        var etNow = TimeZoneInfo.ConvertTimeFromUtc(utcNow, etZone);
        var todayEtStartUtc = TimeZoneInfo.ConvertTimeToUtc(etNow.Date, etZone);

        var lastScan = await db.ScanRuns.OrderByDescending(s => s.StartedAt).FirstOrDefaultAsync(ct);
        var todaysScan = await db.ScanRuns
            .Where(s => s.StartedAt >= todayEtStartUtc)
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefaultAsync(ct);

        var briefingAudience = await db.Users
            .Where(u => u.ReceiveMorningBriefing && u.Email != null && u.Email != "")
            .CountAsync(ct);
        var weeklyAudience = await db.Users
            .Where(u => u.ReceiveWeeklyNewsletter && u.Email != null && u.Email != "")
            .CountAsync(ct);

        var lastMorningBriefing = await db.BriefingRuns
            .Where(b => b.Kind == "morning")
            .OrderByDescending(b => b.StartedAt)
            .FirstOrDefaultAsync(ct);
        var todaysMorningBriefing = await db.BriefingRuns
            .Where(b => b.Kind == "morning" && b.StartedAt >= todayEtStartUtc)
            .OrderByDescending(b => b.StartedAt)
            .FirstOrDefaultAsync(ct);
        var lastWeeklyNewsletter = await db.BriefingRuns
            .Where(b => b.Kind == "weekly")
            .OrderByDescending(b => b.StartedAt)
            .FirstOrDefaultAsync(ct);

        var lastFeatureRun = await db.FeatureRunLogs.OrderByDescending(f => f.StartedAt).FirstOrDefaultAsync(ct);

        // Firehose cache freshness — migration 020.
        var lastFirehoseCapture = await db.MarketFirehoseSnapshots
            .OrderByDescending(s => s.CapturedAt)
            .Select(s => (DateTime?)s.CapturedAt)
            .FirstOrDefaultAsync(ct);

        var lastIngestion = await db.AdminAuditLogs
            .Where(a => a.Action == "trigger_ingestion" || a.Action == "trigger_scan")
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync(ct);

        var recentAuditLogs = await db.AdminAuditLogs
            .OrderByDescending(a => a.CreatedAt)
            .Take(10)
            .Select(a => new AuditRow(a.Id, a.ActorUserId, a.Action, a.EntityType, a.EntityId, a.CreatedAt))
            .ToListAsync(ct);

        var providerRows = await db.ProviderHealth
            .Where(p => p.CheckedAt >= utcNow.AddHours(-24))
            .ToListAsync(ct);
        var providers = providerRows
            .GroupBy(p => p.Provider)
            .Select(g =>
            {
                var last = g.OrderByDescending(p => p.CheckedAt).First();
                var total = g.Count();
                var ok = g.Count(p => p.Success);
                return new ProviderStatus(
                    Provider: g.Key,
                    TotalChecks: total,
                    Successes: ok,
                    SuccessRate: total == 0 ? 0.0 : (double)ok / total,
                    LastCheckedAt: last.CheckedAt,
                    LastOk: last.Success,
                    LastLatencyMs: last.LatencyMs);
            })
            .OrderBy(p => p.Provider)
            .ToList();

        var alerts = new List<string>();
        var todayRanScan = todaysScan is { Status: "COMPLETED" };
        var todaySentBriefing = todaysMorningBriefing is { Status: "completed", SentCount: > 0 };
        var etPastScan = etNow.Hour > 6 || (etNow.Hour == 6 && etNow.Minute >= 35);
        var etPastBriefing = etNow.Hour > 6 || (etNow.Hour == 6 && etNow.Minute >= 40);
        var isWeekday = etNow.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday;
        if (isWeekday && etPastScan && !todayRanScan)
            alerts.Add($"Daily scan did not complete today (last scan: {FormatAgo(lastScan?.StartedAt, utcNow)})");
        if (lastScan is { Status: "FAILED" })
            alerts.Add($"Last scan ({lastScan.StartedAt:MMM d HH:mm}Z) ended in FAILED state");
        foreach (var p in providers.Where(p => p.SuccessRate < 0.5 && p.TotalChecks >= 3))
            alerts.Add($"Provider {p.Provider} success rate {p.SuccessRate:P0} over last 24h");
        if (isWeekday && etPastBriefing && briefingAudience > 0 && !todaySentBriefing)
            alerts.Add($"Morning briefing did not send today (last briefing: {FormatAgo(lastMorningBriefing?.StartedAt, utcNow)})");
        if (lastMorningBriefing is { Status: "failed" })
            alerts.Add($"Last morning briefing failed: {lastMorningBriefing.ErrorMessage ?? "no message"}");
        if (lastMorningBriefing is { Status: "completed", FailedCount: > 0 } lmb)
            alerts.Add($"Last morning briefing had {lmb.FailedCount} failed send{(lmb.FailedCount == 1 ? "" : "s")} of {lmb.AudienceSize}");

        // Firehose cache staleness — fire if nightly refresh hasn't written in > 26h.
        // Don't alert when we've never captured anything (new install); that state
        // resolves itself the first time FirehoseIngestJob succeeds.
        if (lastFirehoseCapture is not null && utcNow - lastFirehoseCapture.Value > TimeSpan.FromHours(26))
            alerts.Add($"Firehose cache (insiders + congress) is stale — last capture {FormatAgo(lastFirehoseCapture, utcNow)}");

        var overallStatus = alerts.Count == 0 ? "ok" : "alert";

        var jobs = new[]
        {
            new JobSchedule("DailyCronJob",           "Mon–Fri 6:30 AM ET", NextWeekdayAt(etNow, 6, 30)),
            new JobSchedule("MorningBriefingJob",     "Daily 6:30 AM ET + Fri 4:30 PM ET newsletter", NextDailyAt(etNow, 6, 30)),
            new JobSchedule("FeaturePopulationJob",   "Mon–Fri 5:45 AM ET", NextWeekdayAt(etNow, 5, 45)),
            new JobSchedule("AlgorithmIcTrackingJob", "Mon–Fri 5:30 AM ET (stub)", NextWeekdayAt(etNow, 5, 30)),
            new JobSchedule("DailyHealthEmailJob",    "Mon–Fri 7:00 AM ET", NextWeekdayAt(etNow, 7, 0)),
            new JobSchedule("FirehoseIngestJob",      "Mon–Fri 6:15 AM ET", NextWeekdayAt(etNow, 6, 15)),
            new JobSchedule("FundamentalSubscoreJob", "Mon–Fri 5:15 AM ET", NextWeekdayAt(etNow, 5, 15)),
            new JobSchedule("IntradayDriftJob",       "Every 15m when SPY>1% / VIX>15%", etNow.AddMinutes(15)),
        };

        var featurePop = lastFeatureRun == null
            ? null
            : new FeaturePopStatus(
                RunId: lastFeatureRun.RunId,
                TradeDate: lastFeatureRun.TradeDate,
                StartedAt: lastFeatureRun.StartedAt,
                EndedAt: lastFeatureRun.EndedAt,
                UniverseSize: lastFeatureRun.UniverseSize,
                SectorFallbacks: lastFeatureRun.SectorFallbacks);

        var ingestion = lastIngestion == null
            ? null
            : new IngestionStatus(
                At: lastIngestion.CreatedAt,
                Action: lastIngestion.Action,
                ActorUserId: lastIngestion.ActorUserId);

        return new SystemHealthReport(
            OverallStatus: overallStatus,
            Alerts: alerts,
            NowUtc: utcNow,
            NowEt: etNow,
            Scan: new ScanStatus(
                LastRunAt: lastScan?.StartedAt,
                LastRunStatus: lastScan?.Status,
                LastRunSignals: lastScan?.SignalsGenerated,
                LastRunUniverse: lastScan?.UniverseSize,
                LastRunCompletedAt: lastScan?.CompletedAt,
                TodayRan: todayRanScan,
                HoursSinceLastRun: lastScan == null ? null : (utcNow - lastScan.StartedAt).TotalHours),
            MorningBriefing: new BriefingStatus(
                AudienceSize: briefingAudience,
                WeeklyAudienceSize: weeklyAudience,
                TodaySent: todaySentBriefing,
                TodaySentCount: todaysMorningBriefing?.SentCount ?? 0,
                TodayFailedCount: todaysMorningBriefing?.FailedCount ?? 0,
                TodayStatus: todaysMorningBriefing?.Status,
                LastSentAt: lastMorningBriefing?.CompletedAt ?? lastMorningBriefing?.StartedAt,
                LastSentCount: lastMorningBriefing?.SentCount,
                LastStatus: lastMorningBriefing?.Status,
                LastError: lastMorningBriefing?.ErrorMessage,
                LastWeeklyAt: lastWeeklyNewsletter?.CompletedAt ?? lastWeeklyNewsletter?.StartedAt,
                LastWeeklySentCount: lastWeeklyNewsletter?.SentCount),
            FeaturePopulation: featurePop,
            LastIngestion: ingestion,
            Providers: providers,
            Jobs: jobs,
            RecentAdminActions: recentAuditLogs);
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
}

public record SystemHealthReport(
    string OverallStatus,
    List<string> Alerts,
    DateTime NowUtc,
    DateTime NowEt,
    ScanStatus Scan,
    BriefingStatus MorningBriefing,
    FeaturePopStatus? FeaturePopulation,
    IngestionStatus? LastIngestion,
    List<ProviderStatus> Providers,
    JobSchedule[] Jobs,
    List<AuditRow> RecentAdminActions);

public record ScanStatus(
    DateTime? LastRunAt,
    string? LastRunStatus,
    int? LastRunSignals,
    int? LastRunUniverse,
    DateTime? LastRunCompletedAt,
    bool TodayRan,
    double? HoursSinceLastRun);

public record BriefingStatus(
    int AudienceSize,
    int WeeklyAudienceSize,
    bool TodaySent,
    int TodaySentCount,
    int TodayFailedCount,
    string? TodayStatus,
    DateTime? LastSentAt,
    int? LastSentCount,
    string? LastStatus,
    string? LastError,
    DateTime? LastWeeklyAt,
    int? LastWeeklySentCount);

public record FeaturePopStatus(
    Guid RunId,
    DateOnly TradeDate,
    DateTime StartedAt,
    DateTime? EndedAt,
    int? UniverseSize,
    int SectorFallbacks);

public record IngestionStatus(
    DateTime At,
    string Action,
    long? ActorUserId);

public record ProviderStatus(
    string Provider,
    int TotalChecks,
    int Successes,
    double SuccessRate,
    DateTime LastCheckedAt,
    bool LastOk,
    int? LastLatencyMs);

public record JobSchedule(string Name, string Pattern, DateTime NextFireEt);

public record AuditRow(
    long Id,
    long? ActorUserId,
    string Action,
    string? EntityType,
    long? EntityId,
    DateTime CreatedAt);
