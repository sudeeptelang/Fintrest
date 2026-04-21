using System.Diagnostics;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Scoring.V3;

/// <summary>
/// Nightly Information Coefficient tracker. Ticks every minute; fires at
/// 5:30 AM ET Mon–Fri — before <see cref="FeaturePopulationJob"/> (5:45)
/// and well before the v2 scan at 6:30.
///
/// <para>
/// For each algorithm identifier, the job will eventually compute the Spearman
/// rank correlation between the algorithm's score (as of <c>trade_date - H</c>)
/// and the realised forward return over horizons H ∈ {5, 21, 60} trading days,
/// then persist one row per (algorithm × regime) to <c>algorithm_ic_history</c>.
/// That computation is intentionally <b>not yet wired</b> — this commit only
/// ships the scaffolding (timer + interlock + manual trigger + run-log) so the
/// §14.0 roadmap item in <c>docs/SIGNALS_V3.md</c> has a home to land in.
/// </para>
///
/// <para>
/// Why no computation yet: the schema in migration 014 is coarser than the
/// §14.0 target (no <c>sector</c> / <c>ic_pvalue</c> / <c>turnover</c> / 60d
/// horizon column). The next commit will extend the schema + backfill history;
/// after that, this job starts writing real rows.
/// </para>
/// </summary>
public class AlgorithmIcTrackingJob(
    IServiceScopeFactory scopeFactory,
    ILogger<AlgorithmIcTrackingJob> logger) : IHostedService, IDisposable
{
    private Timer? _timer;
    // 0 = idle, 1 = running. Interlocked-backed mutex; see FeaturePopulationJob
    // for rationale (CompareExchange doesn't take bool).
    private int _runningFlag;
    private bool _running => Volatile.Read(ref _runningFlag) == 1;
    private DateOnly _lastRunDate;
    private static readonly TimeZoneInfo EasternZone =
        TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");

    // 5:30 AM ET — 15 minutes ahead of FeaturePopulationJob so the previous
    // day's realised returns are locked in before the new feature batch runs.
    private const int TargetHourEt = 5;
    private const int TargetMinuteEt = 30;

    public Task StartAsync(CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "AlgorithmIcTrackingJob started. Checking every minute for {H}:{M:D2} AM ET trigger.",
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

    /// <summary>
    /// Manual-trigger entry point. Currently a no-op that logs what it would
    /// have done; future commits will wire in the rank-IC computation.
    /// </summary>
    public async Task<AlgorithmIcRunSummary> RunOnceAsync(DateOnly tradeDate, CancellationToken ct)
    {
        if (Interlocked.CompareExchange(ref _runningFlag, 1, 0) == 1)
            throw new InvalidOperationException("AlgorithmIcTrackingJob already running");

        var sw = Stopwatch.StartNew();
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Skeleton only: count how many algorithms currently have scores on
            // this trade_date so the log line is informative even without
            // computing IC. Zero is fine and expected on days before v3 scoring
            // is wired to actually score.
            //
            // NOTE: the `algorithms` join target doesn't exist yet as a first-
            // class entity; for now we infer the algorithm set from the
            // features table's distinct feature_name column, which is a good-
            // enough proxy. This loose coupling lets us start populating
            // IC history the moment v3 writes its first real scores.
            var algoCount = await db.Features
                .AsNoTracking()
                .Where(f => f.Date == tradeDate)
                .Select(f => f.FeatureName)
                .Distinct()
                .CountAsync(ct);

            logger.LogInformation(
                "AlgorithmIcTrackingJob(stub) trade_date={TradeDate} distinct_features={Algos} — computation not yet wired, no rows written to algorithm_ic_history.",
                tradeDate, algoCount);

            return new AlgorithmIcRunSummary(
                TradeDate: tradeDate,
                AlgorithmCount: algoCount,
                RowsWritten: 0,
                DurationMs: sw.ElapsedMilliseconds,
                IsStub: true);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AlgorithmIcTrackingJob(stub) failed for trade_date={TradeDate}", tradeDate);
            throw;
        }
        finally
        {
            Interlocked.Exchange(ref _runningFlag, 0);
        }
    }
}

/// <summary>Lightweight run summary returned by the manual trigger / admin API.</summary>
public record AlgorithmIcRunSummary(
    DateOnly TradeDate,
    int AlgorithmCount,
    int RowsWritten,
    long DurationMs,
    bool IsStub);
