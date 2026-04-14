namespace Fintrest.Api.Services.Email;

/// <summary>
/// Background service that fires morning briefings daily at 6:30 AM ET.
/// Wakes every minute, checks ET time, runs once per day.
/// </summary>
public class MorningBriefingJob(
    IServiceScopeFactory scopeFactory,
    ILogger<MorningBriefingJob> logger) : BackgroundService
{
    private DateTime _lastRunDate = DateTime.MinValue;
    private static readonly TimeZoneInfo EtTimeZone = GetEtTimeZone();

    private static TimeZoneInfo GetEtTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("America/New_York"); }
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        logger.LogInformation("MorningBriefingJob started. Checking every minute for 6:30 AM ET trigger.");

        while (!ct.IsCancellationRequested)
        {
            try
            {
                var etNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, EtTimeZone);

                // Fire once at 6:30 AM ET each day
                if (etNow.Hour == 6 && etNow.Minute == 30 && etNow.Date != _lastRunDate)
                {
                    _lastRunDate = etNow.Date;
                    logger.LogInformation("MorningBriefingJob: triggering at {EtNow}", etNow);
                    await RunBriefingAsync(ct);
                }

                // Friday 4:30 PM ET → weekly newsletter
                if (etNow.DayOfWeek == DayOfWeek.Friday
                    && etNow.Hour == 16 && etNow.Minute == 30
                    && etNow.Date != _lastRunDate)
                {
                    _lastRunDate = etNow.Date;
                    logger.LogInformation("MorningBriefingJob: weekly newsletter at {EtNow}", etNow);
                    await RunWeeklyAsync(ct);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "MorningBriefingJob tick failed");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), ct);
        }
    }

    private async Task RunBriefingAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var dispatcher = scope.ServiceProvider.GetRequiredService<AlertDispatcher>();
        var result = await dispatcher.DispatchMorningBriefingsAsync(ct);
        logger.LogInformation("Morning briefing dispatched: {Sent}/{Matched} sent", result.Sent, result.Matched);
    }

    private async Task RunWeeklyAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var dispatcher = scope.ServiceProvider.GetRequiredService<AlertDispatcher>();
        var summary = "Markets wrapped the week with broad activity across sectors. "
                    + "Fintrest's V2 scoring engine surfaced strong signals in growth and AI names. "
                    + "Review the top picks below for actionable setups heading into next week.";
        var result = await dispatcher.DispatchWeeklyNewsletterAsync(summary, ct);
        logger.LogInformation("Weekly newsletter dispatched: {Sent}/{Matched} sent", result.Sent, result.Matched);
    }
}
