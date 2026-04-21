using Fintrest.Api.Data;
using Fintrest.Api.Services.Ingestion;
using Fintrest.Api.Services.Portfolio;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Pipeline;

/// <summary>
/// Background service that runs the daily pipeline at 6:30 AM ET Mon-Fri:
/// 1. Ingest market data
/// 2. Run scoring scan
/// 3. Update all portfolio holdings, take snapshots, run AI advisor
/// </summary>
public class DailyCronJob(
    IServiceScopeFactory scopeFactory,
    ILogger<DailyCronJob> logger) : IHostedService, IDisposable
{
    private Timer? _timer;
    private bool _isRunning;
    private static readonly TimeZoneInfo EasternZone = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");

    public Task StartAsync(CancellationToken cancellationToken)
    {
        logger.LogInformation("DailyCronJob started. Checking every minute for 6:30 AM ET trigger.");
        _timer = new Timer(CheckAndRun, null, TimeSpan.Zero, TimeSpan.FromMinutes(1));
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        logger.LogInformation("DailyCronJob stopping.");
        _timer?.Change(Timeout.Infinite, 0);
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _timer?.Dispose();
    }

    private const string JobName = "DailyCronJob";
    private const int ScheduledHourEt = 6;
    private const int ScheduledMinuteEt = 30;

    private void CheckAndRun(object? state)
    {
        if (_isRunning) return;

        // Fire-and-forget — the Timer callback is void and the gating query
        // needs DB access. If the backend was restarted after the original
        // 6:30 ET window, JobStateService will still return true so we catch
        // up on today's run instead of silently skipping a day.
        _ = CheckAndRunAsyncInternal();
    }

    private async Task CheckAndRunAsyncInternal()
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var jobState = scope.ServiceProvider.GetRequiredService<Fintrest.Api.Services.JobState.JobStateService>();
            if (!await jobState.ShouldRunAsync(JobName, ScheduledHourEt, ScheduledMinuteEt, weekdayOnly: true))
                return;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DailyCronJob: gating check failed; skipping tick");
            return;
        }

        await RunPipelineAsync(CancellationToken.None);
    }

    /// <summary>
    /// Manual trigger for testing — runs the full pipeline immediately.
    /// </summary>
    public async Task RunPipelineAsync(CancellationToken ct)
    {
        if (_isRunning)
        {
            logger.LogWarning("Pipeline already running, skipping.");
            return;
        }

        _isRunning = true;
        var sw = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ingestion = scope.ServiceProvider.GetRequiredService<DataIngestionService>();
            var scan = scope.ServiceProvider.GetRequiredService<ScanOrchestrator>();
            var portfolioService = scope.ServiceProvider.GetRequiredService<PortfolioService>();
            var advisor = scope.ServiceProvider.GetRequiredService<PortfolioAiAdvisor>();

            // Step 1: Data Ingestion
            logger.LogInformation("Pipeline Step 1: Data ingestion");
            var ingestionResult = await ingestion.IngestAllAsync(ct: ct);
            logger.LogInformation(
                "Ingestion complete: {Bars} bars, {Funds} fundamentals, {News} news",
                ingestionResult.BarsIngested, ingestionResult.FundamentalsIngested, ingestionResult.NewsIngested);

            // Step 2: Scoring Scan
            logger.LogInformation("Pipeline Step 2: Scoring scan");
            var scanResult = await scan.RunScanAsync(ct);
            logger.LogInformation("Scan complete: {Count} signals generated", scanResult.SignalsGenerated);

            // Step 3: Portfolio Updates
            logger.LogInformation("Pipeline Step 3: Portfolio updates");
            var portfolios = await db.Portfolios.ToListAsync(ct);
            var portfolioErrors = 0;

            foreach (var portfolio in portfolios)
            {
                try
                {
                    await portfolioService.UpdateHoldingPrices(portfolio.Id);
                    await portfolioService.TakeSnapshot(portfolio.Id);
                    await advisor.AnalyzePortfolio(portfolio.Id);
                }
                catch (Exception ex)
                {
                    portfolioErrors++;
                    logger.LogWarning(ex, "Failed to update portfolio {Id}", portfolio.Id);
                }
            }

            sw.Stop();
            logger.LogInformation(
                "Daily pipeline complete in {Ms}ms: {Portfolios} portfolios updated, {Errors} errors",
                sw.ElapsedMilliseconds, portfolios.Count, portfolioErrors);

            var jobState = scope.ServiceProvider.GetRequiredService<Fintrest.Api.Services.JobState.JobStateService>();
            await jobState.MarkSuccessAsync(JobName, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Daily pipeline failed after {Ms}ms", sw.ElapsedMilliseconds);
            try
            {
                using var errScope = scopeFactory.CreateScope();
                var jobState = errScope.ServiceProvider.GetRequiredService<Fintrest.Api.Services.JobState.JobStateService>();
                await jobState.MarkErrorAsync(JobName, ex.Message, ct);
            }
            catch { /* best-effort error logging */ }
        }
        finally
        {
            _isRunning = false;
        }
    }
}
