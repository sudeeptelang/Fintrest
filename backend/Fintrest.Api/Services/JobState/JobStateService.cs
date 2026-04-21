using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.JobState;

/// <summary>
/// Decides whether a scheduled job should fire right now, factoring in
/// persisted last-run state. Fixes the classic "backend restarted between
/// 6:29 and 6:31 so the 6:30 scan silently skipped" failure mode.
///
/// <para>
/// Contract: a job calls <see cref="ShouldRunAsync"/> every minute. It
/// returns true when (a) today's ET date hasn't been marked successful for
/// this job AND (b) current ET time is at or past the scheduled hour/minute
/// AND (c) either the job runs every day or it's a weekday. On success the
/// job calls <see cref="MarkSuccessAsync"/>; on failure,
/// <see cref="MarkErrorAsync"/>.
/// </para>
/// </summary>
public class JobStateService(AppDbContext db, ILogger<JobStateService> logger)
{
    private static readonly TimeZoneInfo EasternZone = SafeEasternZone();

    public async Task<bool> ShouldRunAsync(
        string jobName,
        int scheduledHourEt,
        int scheduledMinuteEt,
        bool weekdayOnly,
        CancellationToken ct = default)
    {
        var etNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, EasternZone);

        if (weekdayOnly && etNow.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            return false;

        // Must be at or past the scheduled ET time today.
        if (etNow.Hour < scheduledHourEt ||
            (etNow.Hour == scheduledHourEt && etNow.Minute < scheduledMinuteEt))
            return false;

        var todayEt = DateOnly.FromDateTime(etNow);
        var state = await db.JobStates.FirstOrDefaultAsync(s => s.JobName == jobName, ct);

        // Never run, or last success was before today — fire.
        return state?.LastSuccessDate is null || state.LastSuccessDate < todayEt;
    }

    public async Task MarkSuccessAsync(string jobName, CancellationToken ct = default)
    {
        var etNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, EasternZone);
        var todayEt = DateOnly.FromDateTime(etNow);

        var state = await db.JobStates.FirstOrDefaultAsync(s => s.JobName == jobName, ct);
        if (state is null)
        {
            state = new Models.JobState { JobName = jobName };
            db.JobStates.Add(state);
        }
        state.LastSuccessDate = todayEt;
        state.LastSuccessAt = DateTime.UtcNow;
        state.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task MarkErrorAsync(string jobName, string error, CancellationToken ct = default)
    {
        var state = await db.JobStates.FirstOrDefaultAsync(s => s.JobName == jobName, ct);
        if (state is null)
        {
            state = new Models.JobState { JobName = jobName };
            db.JobStates.Add(state);
        }
        state.LastErrorAt = DateTime.UtcNow;
        state.LastErrorMessage = error.Length > 4000 ? error[..4000] : error;
        state.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        logger.LogWarning("JobStateService: {JobName} marked error: {Error}", jobName, error);
    }

    private static TimeZoneInfo SafeEasternZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("America/New_York"); }
    }
}
