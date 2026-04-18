using System.Diagnostics;
using System.Text.Json;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Fintrest.Api.Services.Scoring.V3;

/// <summary>
/// Nightly feature population batch. Ticks every minute; fires at 5:45 AM ET
/// Mon–Fri so it completes before the v2 scan at 6:30. Writes one row per
/// (ticker × feature) to the <c>features</c> table via <see cref="FeatureBulkRepository"/>,
/// and records a health summary in <c>feature_run_log</c>.
///
/// <para>
/// v3 scoring is NOT wired to consume these features yet — that happens in
/// Milestone 3. Until then, this job exists purely to validate the pipeline,
/// build up IC history, and let us spot-check feature correctness against the
/// v2 in-memory scorer.
/// </para>
/// </summary>
public class FeaturePopulationJob(
    IServiceScopeFactory scopeFactory,
    ILogger<FeaturePopulationJob> logger) : IHostedService, IDisposable
{
    private Timer? _timer;
    // Interlocked-backed mutex around the job body. 0 = idle, 1 = running.
    // Using int not bool because Interlocked.CompareExchange doesn't support bool.
    private int _runningFlag;
    private bool _running => Volatile.Read(ref _runningFlag) == 1;
    private DateOnly _lastRunDate;
    private static readonly TimeZoneInfo EasternZone =
        TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");

    // Target time: 5:45 AM ET, before the 6:30 AM v2 scan.
    private const int TargetHourEt = 5;
    private const int TargetMinuteEt = 45;

    public Task StartAsync(CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "FeaturePopulationJob started. Checking every minute for {H}:{M:D2} AM ET trigger.",
            TargetHourEt, TargetMinuteEt);
        _timer = new Timer(Tick, null, TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(1));
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _timer?.Change(Timeout.Infinite, 0);
        return Task.CompletedTask;
    }

    public void Dispose() => _timer?.Dispose();

    private void Tick(object? state)
    {
        if (_running) return;

        var etNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, EasternZone);
        if (etNow.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) return;
        if (etNow.Hour != TargetHourEt || etNow.Minute != TargetMinuteEt) return;

        var today = DateOnly.FromDateTime(etNow);
        if (today == _lastRunDate) return;
        _lastRunDate = today;

        _ = RunOnceAsync(today, CancellationToken.None);
    }

    /// <summary>Manual-trigger entry point — used by the admin controller for dry runs.</summary>
    public async Task<FeatureRunLog> RunOnceAsync(DateOnly tradeDate, CancellationToken ct)
    {
        // Atomic compare-exchange: only one caller wins the _running flag.
        if (Interlocked.CompareExchange(ref _runningFlag, 1, 0) == 1)
            throw new InvalidOperationException("FeaturePopulationJob already running");

        var sw = Stopwatch.StartNew();
        var log = new FeatureRunLog { TradeDate = tradeDate };
        var rowsWritten = new Dictionary<string, int>();
        var errorCount  = new Dictionary<string, int>();
        var allRows     = new List<FeatureRow>();

        try
        {
            using var scope = scopeFactory.CreateScope();
            var db       = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var bulk     = scope.ServiceProvider.GetRequiredService<FeatureBulkRepository>();
            var features = scope.ServiceProvider.GetRequiredService<IEnumerable<IFeature>>().ToList();

            db.Set<FeatureRunLog>().Add(log);
            await db.SaveChangesAsync(ct);
            // 1. Load the active universe + last 300 bars per ticker (covers RSI / ROC / MA200).
            var stocks = await db.Stocks
                .Where(s => s.Active)
                .ToListAsync(ct);
            var stockIds = stocks.Select(s => s.Id).ToList();
            log.UniverseSize = stocks.Count;

            var barCutoff = DateTime.UtcNow.AddDays(-400);
            var allBars = await db.MarketData
                .Where(m => stockIds.Contains(m.StockId) && m.Ts >= barCutoff)
                .OrderBy(m => m.Ts)
                .ToListAsync(ct);

            var stockById = stocks.ToDictionary(s => s.Id);
            var barsByTicker = allBars
                .GroupBy(m => m.StockId)
                .ToDictionary(
                    g => stockById[g.Key].Ticker,
                    g => (IReadOnlyList<MarketData>)g.OrderBy(m => m.Ts).ToList());

            var ctx = new FeatureComputationContext
            {
                TradeDate       = tradeDate,
                UniverseTickers = stocks.Select(s => s.Ticker).ToList(),
                BarsByTicker    = barsByTicker,
                StocksByTicker  = stocks.ToDictionary(s => s.Ticker),
                // SectorBars left empty for M2.1; M2.2 populates it.
            };

            // 2. For each enabled feature, walk the universe and compute.
            foreach (var feature in features.Where(f => f.IsEnabled(ctx)))
            {
                int written = 0, errors = 0;
                foreach (var ticker in ctx.UniverseTickers)
                {
                    try
                    {
                        var output = await feature.ComputeAsync(ticker, ctx, ct);
                        if (output is null) continue;
                        allRows.Add(new FeatureRow
                        {
                            Ticker      = ticker,
                            Date        = tradeDate,
                            FeatureName = feature.Name,
                            Value       = output.Value.Value,
                            AsOfTs      = output.Value.AsOfTs,
                            Source      = feature.Source,
                        });
                        written++;
                    }
                    catch (Exception ex)
                    {
                        errors++;
                        logger.LogWarning(ex, "Feature {Feature} failed for {Ticker}", feature.Name, ticker);
                    }
                }
                rowsWritten[feature.Name] = written;
                errorCount[feature.Name]  = errors;
                logger.LogInformation(
                    "Feature {Name}: {Written}/{Total} computed, {Errors} errors",
                    feature.Name, written, ctx.UniverseTickers.Count, errors);
            }

            // 3. One bulk COPY for the entire run.
            var affected = await bulk.UpsertAsync(allRows, ct);

            // 4. Finalize the run log.
            sw.Stop();
            log.EndedAt         = DateTime.UtcNow;
            log.RowsWrittenJson = JsonSerializer.Serialize(rowsWritten);
            log.ErrorCountJson  = JsonSerializer.Serialize(errorCount);
            log.SectorFallbacks = ctx.Counters.SectorFallbacks;
            log.ProviderCallsJson = JsonSerializer.Serialize(new
            {
                polygon = ctx.Counters.Polygon,
                fmp     = ctx.Counters.Fmp,
                finnhub = ctx.Counters.Finnhub,
                fred    = ctx.Counters.Fred,
            });
            log.Status = ClassifyRun(rowsWritten, errorCount, ctx.UniverseTickers.Count);

            await db.SaveChangesAsync(ct);

            logger.LogInformation(
                "FeaturePopulationJob complete: {Rows} rows in {Ms}ms, status={Status}",
                affected, sw.ElapsedMilliseconds, log.Status);

            return log;
        }
        catch (Exception ex)
        {
            sw.Stop();
            log.EndedAt = DateTime.UtcNow;
            log.Status  = "red";
            log.ErrorCountJson = JsonSerializer.Serialize(new { fatal = ex.Message });
            // Best-effort fail-status save on a FRESH scope — the original scope's
            // DbContext may be in a broken state after the primary error.
            try
            {
                using var recoveryScope = scopeFactory.CreateScope();
                var recoveryDb = recoveryScope.ServiceProvider.GetRequiredService<AppDbContext>();
                recoveryDb.Attach(log);
                recoveryDb.Entry(log).State = EntityState.Modified;
                await recoveryDb.SaveChangesAsync(ct);
            }
            catch { /* best effort */ }
            logger.LogError(ex, "FeaturePopulationJob failed after {Ms}ms", sw.ElapsedMilliseconds);
            throw;
        }
        finally
        {
            Interlocked.Exchange(ref _runningFlag, 0);
        }
    }

    /// <summary>
    /// Emergency reset for the running flag, exposed so an admin endpoint can
    /// clear a stuck state if a previous run crashed in a way that somehow
    /// skipped the finally block. Does NOT interrupt an actually-running job.
    /// </summary>
    public void ForceResetRunningFlag() => Interlocked.Exchange(ref _runningFlag, 0);

    /// <summary>Green = every feature covered ≥ 98% with ≤ 5 errors. Yellow = partial. Red = fatal.</summary>
    private static string ClassifyRun(
        Dictionary<string, int> rowsWritten,
        Dictionary<string, int> errorCount,
        int universeSize)
    {
        if (rowsWritten.Count == 0) return "red";
        var threshold = (int)(universeSize * 0.98);
        foreach (var (name, written) in rowsWritten)
        {
            if (written < threshold) return "yellow";
            if (errorCount.GetValueOrDefault(name) > 5) return "yellow";
        }
        return "green";
    }
}
