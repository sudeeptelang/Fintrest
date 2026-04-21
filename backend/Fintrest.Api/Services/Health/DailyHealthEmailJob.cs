using System.Text;
using Fintrest.Api.Services.Email;

namespace Fintrest.Api.Services.Health;

/// <summary>
/// Nightly health-check email. Fires at 7:00 AM ET Mon–Fri — 30 minutes after
/// the daily scan + briefing window closes — so the subject line tells the
/// admin whether the overnight jobs actually ran.
///
/// Recipient comes from config key <c>HealthEmail:Recipient</c>. If that key
/// is missing the job logs a one-time warning and quietly no-ops; the admin
/// can opt in later by setting the key.
/// </summary>
public class DailyHealthEmailJob(
    IServiceScopeFactory scopeFactory,
    IConfiguration config,
    ILogger<DailyHealthEmailJob> logger) : IHostedService, IDisposable
{
    private const string JobName = "DailyHealthEmailJob";
    private const int TargetHourEt = 7;
    private const int TargetMinuteEt = 0;
    private Timer? _timer;
    private int _runningFlag;

    public Task StartAsync(CancellationToken ct)
    {
        logger.LogInformation(
            "DailyHealthEmailJob started. Checking every minute for {H}:{M:D2} AM ET trigger.",
            TargetHourEt, TargetMinuteEt);
        _timer = new Timer(Tick, null, TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(1));
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken ct)
    {
        _timer?.Change(Timeout.Infinite, 0);
        return Task.CompletedTask;
    }

    public void Dispose() => _timer?.Dispose();

    private void Tick(object? state)
    {
        if (Volatile.Read(ref _runningFlag) == 1) return;
        _ = TickAsync();
    }

    private async Task TickAsync()
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var jobState = scope.ServiceProvider.GetRequiredService<Fintrest.Api.Services.JobState.JobStateService>();
            if (!await jobState.ShouldRunAsync(JobName, TargetHourEt, TargetMinuteEt, weekdayOnly: true))
                return;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DailyHealthEmailJob: gating check failed; skipping tick");
            return;
        }

        await SendOnceAsync(CancellationToken.None);
    }

    /// <summary>Manual trigger — admin controller can call this for a dry run.</summary>
    public async Task<string> SendOnceAsync(CancellationToken ct)
    {
        if (Interlocked.CompareExchange(ref _runningFlag, 1, 0) == 1)
            throw new InvalidOperationException("DailyHealthEmailJob already running");

        try
        {
            var recipient = config["HealthEmail:Recipient"];
            if (string.IsNullOrWhiteSpace(recipient))
            {
                logger.LogWarning(
                    "DailyHealthEmailJob: HealthEmail:Recipient is not set in configuration — skipping send. Add it to appsettings.Development.json to enable.");
                return "skipped: no recipient configured";
            }

            using var scope = scopeFactory.CreateScope();
            var health = scope.ServiceProvider.GetRequiredService<SystemHealthService>();
            var email = scope.ServiceProvider.GetRequiredService<EmailService>();
            var jobState = scope.ServiceProvider.GetRequiredService<Fintrest.Api.Services.JobState.JobStateService>();

            var report = await health.GatherAsync(ct);
            var subject = report.OverallStatus == "ok"
                ? $"[OK] Fintrest daily health — {report.NowEt:MMM d}"
                : $"[ALERT] Fintrest daily health — {report.Alerts.Count} issue{(report.Alerts.Count == 1 ? "" : "s")}";

            var html = ComposeHtml(report);
            var result = await email.SendAsync(recipient, subject, html, ct: ct);

            if (result.Success)
            {
                logger.LogInformation("DailyHealthEmailJob: sent to {To}, status={Status}", recipient, report.OverallStatus);
                await jobState.MarkSuccessAsync(JobName, ct);
            }
            else
            {
                logger.LogWarning("DailyHealthEmailJob: send failed to {To}: {Error}", recipient, result.Error);
                await jobState.MarkErrorAsync(JobName, result.Error ?? "unknown send failure", ct);
            }

            return result.Success ? $"sent: {report.OverallStatus}" : $"failed: {result.Error}";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DailyHealthEmailJob failed");
            throw;
        }
        finally
        {
            Interlocked.Exchange(ref _runningFlag, 0);
        }
    }

    private static string ComposeHtml(SystemHealthReport r)
    {
        var sb = new StringBuilder();
        sb.Append("<html><body style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1D2939; max-width:640px; margin:0 auto; padding:24px;\">");
        sb.Append($"<h1 style=\"font-size:22px; margin:0 0 8px 0; letter-spacing:-0.01em;\">Fintrest daily health</h1>");
        sb.Append($"<p style=\"font-size:12px; color:#667085; margin:0 0 24px 0;\">{r.NowEt:MMM d, yyyy} · ET</p>");

        // Status banner
        var bannerColor = r.OverallStatus == "ok" ? "#0A7F4F" : "#B25E09";
        var bannerBg = r.OverallStatus == "ok" ? "rgba(10,127,79,0.08)" : "#FEF6E7";
        sb.Append($"<div style=\"padding:16px 20px; border-radius:8px; background:{bannerBg}; border-left:4px solid {bannerColor}; margin-bottom:24px;\">");
        sb.Append($"<strong style=\"color:{bannerColor}; text-transform:uppercase; letter-spacing:0.08em; font-size:11px;\">");
        sb.Append(r.OverallStatus == "ok" ? "All systems OK" : $"{r.Alerts.Count} alert{(r.Alerts.Count == 1 ? "" : "s")}");
        sb.Append("</strong>");
        if (r.Alerts.Count > 0)
        {
            sb.Append("<ul style=\"margin:8px 0 0 0; padding-left:20px; font-size:13px;\">");
            foreach (var a in r.Alerts)
                sb.Append($"<li style=\"margin:4px 0;\">{System.Net.WebUtility.HtmlEncode(a)}</li>");
            sb.Append("</ul>");
        }
        sb.Append("</div>");

        // Scan
        sb.Append("<h2 style=\"font-size:14px; margin:24px 0 8px 0; text-transform:uppercase; letter-spacing:0.1em; color:#475467;\">Daily scan</h2>");
        sb.Append("<table style=\"width:100%; border-collapse:collapse; font-size:13px;\">");
        sb.Append($"<tr><td style=\"padding:6px 0; color:#667085;\">Today ran</td><td style=\"text-align:right; font-family:monospace;\">{(r.Scan.TodayRan ? "YES" : "NO")}</td></tr>");
        sb.Append($"<tr><td style=\"padding:6px 0; color:#667085;\">Last run</td><td style=\"text-align:right; font-family:monospace;\">{r.Scan.LastRunAt?.ToString("MMM d HH:mm") ?? "never"}</td></tr>");
        sb.Append($"<tr><td style=\"padding:6px 0; color:#667085;\">Status</td><td style=\"text-align:right; font-family:monospace;\">{r.Scan.LastRunStatus ?? "—"}</td></tr>");
        sb.Append($"<tr><td style=\"padding:6px 0; color:#667085;\">Signals</td><td style=\"text-align:right; font-family:monospace;\">{r.Scan.LastRunSignals?.ToString() ?? "—"} / {r.Scan.LastRunUniverse?.ToString() ?? "—"}</td></tr>");
        sb.Append("</table>");

        // Briefing
        sb.Append("<h2 style=\"font-size:14px; margin:24px 0 8px 0; text-transform:uppercase; letter-spacing:0.1em; color:#475467;\">Morning briefing</h2>");
        sb.Append("<table style=\"width:100%; border-collapse:collapse; font-size:13px;\">");
        sb.Append($"<tr><td style=\"padding:6px 0; color:#667085;\">Audience</td><td style=\"text-align:right; font-family:monospace;\">{r.MorningBriefing.AudienceSize} opt-ins</td></tr>");
        sb.Append($"<tr><td style=\"padding:6px 0; color:#667085;\">Weekly</td><td style=\"text-align:right; font-family:monospace;\">{r.MorningBriefing.WeeklyAudienceSize} opt-ins</td></tr>");
        sb.Append("</table>");

        // Providers
        if (r.Providers.Count > 0)
        {
            sb.Append("<h2 style=\"font-size:14px; margin:24px 0 8px 0; text-transform:uppercase; letter-spacing:0.1em; color:#475467;\">Providers (24h)</h2>");
            sb.Append("<table style=\"width:100%; border-collapse:collapse; font-size:13px;\">");
            foreach (var p in r.Providers)
            {
                var rateColor = p.SuccessRate >= 0.9 ? "#0A7F4F" : p.SuccessRate >= 0.5 ? "#B25E09" : "#6B5443";
                sb.Append($"<tr><td style=\"padding:6px 0; color:#667085;\">{System.Net.WebUtility.HtmlEncode(p.Provider)}</td>");
                sb.Append($"<td style=\"text-align:right; font-family:monospace; color:{rateColor};\">{p.SuccessRate:P0} ({p.Successes}/{p.TotalChecks})</td></tr>");
            }
            sb.Append("</table>");
        }

        // Next fires
        sb.Append("<h2 style=\"font-size:14px; margin:24px 0 8px 0; text-transform:uppercase; letter-spacing:0.1em; color:#475467;\">Next scheduled fires</h2>");
        sb.Append("<table style=\"width:100%; border-collapse:collapse; font-size:13px;\">");
        foreach (var j in r.Jobs)
        {
            sb.Append($"<tr><td style=\"padding:6px 0; color:#667085;\">{System.Net.WebUtility.HtmlEncode(j.Name)}</td>");
            sb.Append($"<td style=\"text-align:right; font-family:monospace;\">{j.NextFireEt:MMM d HH:mm} ET</td></tr>");
        }
        sb.Append("</table>");

        sb.Append("<p style=\"font-size:11px; color:#98A2B3; margin-top:32px; padding-top:16px; border-top:1px solid #E4E7EC;\">Fintrest admin · automated daily health check · see /admin/health for the live dashboard.</p>");
        sb.Append("</body></html>");
        return sb.ToString();
    }
}
