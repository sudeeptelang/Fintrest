using Fintrest.Api.Services.Providers.Contracts;
using Fintrest.Api.Services.Scoring;
using Microsoft.Extensions.Options;

namespace Fintrest.Api.Services.Pipeline;

/// <summary>
/// Polls SPY + VIX every N minutes during US market hours. When SPY moves more than the
/// configured % from prior close (or VIX spikes), triggers a "drift" scan that re-evaluates
/// every stock with the live regime. That re-evaluation matters because:
///
///  • Regime-conditional weights flip (Bull → Bear weight set dramatically re-ranks picks)
///  • The regime tilt (±15 pts across every factor) shifts borderline WATCH stocks into/out of BUY_TODAY
///
/// This solves the "signals freeze from 6:30 AM to next morning" problem — if the tape turns,
/// so do the signals. Cooldown + max-per-day caps prevent a choppy session from storming scans.
/// </summary>
public class IntradayDriftJob(
    IServiceScopeFactory scopeFactory,
    ILogger<IntradayDriftJob> logger,
    IOptions<ScoringOptions> options) : IHostedService, IDisposable
{
    private Timer? _timer;
    private bool _running;
    private DateTime _lastTrigger = DateTime.MinValue;
    private int _triggersToday;
    private DateOnly _countedDay;
    private static readonly TimeZoneInfo EasternZone =
        TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");

    private DriftOptions Cfg => options.Value.Drift;

    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (!Cfg.Enabled)
        {
            logger.LogInformation("IntradayDriftJob disabled via config.");
            return Task.CompletedTask;
        }
        var interval = TimeSpan.FromMinutes(Math.Max(1, Cfg.CheckIntervalMinutes));
        logger.LogInformation(
            "IntradayDriftJob started (interval={Min}m, SPY>{Spy}%, VIX>{Vix}%, cooldown={Cd}m, max/day={Max})",
            Cfg.CheckIntervalMinutes, Cfg.SpyMovePct, Cfg.VixSpikePct,
            Cfg.CooldownMinutes, Cfg.MaxPerDay);
        _timer = new Timer(Check, null, TimeSpan.FromMinutes(2), interval);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _timer?.Change(Timeout.Infinite, 0);
        return Task.CompletedTask;
    }

    public void Dispose() => _timer?.Dispose();

    private void Check(object? state)
    {
        if (_running) return;
        _ = CheckAsync();
    }

    private async Task CheckAsync()
    {
        _running = true;
        try
        {
            var easternNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, EasternZone);
            if (!IsMarketHours(easternNow)) return;

            // Reset daily counter at first check of each trading day.
            var today = DateOnly.FromDateTime(easternNow);
            if (today != _countedDay)
            {
                _countedDay = today;
                _triggersToday = 0;
            }
            if (_triggersToday >= Cfg.MaxPerDay) return;

            // Cooldown since last drift trigger.
            if (DateTime.UtcNow - _lastTrigger < TimeSpan.FromMinutes(Cfg.CooldownMinutes)) return;

            using var scope = scopeFactory.CreateScope();
            var marketProvider = scope.ServiceProvider.GetRequiredService<IMarketDataProvider>();

            var spy = await marketProvider.GetSnapshotAsync("SPY");
            if (spy is null) return;

            double spyMove = spy.ChangePercent;
            double? vixLevel = null, vixChange = null;

            // VIX via providers that accept the index symbol — silently ignored if unsupported.
            // Polygon uses the "I:VIX" prefix for CBOE indices; VIXY is the tradable ETF proxy.
            // "^VIX" was the Yahoo-style notation and 404s on Polygon, so we don't probe it anymore.
            try
            {
                var vix = await marketProvider.GetSnapshotAsync("I:VIX")
                       ?? await marketProvider.GetSnapshotAsync("VIXY");
                if (vix is not null)
                {
                    vixLevel = vix.Price;
                    vixChange = vix.ChangePercent;
                }
            }
            catch { /* VIX optional */ }

            var spyTriggered = Math.Abs(spyMove) >= Cfg.SpyMovePct;
            var vixTriggered = vixChange.HasValue && vixChange.Value >= Cfg.VixSpikePct;
            if (!spyTriggered && !vixTriggered) return;

            var reason = spyTriggered && vixTriggered
                ? $"SPY {spyMove:+0.00;-0.00}%, VIX +{vixChange:F1}%"
                : spyTriggered
                    ? $"SPY {spyMove:+0.00;-0.00}%"
                    : $"VIX +{vixChange:F1}%";

            logger.LogWarning("Drift trigger armed: {Reason} — launching intraday rescan", reason);

            var orchestrator = scope.ServiceProvider.GetRequiredService<ScanOrchestrator>();
            var trigger = new DriftTrigger(spyMove, vixLevel, vixChange, reason);
            var result = await orchestrator.RunScanAsync("drift", trigger, CancellationToken.None);

            _lastTrigger = DateTime.UtcNow;
            _triggersToday++;
            logger.LogInformation(
                "Drift scan {Id} complete — {Signals} signals in {Ms}ms ({Today}/{Max} today)",
                result.ScanRunId, result.SignalsGenerated, result.DurationMs,
                _triggersToday, Cfg.MaxPerDay);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "IntradayDriftJob check failed");
        }
        finally
        {
            _running = false;
        }
    }

    /// <summary>Mon–Fri, 9:30 AM–4:00 PM ET. Runs only during regular session.</summary>
    private static bool IsMarketHours(DateTime easternNow)
    {
        if (easternNow.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) return false;
        var minutes = easternNow.Hour * 60 + easternNow.Minute;
        const int open = 9 * 60 + 30;
        const int close = 16 * 60;
        return minutes >= open && minutes <= close;
    }
}
