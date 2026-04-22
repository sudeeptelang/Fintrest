using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Email;

/// <summary>
/// Fires transactional emails based on user alert rules.
/// Called after each scan, and on demand via /admin endpoints.
/// </summary>
public class AlertDispatcher(
    AppDbContext db,
    EmailService emailService,
    UnsubscribeTokenService unsubscribeTokens,
    IConfiguration config,
    ILogger<AlertDispatcher> logger)
{
    private readonly string _siteUrl =
        config["Site:Url"] ?? "https://fintrest.ai";

    private string UnsubscribeUrlFor(long userId)
    {
        var sig = unsubscribeTokens.Sign(userId);
        return $"{_siteUrl}/unsubscribe?uid={userId}&sig={sig}";
    }

    /// <summary>
    /// Check all active alerts against the latest scan's signals.
    /// Fire emails for matches. Returns number of emails sent.
    /// </summary>
    public async Task<DispatchResult> DispatchAlertsAsync(CancellationToken ct = default)
    {
        var latestScan = await db.ScanRuns
            .Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefaultAsync(ct);

        if (latestScan is null) return new DispatchResult(0, 0, "No completed scan yet");

        // Load signals from latest scan, keyed by stock
        var signalsByStock = await db.Signals
            .Include(s => s.Stock)
            .Include(s => s.Breakdown)
            .Where(s => s.ScanRunId == latestScan.Id)
            .ToDictionaryAsync(s => s.StockId, ct);

        // Load all active alerts with user + stock
        var alerts = await db.Alerts
            .Include(a => a.User)
            .Include(a => a.Stock)
            .Where(a => a.Active && a.User.ReceiveSignalAlerts)
            .ToListAsync(ct);

        int matched = 0, sent = 0, failed = 0;

        foreach (var alert in alerts)
        {
            // For now we only dispatch stock-linked alerts that have a signal in this scan
            if (alert.StockId is null) continue;
            if (!signalsByStock.TryGetValue(alert.StockId.Value, out var signal)) continue;

            // Match rule: for MVP, any BUY_TODAY or high-score WATCH triggers an email.
            // TODO: parse alert.ThresholdJson for per-alert rules (price crosses, score above X, etc.)
            var shouldFire = signal.SignalType == SignalType.BUY_TODAY
                             || (signal.SignalType == SignalType.WATCH && signal.ScoreTotal >= 65);

            if (!shouldFire) continue;

            matched++;

            var reason = signal.Breakdown?.WhyNowSummary
                         ?? $"{signal.Stock.Ticker} scored {Math.Round(signal.ScoreTotal)}/100 in today's scan.";

            var html = EmailTemplates.SignalAlert(
                alert.User.FullName ?? "",
                signal,
                reason,
                UnsubscribeUrlFor(alert.User.Id));

            var subject = signal.SignalType == SignalType.BUY_TODAY
                ? $"🟢 BUY signal: {signal.Stock.Ticker}"
                : $"👀 WATCH: {signal.Stock.Ticker} hit score {Math.Round(signal.ScoreTotal)}";

            var result = await emailService.SendAsync(
                alert.User.Email, subject, html, null, ct);

            if (result.Success) sent++; else failed++;
        }

        logger.LogInformation(
            "Alert dispatch: scanId={ScanId} alerts={Count} matched={Matched} sent={Sent} failed={Failed}",
            latestScan.Id, alerts.Count, matched, sent, failed);

        return new DispatchResult(matched, sent, failed == 0 ? null : $"{failed} sends failed");
    }

    /// <summary>
    /// Send morning briefings to all opted-in users.
    /// Called daily by MorningBriefingJob at 6:30 AM ET after the scan.
    /// </summary>
    public async Task<DispatchResult> DispatchMorningBriefingsAsync(CancellationToken ct = default)
    {
        // Persist a "running" row up front so the dashboard can see in-flight
        // dispatches + detect hangs. Finalised below with sent/failed counts.
        // If migration 019 hasn't been applied yet, briefing_run doesn't exist —
        // we swallow the error so briefings keep working without persistence.
        var run = await TryStartBriefingRunAsync("morning", ct);

        try
        {
            var latestScan = await db.ScanRuns
                .Where(s => s.Status == "COMPLETED")
                .OrderByDescending(s => s.CompletedAt)
                .FirstOrDefaultAsync(ct);

            if (latestScan is null)
            {
                await FinaliseBriefing(run, "completed", audience: 0, sent: 0, failed: 0, error: "no completed scan", ct);
                return new DispatchResult(0, 0, "No completed scan yet");
            }
            if (run is not null) run.ScanRunId = latestScan.Id;

            var topSignals = await db.Signals
                .Include(s => s.Stock)
                .Include(s => s.Breakdown)
                .Where(s => s.ScanRunId == latestScan.Id)
                .OrderByDescending(s => s.ScoreTotal)
                .Take(10)
                .ToListAsync(ct);

            if (topSignals.Count == 0)
            {
                await FinaliseBriefing(run, "completed", audience: 0, sent: 0, failed: 0, error: "no signals in latest scan", ct);
                return new DispatchResult(0, 0, "No signals in latest scan");
            }

            var users = await db.Users
                .Where(u => u.ReceiveMorningBriefing && !string.IsNullOrEmpty(u.Email))
                .ToListAsync(ct);

            int sent = 0, failed = 0;
            var subject = $"Your Morning Signals — {latestScan.CompletedAt:MMM d}";

            foreach (var user in users)
            {
                var html = EmailTemplates.MorningBriefing(
                    user.FullName ?? "",
                    topSignals,
                    latestScan.CompletedAt ?? DateTime.UtcNow,
                    UnsubscribeUrlFor(user.Id));

                var result = await emailService.SendAsync(user.Email, subject, html, null, ct);
                if (result.Success) sent++; else failed++;
            }

            logger.LogInformation(
                "Morning briefing: users={Count} sent={Sent} failed={Failed}",
                users.Count, sent, failed);

            await FinaliseBriefing(run, "completed", audience: users.Count, sent: sent, failed: failed, error: null, ct);
            return new DispatchResult(users.Count, sent, failed == 0 ? null : $"{failed} sends failed");
        }
        catch (Exception ex)
        {
            await FinaliseBriefing(run, "failed", audience: run?.AudienceSize ?? 0, sent: run?.SentCount ?? 0, failed: run?.FailedCount ?? 0, error: ex.Message, ct);
            throw;
        }
    }

    /// <summary>
    /// Create and persist a new briefing_run row. Returns null if the table
    /// doesn't exist yet (migration 019 not applied) — downstream code must
    /// no-op instead of crashing the dispatch.
    /// </summary>
    private async Task<BriefingRun?> TryStartBriefingRunAsync(string kind, CancellationToken ct)
    {
        try
        {
            var run = new BriefingRun { Kind = kind, Status = "running" };
            db.BriefingRuns.Add(run);
            await db.SaveChangesAsync(ct);
            return run;
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                "AlertDispatcher: could not start briefing_run ({Kind}) — table may not exist yet (apply migration 019). {Error}",
                kind, ex.Message);
            db.ChangeTracker.Clear();
            return null;
        }
    }

    private async Task FinaliseBriefing(BriefingRun? run, string status, int audience, int sent, int failed, string? error, CancellationToken ct)
    {
        if (run is null) return;  // migration 019 not applied — log-only dispatch

        run.Status = status;
        run.CompletedAt = DateTime.UtcNow;
        run.AudienceSize = audience;
        run.SentCount = sent;
        run.FailedCount = failed;
        run.ErrorMessage = error;
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning("AlertDispatcher: could not finalise briefing_run. {Error}", ex.Message);
            db.ChangeTracker.Clear();
        }
    }

    /// <summary>Send the weekly newsletter to all opted-in users.</summary>
    public async Task<DispatchResult> DispatchWeeklyNewsletterAsync(
        string marketSummary,
        CancellationToken ct = default)
    {
        var run = await TryStartBriefingRunAsync("weekly", ct);

        var latestScan = await db.ScanRuns
            .Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefaultAsync(ct);

        if (latestScan is null)
        {
            await FinaliseBriefing(run, "completed", audience: 0, sent: 0, failed: 0, error: "no scan yet", ct);
            return new DispatchResult(0, 0, "No scan yet");
        }
        if (run is not null) run.ScanRunId = latestScan.Id;

        var weeklyPicks = await db.Signals
            .Include(s => s.Stock)
            .Include(s => s.Breakdown)
            .Where(s => s.ScanRunId == latestScan.Id && s.SignalType == SignalType.BUY_TODAY)
            .OrderByDescending(s => s.ScoreTotal)
            .Take(5)
            .ToListAsync(ct);

        // Fall back to top WATCH if no BUY_TODAY
        if (weeklyPicks.Count == 0)
        {
            weeklyPicks = await db.Signals
                .Include(s => s.Stock).Include(s => s.Breakdown)
                .Where(s => s.ScanRunId == latestScan.Id)
                .OrderByDescending(s => s.ScoreTotal)
                .Take(5)
                .ToListAsync(ct);
        }

        var users = await db.Users
            .Where(u => u.ReceiveWeeklyNewsletter && !string.IsNullOrEmpty(u.Email))
            .ToListAsync(ct);

        int sent = 0, failed = 0;
        var subject = $"Week of {DateTime.UtcNow:MMM d} — Fintrest Weekly";

        foreach (var user in users)
        {
            var html = EmailTemplates.WeeklyNewsletter(
                user.FullName ?? "", marketSummary, weeklyPicks, DateTime.UtcNow,
                UnsubscribeUrlFor(user.Id));
            var result = await emailService.SendAsync(user.Email, subject, html, null, ct);
            if (result.Success) sent++; else failed++;
        }

        logger.LogInformation(
            "Weekly newsletter: users={Count} sent={Sent} failed={Failed}",
            users.Count, sent, failed);

        await FinaliseBriefing(run, "completed", audience: users.Count, sent: sent, failed: failed, error: null, ct);
        return new DispatchResult(users.Count, sent, failed == 0 ? null : $"{failed} sends failed");
    }
}

public record DispatchResult(int Matched, int Sent, string? Note);
