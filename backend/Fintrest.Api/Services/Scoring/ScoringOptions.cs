namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// All scoring parameters — weights, regime-conditional weights, thresholds, tilt magnitudes.
/// Loaded from appsettings.json "Scoring" section so tuning doesn't require a recompile.
/// </summary>
public class ScoringOptions
{
    public const string SectionName = "Scoring";

    /// <summary>Default factor weights — sum should be ~1.0.</summary>
    public FactorWeights Weights { get; set; } = FactorWeights.Default();

    /// <summary>Regime-specific weight overrides. Orchestrator picks a set based on MarketRegime.</summary>
    public RegimeWeightSet RegimeWeights { get; set; } = new();

    /// <summary>Score thresholds that bucket total into BUY_TODAY / WATCH / HIGH_RISK / AVOID.</summary>
    public SignalThresholds Thresholds { get; set; } = new();

    /// <summary>Max ± points a factor score can shift due to regime context.</summary>
    public double RegimeTiltCap { get; set; } = 15.0;

    /// <summary>True = score factors via cross-sectional percentile rank across today's universe.</summary>
    public bool UsePercentileRanking { get; set; } = true;

    /// <summary>Minimum universe size before percentile ranking activates (else falls back to raw).</summary>
    public int MinUniverseForRanking { get; set; } = 20;

    /// <summary>Intraday drift detection + rescan settings.</summary>
    public DriftOptions Drift { get; set; } = new();
}

public class DriftOptions
{
    /// <summary>Master on/off switch for the intraday drift watcher.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>How often the drift watcher polls during market hours (minutes).</summary>
    public int CheckIntervalMinutes { get; set; } = 15;

    /// <summary>|SPY today % move| above this triggers a drift rescan.</summary>
    public double SpyMovePct { get; set; } = 1.0;

    /// <summary>VIX % change above this triggers a drift rescan.</summary>
    public double VixSpikePct { get; set; } = 15.0;

    /// <summary>Minimum minutes between drift rescans — prevents a choppy tape from storming scans.</summary>
    public int CooldownMinutes { get; set; } = 90;

    /// <summary>Maximum drift rescans per trading day.</summary>
    public int MaxPerDay { get; set; } = 2;
}

public class FactorWeights
{
    public double Momentum { get; set; }
    public double Volume { get; set; }
    public double Catalyst { get; set; }
    public double Fundamental { get; set; }
    public double Sentiment { get; set; }
    public double Trend { get; set; }
    public double Risk { get; set; }

    public double Apply(ScoringEngineV2.ScoreBreakdown b) =>
        b.Momentum * Momentum +
        b.Volume * Volume +
        b.Catalyst * Catalyst +
        b.Fundamental * Fundamental +
        b.Sentiment * Sentiment +
        b.Trend * Trend +
        b.Risk * Risk;

    public static FactorWeights Default() => new()
    {
        Momentum = 0.22,
        Volume = 0.12,
        Catalyst = 0.15,
        Fundamental = 0.18,
        Sentiment = 0.10,
        Trend = 0.13,
        Risk = 0.10,
    };
}

public class RegimeWeightSet
{
    public FactorWeights? Bull { get; set; }
    public FactorWeights? Bear { get; set; }
    public FactorWeights? HighVol { get; set; }
    public FactorWeights? Neutral { get; set; }

    /// <summary>Pick the most appropriate weight set for the current regime.</summary>
    public FactorWeights Pick(MarketRegime regime, FactorWeights fallback)
    {
        if (regime.IsFearSpike && HighVol is not null) return HighVol;
        if (regime.IsRiskOff && Bear is not null) return Bear;
        if (regime.IsRiskOn && Bull is not null) return Bull;
        if (regime.SpyTrendDirection == -1 && Bear is not null) return Bear;
        if (regime.SpyTrendDirection == 1 && Bull is not null) return Bull;
        return Neutral ?? fallback;
    }
}

public class SignalThresholds
{
    public double BuyToday { get; set; } = 78;
    public double Watch { get; set; } = 58;
    public double HighRisk { get; set; } = 38;
    public double MinRiskReward { get; set; } = 1.5;
    public int MaxWatchSignals { get; set; } = 20;

    public string Classify(double total) => total switch
    {
        var t when t >= BuyToday => "BUY_TODAY",
        var t when t >= Watch => "WATCH",
        var t when t >= HighRisk => "HIGH_RISK",
        _ => "AVOID"
    };
}
