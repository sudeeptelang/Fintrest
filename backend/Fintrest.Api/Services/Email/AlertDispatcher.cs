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
    ILogger<AlertDispatcher> logger)
{
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
                reason);

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
        var latestScan = await db.ScanRuns
            .Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefaultAsync(ct);

        if (latestScan is null) return new DispatchResult(0, 0, "No completed scan yet");

        var topSignals = await db.Signals
            .Include(s => s.Stock)
            .Include(s => s.Breakdown)
            .Where(s => s.ScanRunId == latestScan.Id)
            .OrderByDescending(s => s.ScoreTotal)
            .Take(10)
            .ToListAsync(ct);

        if (topSignals.Count == 0) return new DispatchResult(0, 0, "No signals in latest scan");

        // Load all opted-in users
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
                latestScan.CompletedAt ?? DateTime.UtcNow);

            var result = await emailService.SendAsync(user.Email, subject, html, null, ct);
            if (result.Success) sent++; else failed++;
        }

        logger.LogInformation(
            "Morning briefing: users={Count} sent={Sent} failed={Failed}",
            users.Count, sent, failed);

        return new DispatchResult(users.Count, sent, failed == 0 ? null : $"{failed} sends failed");
    }

    /// <summary>Send the weekly newsletter to all opted-in users.</summary>
    public async Task<DispatchResult> DispatchWeeklyNewsletterAsync(
        string marketSummary,
        CancellationToken ct = default)
    {
        var latestScan = await db.ScanRuns
            .Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefaultAsync(ct);

        if (latestScan is null) return new DispatchResult(0, 0, "No scan yet");

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
                user.FullName ?? "", marketSummary, weeklyPicks, DateTime.UtcNow);
            var result = await emailService.SendAsync(user.Email, subject, html, null, ct);
            if (result.Success) sent++; else failed++;
        }

        logger.LogInformation(
            "Weekly newsletter: users={Count} sent={Sent} failed={Failed}",
            users.Count, sent, failed);

        return new DispatchResult(users.Count, sent, failed == 0 ? null : $"{failed} sends failed");
    }
}

public record DispatchResult(int Matched, int Sent, string? Note);
