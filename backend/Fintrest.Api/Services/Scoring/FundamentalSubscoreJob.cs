namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Nightly job that populates <c>fundamental_subscore</c> — one row per
/// active ticker for today's ET date. Fires at 5:15 AM ET Mon–Fri, before
/// FeaturePopulationJob (5:45) and the scoring pipeline (6:30). Delegates
/// the actual math to <see cref="FundamentalSubscoreService"/>.
/// </summary>
public class FundamentalSubscoreJob(
    IServiceScopeFactory scopeFactory,
    ILogger<FundamentalSubscoreJob> logger) : IHostedService, IDisposable
{
    private const string JobName = "FundamentalSubscoreJob";
    private const int TargetHourEt = 5;
    private const int TargetMinuteEt = 15;
    private Timer? _timer;
    private int _runningFlag;

    public Task StartAsync(CancellationToken ct)
    {
        logger.LogInformation(
            "FundamentalSubscoreJob started. Checking every minute for {H}:{M:D2} AM ET trigger.",
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
            logger.LogError(ex, "FundamentalSubscoreJob: gating check failed; skipping tick");
            return;
        }

        await RunOnceAsync(CancellationToken.None);
    }

    /// <summary>Manual trigger — admin controller can call this for a dry run.</summary>
    public async Task<FundamentalSubscoreRunSummary> RunOnceAsync(CancellationToken ct)
    {
        if (Interlocked.CompareExchange(ref _runningFlag, 1, 0) == 1)
            throw new InvalidOperationException("FundamentalSubscoreJob already running");

        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            using var scope = scopeFactory.CreateScope();
            var svc = scope.ServiceProvider.GetRequiredService<FundamentalSubscoreService>();
            var jobState = scope.ServiceProvider.GetRequiredService<Fintrest.Api.Services.JobState.JobStateService>();

            var etNow = TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                SafeEasternZone());
            var asOf = DateOnly.FromDateTime(etNow);

            var summary = await svc.ComputeAndStoreAsync(asOf, ct);
            sw.Stop();

            logger.LogInformation(
                "FundamentalSubscoreJob complete in {Ms}ms: universe={Universe} rowsWritten={Rows} rankedTickers={Ranked}",
                sw.ElapsedMilliseconds, summary.UniverseSize, summary.RowsWritten, summary.RankedTickers);

            await jobState.MarkSuccessAsync(JobName, ct);
            return summary;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "FundamentalSubscoreJob failed");
            try
            {
                using var errScope = scopeFactory.CreateScope();
                var jobState = errScope.ServiceProvider.GetRequiredService<Fintrest.Api.Services.JobState.JobStateService>();
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

    private static TimeZoneInfo SafeEasternZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("America/New_York"); }
    }
}
