using Fintrest.Api.Services.JobState;

namespace Fintrest.Api.Services.Performance;

/// <summary>
/// Nightly job that walks open signals forward through market data and writes
/// outcomes into <c>performance_tracking</c>. Fires at 7:30 PM ET weekdays —
/// after EOD bars have settled from the daily market-data ingestion pipeline.
///
/// <para>
/// Lives on the same IHostedService + Timer + JobStateService pattern as
/// <see cref="Fintrest.Api.Services.Scoring.FundamentalSubscoreJob"/>.
/// </para>
/// </summary>
public class SignalOutcomeJob(
    IServiceScopeFactory scopeFactory,
    ILogger<SignalOutcomeJob> logger) : IHostedService, IDisposable
{
    private const string JobName = "SignalOutcomeJob";
    private const int TargetHourEt = 19;
    private const int TargetMinuteEt = 30;
    private Timer? _timer;
    private int _runningFlag;

    public Task StartAsync(CancellationToken ct)
    {
        logger.LogInformation(
            "SignalOutcomeJob started. Checking every minute for {H}:{M:D2} ET trigger.",
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
            logger.LogError(ex, "SignalOutcomeJob: gating check failed; skipping tick");
            return;
        }

        await RunOnceAsync(CancellationToken.None);
    }

    /// <summary>Manual trigger for admin dry-runs + backfill.</summary>
    public async Task<SignalOutcomeRunSummary> RunOnceAsync(CancellationToken ct)
    {
        if (Interlocked.CompareExchange(ref _runningFlag, 1, 0) == 1)
            throw new InvalidOperationException("SignalOutcomeJob already running");

        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            using var scope = scopeFactory.CreateScope();
            var svc = scope.ServiceProvider.GetRequiredService<SignalOutcomeService>();
            var jobState = scope.ServiceProvider.GetRequiredService<JobStateService>();

            var summary = await svc.RunOnceAsync(ct);
            sw.Stop();

            logger.LogInformation(
                "SignalOutcomeJob complete in {Ms}ms: evaluated={Evaluated} target={Target} stop={Stop} horizon={Horizon} open={Open}",
                sw.ElapsedMilliseconds,
                summary.Evaluated,
                summary.TargetHit,
                summary.StopHit,
                summary.HorizonExpired,
                summary.StillOpen);

            await jobState.MarkSuccessAsync(JobName, ct);
            return summary;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SignalOutcomeJob failed");
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
