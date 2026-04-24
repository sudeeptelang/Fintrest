using Fintrest.Api.Services.JobState;

namespace Fintrest.Api.Services.Ingestion;

/// <summary>
/// Intraday live-quote refresh during US market hours. Fires at fixed
/// minute marks inside the 9:30 AM – 4:00 PM ET window every weekday
/// (every 15 minutes by default), plus one post-close tick at 4:15 PM
/// for the final close. Pulls FMP /quote in batches for the top-500
/// active tickers and upserts live_quotes; the screener overlays
/// the table onto its EOD bars so users see today's move.
///
/// Same IHostedService + Timer + JobStateService pattern as every
/// other cron in the project. Multiple fire slots per day, each
/// independently gated so one skipped tick doesn't cascade.
/// </summary>
public class LiveQuoteRefreshJob(
    IServiceScopeFactory scopeFactory,
    ILogger<LiveQuoteRefreshJob> logger) : IHostedService, IDisposable
{
    // Fire times in ET. Every 15 min during the cash session + post-close tick.
    private static readonly (int Hour, int Minute, string Label)[] _slots = BuildSlots();

    private static (int, int, string)[] BuildSlots()
    {
        var slots = new List<(int, int, string)>();
        // 9:45 AM ET (15 min after open) through 4:00 PM ET (close), every 15 min.
        for (var mins = (9 * 60 + 45); mins <= (16 * 60); mins += 15)
        {
            slots.Add((mins / 60, mins % 60, $"{mins / 60:D2}{mins % 60:D2}"));
        }
        // Post-close sanity refresh — ensures the closing print is in the cache.
        slots.Add((16, 15, "post-close"));
        return slots.ToArray();
    }

    private Timer? _timer;
    private int _runningFlag;

    public Task StartAsync(CancellationToken ct)
    {
        logger.LogInformation(
            "LiveQuoteRefreshJob started. {N} slots per day (ET): 9:45 → 16:15 every 15 min.",
            _slots.Length);
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
        foreach (var slot in _slots)
        {
            var jobName = $"LiveQuoteRefreshJob:{slot.Label}";
            try
            {
                using var scope = scopeFactory.CreateScope();
                var jobState = scope.ServiceProvider.GetRequiredService<JobStateService>();
                if (!await jobState.ShouldRunAsync(jobName, slot.Hour, slot.Minute, weekdayOnly: true))
                    continue;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "LiveQuoteRefreshJob: gating check failed for {Slot}", slot.Label);
                continue;
            }

            await RunSlotAsync(jobName, CancellationToken.None);
        }
    }

    private async Task RunSlotAsync(string jobName, CancellationToken ct)
    {
        if (Interlocked.CompareExchange(ref _runningFlag, 1, 0) == 1) return;
        try
        {
            using var scope = scopeFactory.CreateScope();
            var svc = scope.ServiceProvider.GetRequiredService<LiveQuoteService>();
            var jobState = scope.ServiceProvider.GetRequiredService<JobStateService>();

            var summary = await svc.RefreshTopAsync(500, ct);
            logger.LogInformation(
                "LiveQuoteRefreshJob ({Job}) done — {Req}/{Fetched}/{Persisted} req/fetched/persisted in {Ms}ms",
                jobName, summary.Requested, summary.Fetched, summary.Persisted, summary.ElapsedMs);

            await jobState.MarkSuccessAsync(jobName, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "LiveQuoteRefreshJob ({Job}) failed", jobName);
            try
            {
                using var errScope = scopeFactory.CreateScope();
                var jobState = errScope.ServiceProvider.GetRequiredService<JobStateService>();
                await jobState.MarkErrorAsync(jobName, ex.Message, ct);
            }
            catch { /* best-effort */ }
        }
        finally
        {
            Interlocked.Exchange(ref _runningFlag, 0);
        }
    }
}
