using Fintrest.Api.Data;
using Fintrest.Api.Services.JobState;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Nightly FMP short-interest refresh across the active universe.
/// Fires at 7:00 PM ET weekdays — one hour before EDGAR ingest — so
/// by the time the InsiderScoreJob runs at 8:45 PM ET both Phase 1
/// (insider) and Phase 2 (short) data are fresh.
///
/// FINRA actually publishes bi-monthly, so most days are no-ops from
/// FMP's side; running daily keeps cadence simple and covers
/// publication-day freshness without a bi-monthly cron. The
/// ShortInterestService.FetchAndStoreAsync is idempotent (upsert by
/// settlement date), so re-runs are safe.
///
/// Same IHostedService + Timer + JobStateService pattern as the
/// other scheduled jobs.
/// </summary>
public class ShortInterestJob(
    IServiceScopeFactory scopeFactory,
    ILogger<ShortInterestJob> logger) : IHostedService, IDisposable
{
    private const string JobName = "ShortInterestJob";
    private const int TargetHourEt = 19;
    private const int TargetMinuteEt = 0;
    private Timer? _timer;
    private int _runningFlag;

    public Task StartAsync(CancellationToken ct)
    {
        logger.LogInformation(
            "ShortInterestJob started. Checking every minute for {H}:{M:D2} ET trigger.",
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
            logger.LogError(ex, "ShortInterestJob: gating check failed; skipping tick");
            return;
        }

        await RunOnceAsync(CancellationToken.None);
    }

    /// <summary>Manual entry point — admin endpoint can call this to
    /// force a full-universe refresh instead of a ticker-scoped one.</summary>
    public async Task<RunSummary> RunOnceAsync(CancellationToken ct)
    {
        if (Interlocked.CompareExchange(ref _runningFlag, 1, 0) == 1)
            throw new InvalidOperationException("ShortInterestJob already running");

        var sw = System.Diagnostics.Stopwatch.StartNew();
        int scanned = 0, persisted = 0, failed = 0;
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var svc = scope.ServiceProvider.GetRequiredService<ShortInterestService>();
            var jobState = scope.ServiceProvider.GetRequiredService<JobStateService>();

            // Active universe, ranked by market cap. Capped at 1500 so one
            // full refresh stays inside the FMP Premier minute budget
            // (750/min; 1500 / 9 rps = ~3 min).
            var tickers = await db.Stocks
                .AsNoTracking()
                .Where(s => s.Active)
                .OrderByDescending(s => s.MarketCap ?? 0)
                .Select(s => s.Ticker)
                .Take(1500)
                .ToListAsync(ct);

            foreach (var t in tickers)
            {
                scanned++;
                try
                {
                    var r = await svc.FetchAndStoreAsync(t, ct);
                    if (r.Persisted) persisted++;
                }
                catch (Exception ex)
                {
                    failed++;
                    logger.LogDebug(ex, "ShortInterestJob: FMP fetch failed for {Ticker}", t);
                }
            }

            sw.Stop();
            logger.LogInformation(
                "ShortInterestJob done in {Ms}ms — scanned {N}, persisted {P}, failed {F}",
                sw.ElapsedMilliseconds, scanned, persisted, failed);

            await jobState.MarkSuccessAsync(JobName, ct);
            return new RunSummary(scanned, persisted, failed, sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "ShortInterestJob failed");
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

    public record RunSummary(int Scanned, int Persisted, int Failed, long ElapsedMs);
}
