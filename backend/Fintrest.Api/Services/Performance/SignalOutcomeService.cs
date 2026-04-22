using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Performance;

/// <summary>
/// Walks market data forward from each signal's publish date, classifies the
/// outcome (target_hit / stop_hit / horizon_expired), and upserts a row in
/// <see cref="PerformanceTracking"/>. This populates the audit log that is
/// the whole credibility story of the product.
///
/// <para>
/// Idempotent: skipping already-closed rows means the nightly job is safe to
/// re-run. Signals without full reference levels (entry/stop/target) cannot
/// be evaluated and are ignored — they'll never appear in the audit log,
/// which is the right behavior.
/// </para>
///
/// <para>
/// Outcome values:
///   <c>target_hit</c> — daily high touched or exceeded the target before stop or horizon.
///   <c>stop_hit</c> — daily low touched or fell below the stop first.
///   <c>horizon_expired</c> — neither level reached within the signal's horizon.
/// </para>
///
/// <para>
/// Horizon default: 20 trading days when <c>HorizonDays</c> is null. AVOID
/// signals are scored in reverse (stop_hit is good, target_hit is bad) but
/// for MVP the job only processes BUY_TODAY + WATCH; AVOID outcome wiring
/// is a post-MVP improvement.
/// </para>
/// </summary>
public class SignalOutcomeService(AppDbContext db, ILogger<SignalOutcomeService> logger)
{
    private const int DefaultHorizonDays = 20;
    // Only evaluate directional signals for MVP. AVOID outcome semantics
    // (target = bad, stop = good) are inverted, and we'd rather ship a clean
    // win-rate number than mix them.
    private static readonly SignalType[] EligibleTypes =
    {
        SignalType.BUY_TODAY,
        SignalType.WATCH,
    };

    public async Task<SignalOutcomeRunSummary> RunOnceAsync(CancellationToken ct)
    {
        var candidates = await db.Signals
            .Where(s => EligibleTypes.Contains(s.SignalType)
                        && s.EntryLow != null
                        && s.StopLoss != null
                        && (s.TargetLow != null || s.TargetHigh != null))
            // Skip signals that already have a closed PerformanceTracking row.
            .Where(s => !db.PerformanceTracking.Any(p =>
                p.SignalId == s.Id && p.Outcome != null))
            .OrderBy(s => s.CreatedAt)
            .ToListAsync(ct);

        if (candidates.Count == 0)
        {
            logger.LogInformation("SignalOutcomeService: no candidates to evaluate");
            return new SignalOutcomeRunSummary(0, 0, 0, 0, 0);
        }

        int closedTarget = 0, closedStop = 0, closedHorizon = 0, stillOpen = 0;

        foreach (var signal in candidates)
        {
            try
            {
                var outcome = await EvaluateAsync(signal, ct);
                if (outcome is null)
                {
                    stillOpen++;
                    continue;
                }

                switch (outcome.Outcome)
                {
                    case "target_hit": closedTarget++; break;
                    case "stop_hit": closedStop++; break;
                    case "horizon_expired": closedHorizon++; break;
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "SignalOutcomeService: failed to evaluate signal {SignalId}", signal.Id);
            }
        }

        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "SignalOutcomeService: evaluated {Total} signals — target={Target} stop={Stop} horizon={Horizon} open={Open}",
            candidates.Count, closedTarget, closedStop, closedHorizon, stillOpen);

        return new SignalOutcomeRunSummary(
            candidates.Count,
            closedTarget,
            closedStop,
            closedHorizon,
            stillOpen);
    }

    /// <summary>
    /// Returns the new PerformanceTracking row when the signal has closed,
    /// null when it's still open (horizon not yet expired, no levels hit).
    /// </summary>
    private async Task<PerformanceTracking?> EvaluateAsync(Signal signal, CancellationToken ct)
    {
        var horizonDays = signal.HorizonDays ?? DefaultHorizonDays;
        var horizonEnd = signal.CreatedAt.AddDays(horizonDays * 2); // calendar buffer for weekends/holidays

        var bars = await db.MarketData
            .Where(m => m.StockId == signal.StockId
                        && m.Ts >= signal.CreatedAt
                        && m.Ts <= horizonEnd)
            .OrderBy(m => m.Ts)
            .Select(m => new { m.Ts, m.Open, m.High, m.Low, m.Close })
            .ToListAsync(ct);

        // No post-signal data yet — just keep waiting.
        if (bars.Count == 0) return null;

        var entry = signal.EntryLow!.Value;
        var stop = signal.StopLoss!.Value;
        var target = signal.TargetLow ?? signal.TargetHigh!.Value;

        double maxHigh = entry;
        double minLow = entry;
        int tradingDays = 0;

        foreach (var bar in bars)
        {
            tradingDays++;
            if (bar.High > maxHigh) maxHigh = bar.High;
            if (bar.Low < minLow) minLow = bar.Low;

            // Stop-first semantics: if both levels are touched on the same bar
            // we assume the stop was hit first (the conservative audit-log choice).
            var stopHit = bar.Low <= stop;
            var targetHit = bar.High >= target;

            if (stopHit)
                return Record(signal, entry, stop, bar.Ts, tradingDays, maxHigh, minLow, "stop_hit");

            if (targetHit)
                return Record(signal, entry, target, bar.Ts, tradingDays, maxHigh, minLow, "target_hit");

            // Horizon check in trading-day terms — the bars table is EOD only
            // so `tradingDays` is a fair proxy.
            if (tradingDays >= horizonDays)
            {
                var closePx = bar.Close;
                return Record(signal, entry, closePx, bar.Ts, tradingDays, maxHigh, minLow, "horizon_expired");
            }
        }

        // Horizon not reached, no levels hit — still open.
        return null;
    }

    private PerformanceTracking Record(
        Signal signal,
        double entry,
        double exit,
        DateTime closedAt,
        int tradingDays,
        double maxHigh,
        double minLow,
        string outcome)
    {
        var returnPct = (exit - entry) / entry * 100.0;
        var maxRunup = (maxHigh - entry) / entry * 100.0;
        var maxDrawdown = (minLow - entry) / entry * 100.0;

        var row = new PerformanceTracking
        {
            SignalId = signal.Id,
            EvaluationMode = "daily_bars",
            EntryPrice = entry,
            ExitPrice = exit,
            MaxRunupPct = Math.Round(maxRunup, 2),
            MaxDrawdownPct = Math.Round(maxDrawdown, 2),
            ReturnPct = Math.Round(returnPct, 2),
            DurationDays = tradingDays,
            Outcome = outcome,
            ClosedAt = closedAt,
            CreatedAt = DateTime.UtcNow,
        };

        db.PerformanceTracking.Add(row);

        // Keep the signal status in sync so dashboards can filter by it.
        signal.Status = outcome switch
        {
            "target_hit" => "closed_target",
            "stop_hit" => "closed_stop",
            "horizon_expired" => "closed_horizon",
            _ => signal.Status,
        };
        signal.ClosedAt = closedAt;

        return row;
    }
}

public record SignalOutcomeRunSummary(
    int Evaluated,
    int TargetHit,
    int StopHit,
    int HorizonExpired,
    int StillOpen);
