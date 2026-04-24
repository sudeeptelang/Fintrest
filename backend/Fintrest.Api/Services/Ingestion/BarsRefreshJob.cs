using Fintrest.Api.Data;
using Fintrest.Api.Services.JobState;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Ingestion;

/// <summary>
/// Intraday bars refresh for the top active stocks. Previously we had
/// no scheduled market_data refresh — users would see stale prices on
/// the Movers grid ("INTC up 22% today doesn't show") because the
/// only path to bump bars was a manual /admin/ingest call.
///
/// Fires twice on weekdays: 12:00 PM ET (mid-session) and 4:15 PM ET
/// (15 min after close — ensures today's closing print is in the DB
/// for evening users browsing Top Gainers). Bars-only, top 500 active
/// stocks by market cap, parallel at 8. Typical run ~60-90s.
///
/// Heavier per-run than the FMP-specific jobs but still well inside
/// the provider rate limits. If cost becomes a concern, narrow the
/// top-N or drop to once-daily.
/// </summary>
public class BarsRefreshJob(
    IServiceScopeFactory scopeFactory,
    ILogger<BarsRefreshJob> logger) : IHostedService, IDisposable
{
    // Two fire windows per weekday. Each tuple is (hourEt, minuteEt,
    // label). The Timer ticks every minute and the JobStateService
    // gates duplicate fires.
    private static readonly (int Hour, int Minute, string Label)[] _slots = new[]
    {
        (12, 0, "midday"),
        (16, 15, "post-close"),
    };

    private Timer? _timer;
    private int _runningFlag;

    public Task StartAsync(CancellationToken ct)
    {
        logger.LogInformation(
            "BarsRefreshJob started. Slots (ET): {Slots}",
            string.Join(", ", _slots.Select(s => $"{s.Hour}:{s.Minute:D2} {s.Label}")));
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
            var jobName = $"BarsRefreshJob:{slot.Label}";
            try
            {
                using var scope = scopeFactory.CreateScope();
                var jobState = scope.ServiceProvider.GetRequiredService<JobStateService>();
                if (!await jobState.ShouldRunAsync(jobName, slot.Hour, slot.Minute, weekdayOnly: true))
                    continue;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "BarsRefreshJob: gating check failed for slot {Slot}; skipping", slot.Label);
                continue;
            }

            await RunOnceAsync(jobName, CancellationToken.None);
        }
    }

    /// <summary>Manual trigger — admin endpoint can call this if the
    /// ticker-scoped /admin/ingest/top-caps isn't specific enough.</summary>
    public async Task<RunSummary> RunOnceAsync(string jobName, CancellationToken ct)
    {
        if (Interlocked.CompareExchange(ref _runningFlag, 1, 0) == 1)
            throw new InvalidOperationException("BarsRefreshJob already running");

        var sw = System.Diagnostics.Stopwatch.StartNew();
        int requested = 0, succeeded = 0, failed = 0, totalBars = 0;
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ingestion = scope.ServiceProvider.GetRequiredService<DataIngestionService>();
            var jobState = scope.ServiceProvider.GetRequiredService<JobStateService>();

            var tickers = await db.Stocks
                .AsNoTracking()
                .Where(s => s.Active)
                .OrderByDescending(s => s.MarketCap ?? 0)
                .Select(s => s.Ticker)
                .Take(500)
                .ToListAsync(ct);
            requested = tickers.Count;

            using var gate = new SemaphoreSlim(8);
            var tasks = tickers.Select(async t =>
            {
                await gate.WaitAsync(ct);
                try
                {
                    var r = await ingestion.IngestStockAsync(t, ct, backfill: false, barsOnly: true);
                    Interlocked.Increment(ref succeeded);
                    Interlocked.Add(ref totalBars, r.Bars);
                }
                catch
                {
                    Interlocked.Increment(ref failed);
                }
                finally
                {
                    gate.Release();
                }
            });
            await Task.WhenAll(tasks);

            sw.Stop();
            logger.LogInformation(
                "BarsRefreshJob ({Job}) done in {Ms}ms — {Req} requested, {OK} ok, {Fail} failed, {Bars} bars",
                jobName, sw.ElapsedMilliseconds, requested, succeeded, failed, totalBars);

            await jobState.MarkSuccessAsync(jobName, ct);
            return new RunSummary(requested, succeeded, failed, totalBars, sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "BarsRefreshJob ({Job}) failed", jobName);
            try
            {
                using var errScope = scopeFactory.CreateScope();
                var jobState = errScope.ServiceProvider.GetRequiredService<JobStateService>();
                await jobState.MarkErrorAsync(jobName, ex.Message, ct);
            }
            catch { /* best-effort */ }
            throw;
        }
        finally
        {
            Interlocked.Exchange(ref _runningFlag, 0);
        }
    }

    public record RunSummary(int Requested, int Succeeded, int Failed, int TotalBars, long ElapsedMs);
}
