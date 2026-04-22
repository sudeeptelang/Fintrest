namespace Fintrest.Api.Services.Email;

/// <summary>
/// Background service that evaluates user-defined price/target/stop/volume
/// alerts against the latest market data bars and fires email notifications.
///
/// <para>
/// Cadence: every 15 minutes during US market hours (9:30 AM – 4:15 PM ET,
/// Mon–Fri). Intentionally does NOT use <see cref="Fintrest.Api.Services.JobState.JobStateService"/>
/// because that's a once-per-day gate; alert evaluation should fire many
/// times per day.
/// </para>
///
/// <para>
/// Off-hours: we still run one evaluation at ~4:15 PM ET after close to catch
/// alerts that triggered on the closing print. No evaluation on weekends.
/// </para>
/// </summary>
public class AlertEvaluatorJob(
    IServiceScopeFactory scopeFactory,
    ILogger<AlertEvaluatorJob> logger) : BackgroundService
{
    private static readonly TimeZoneInfo EtTimeZone = SafeEasternZone();

    private static TimeZoneInfo SafeEasternZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("America/New_York"); }
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        logger.LogInformation("AlertEvaluatorJob started. 15-min cadence during US market hours.");

        // Initial small delay so startup doesn't fire a wave of alerts during
        // a deploy while the backend is still warming caches.
        await Task.Delay(TimeSpan.FromSeconds(45), ct);

        while (!ct.IsCancellationRequested)
        {
            try
            {
                if (ShouldEvaluateNow())
                {
                    using var scope = scopeFactory.CreateScope();
                    var evaluator = scope.ServiceProvider.GetRequiredService<AlertEvaluator>();
                    await evaluator.RunOnceAsync(ct);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "AlertEvaluatorJob tick failed");
            }

            await Task.Delay(TimeSpan.FromMinutes(15), ct);
        }
    }

    private static bool ShouldEvaluateNow()
    {
        var et = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, EtTimeZone);
        if (et.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) return false;

        // 9:30 AM to 4:15 PM ET window. Extra 15 min past close catches
        // closing-print triggers without letting the job run all night.
        var minutesSinceMidnight = et.Hour * 60 + et.Minute;
        return minutesSinceMidnight >= 9 * 60 + 30 && minutesSinceMidnight <= 16 * 60 + 15;
    }
}
