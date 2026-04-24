using Fintrest.Api.Services.JobState;

namespace Fintrest.Api.Services.Providers.Edgar;

/// <summary>
/// Nightly SEC EDGAR Form 4 ingest. Fires at 8:00 PM ET weekdays — just
/// after the day's last filings settle on EDGAR. Uses the same
/// IHostedService + Timer + JobStateService pattern as the other
/// scheduled jobs so a backend restart mid-day doesn't silently skip.
///
/// Idempotent: the downstream EdgarIngestService dedupes on
/// (accession_number, insider_cik, date, shares, code), so re-running
/// is safe for backfill.
/// </summary>
public class EdgarIngestJob(
    IServiceScopeFactory scopeFactory,
    ILogger<EdgarIngestJob> logger) : IHostedService, IDisposable
{
    private const string JobName = "EdgarIngestJob";
    private const int TargetHourEt = 20;
    private const int TargetMinuteEt = 0;
    private Timer? _timer;
    private int _runningFlag;

    public Task StartAsync(CancellationToken ct)
    {
        logger.LogInformation(
            "EdgarIngestJob started. Checking every minute for {H}:{M:D2} ET trigger.",
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
            logger.LogError(ex, "EdgarIngestJob: gating check failed; skipping tick");
            return;
        }

        // Ingest the US trading day that just closed (today ET) + one
        // day back in case late filings trickled in after yesterday's run.
        var etNow = TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow,
            SafeEasternZone());
        await RunForDatesAsync(new[] { etNow.Date.AddDays(-1), etNow.Date }, CancellationToken.None);
    }

    /// <summary>Manual entry point — admin can call this to backfill or force a run.</summary>
    public async Task<List<EdgarIngestService.IngestSummary>> RunOnceAsync(
        DateTime[]? dates = null,
        CancellationToken ct = default)
    {
        dates ??= new[] { DateTime.UtcNow.Date };
        return await RunForDatesAsync(dates, ct);
    }

    private async Task<List<EdgarIngestService.IngestSummary>> RunForDatesAsync(
        DateTime[] dates,
        CancellationToken ct)
    {
        if (Interlocked.CompareExchange(ref _runningFlag, 1, 0) == 1)
            throw new InvalidOperationException("EdgarIngestJob already running");

        var sw = System.Diagnostics.Stopwatch.StartNew();
        var summaries = new List<EdgarIngestService.IngestSummary>();
        try
        {
            using var scope = scopeFactory.CreateScope();
            var svc = scope.ServiceProvider.GetRequiredService<EdgarIngestService>();
            var jobState = scope.ServiceProvider.GetRequiredService<JobStateService>();

            foreach (var d in dates.OrderBy(d => d))
            {
                var s = await svc.IngestDateAsync(d, ct);
                summaries.Add(s);
            }

            sw.Stop();
            var totalUpserted = summaries.Sum(s => s.TransactionsUpserted);
            var totalFilings = summaries.Sum(s => s.Form4Filings);
            logger.LogInformation(
                "EdgarIngestJob done in {Ms}ms — {Dates} day(s), {Form4} Form 4 filings, {Tx} transactions upserted",
                sw.ElapsedMilliseconds, summaries.Count, totalFilings, totalUpserted);

            await jobState.MarkSuccessAsync(JobName, ct);
            return summaries;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "EdgarIngestJob failed");
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

    private static TimeZoneInfo SafeEasternZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("America/New_York"); }
    }
}
