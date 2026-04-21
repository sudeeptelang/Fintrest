namespace Fintrest.Api.Services.Email;

/// <summary>
/// Background service that fires morning briefings daily at 6:30 AM ET.
/// Wakes every minute, checks ET time, runs once per day.
/// </summary>
public class MorningBriefingJob(
    IServiceScopeFactory scopeFactory,
    ILogger<MorningBriefingJob> logger) : BackgroundService
{
    private const string BriefingJobName = "MorningBriefingJob";
    private const string WeeklyJobName = "WeeklyNewsletterJob";
    private static readonly TimeZoneInfo EtTimeZone = GetEtTimeZone();

    private static TimeZoneInfo GetEtTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("America/New_York"); }
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        logger.LogInformation("MorningBriefingJob started. Checking every minute for 6:30 AM ET + Fri 4:30 PM ET triggers.");

        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var jobState = scope.ServiceProvider.GetRequiredService<Fintrest.Api.Services.JobState.JobStateService>();

                // Daily briefing — runs every calendar day at 6:30 AM ET or any time past that
                // if the backend restarted and missed the minute window.
                if (await jobState.ShouldRunAsync(BriefingJobName, 6, 30, weekdayOnly: false, ct))
                {
                    logger.LogInformation("MorningBriefingJob: briefing catch-up / trigger");
                    await RunBriefingAsync(scope, jobState, ct);
                }

                // Weekly newsletter — Friday 4:30 PM ET. Handled as a separate job_state
                // row so it doesn't compete with the daily briefing's last_success_date.
                var etNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, EtTimeZone);
                if (etNow.DayOfWeek == DayOfWeek.Friday
                    && await jobState.ShouldRunAsync(WeeklyJobName, 16, 30, weekdayOnly: true, ct))
                {
                    logger.LogInformation("MorningBriefingJob: weekly newsletter trigger");
                    await RunWeeklyAsync(scope, jobState, ct);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "MorningBriefingJob tick failed");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), ct);
        }
    }

    private async Task RunBriefingAsync(
        IServiceScope scope,
        Fintrest.Api.Services.JobState.JobStateService jobState,
        CancellationToken ct)
    {
        var dispatcher = scope.ServiceProvider.GetRequiredService<AlertDispatcher>();
        try
        {
            var result = await dispatcher.DispatchMorningBriefingsAsync(ct);
            logger.LogInformation("Morning briefing dispatched: {Sent}/{Matched} sent", result.Sent, result.Matched);
            await jobState.MarkSuccessAsync(BriefingJobName, ct);
        }
        catch (Exception ex)
        {
            await jobState.MarkErrorAsync(BriefingJobName, ex.Message, ct);
            throw;
        }
    }

    private async Task RunWeeklyAsync(
        IServiceScope scope,
        Fintrest.Api.Services.JobState.JobStateService jobState,
        CancellationToken ct)
    {
        var dispatcher = scope.ServiceProvider.GetRequiredService<AlertDispatcher>();
        var summary = "Markets wrapped the week with broad activity across sectors. "
                    + "Fintrest's V2 scoring engine surfaced strong signals in growth and AI names. "
                    + "Review the top picks below for actionable setups heading into next week.";
        try
        {
            var result = await dispatcher.DispatchWeeklyNewsletterAsync(summary, ct);
            logger.LogInformation("Weekly newsletter dispatched: {Sent}/{Matched} sent", result.Sent, result.Matched);
            await jobState.MarkSuccessAsync(WeeklyJobName, ct);
        }
        catch (Exception ex)
        {
            await jobState.MarkErrorAsync(WeeklyJobName, ex.Message, ct);
            throw;
        }
    }
}
