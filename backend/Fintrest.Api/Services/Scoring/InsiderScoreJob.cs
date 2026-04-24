using Fintrest.Api.Services.JobState;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Nightly recompute of the per-ticker insider score. Fires at 8:45 PM
/// ET weekdays — 45 minutes after <see cref="Fintrest.Api.Services.Providers.Edgar.EdgarIngestJob"/>
/// so the latest raw transactions are persisted before we score.
///
/// Same IHostedService + Timer + JobStateService pattern as the other
/// scheduled jobs — a mid-day backend restart doesn't silently skip.
/// </summary>
public class InsiderScoreJob(
    IServiceScopeFactory scopeFactory,
    ILogger<InsiderScoreJob> logger) : IHostedService, IDisposable
{
    private const string JobName = "InsiderScoreJob";
    private const int TargetHourEt = 20;
    private const int TargetMinuteEt = 45;
    private Timer? _timer;
    private int _runningFlag;

    public Task StartAsync(CancellationToken ct)
    {
        logger.LogInformation(
            "InsiderScoreJob started. Checking every minute for {H}:{M:D2} ET trigger.",
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
            var jobState = scope.ServiceProvider.GetRequiredService<JobStateService>();
            if (!await jobState.ShouldRunAsync(JobName, TargetHourEt, TargetMinuteEt, weekdayOnly: true))
                return;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "InsiderScoreJob: gating check failed; skipping tick");
            return;
        }

        await RunOnceAsync(CancellationToken.None);
    }

    /// <summary>Manual trigger — admin endpoint calls this for ad-hoc recompute.</summary>
    public async Task<InsiderScoreService.RunSummary> RunOnceAsync(CancellationToken ct)
    {
        if (Interlocked.CompareExchange(ref _runningFlag, 1, 0) == 1)
            throw new InvalidOperationException("InsiderScoreJob already running");

        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            using var scope = scopeFactory.CreateScope();
            var svc = scope.ServiceProvider.GetRequiredService<InsiderScoreService>();
            var jobState = scope.ServiceProvider.GetRequiredService<JobStateService>();

            var summary = await svc.RecomputeAsync(ct);
            sw.Stop();

            logger.LogInformation(
                "InsiderScoreJob done in {Ms}ms — {Scored} scored ({NonZero} non-zero, {Skipped} missing market cap)",
                sw.ElapsedMilliseconds, summary.TickersScored, summary.NonZeroScores, summary.TickersSkippedNoCap);

            await jobState.MarkSuccessAsync(JobName, ct);
            return summary;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "InsiderScoreJob failed");
            try
            {
                using var errScope = scopeFactory.CreateScope();
                var jobState = errScope.ServiceProvider.GetRequiredService<JobStateService>();
                await jobState.MarkErrorAsync(JobName, ex.Message, ct);
            }
            catch { /* best-effort */ }
            throw;
        }
        finally
        {
            Interlocked.Exchange(ref _runningFlag, 0);
        }
    }
}
