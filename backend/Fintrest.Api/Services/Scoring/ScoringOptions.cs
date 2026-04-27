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
    // 8th factor — Smart Money composite (Insider 35% / Institutional 25% /
    // Short 15% / Congress 15% / Options 10% within the family). 25%
    // matches TipRanks Smart Score ceiling — the most aggressive
    // mainstream consumer comp for smart-money weighting.
    public double SmartMoney { get; set; }

    public double Apply(ScoringEngineV2.ScoreBreakdown b) =>
        b.Momentum * Momentum +
        b.Volume * Volume +
        b.Catalyst * Catalyst +
        b.Fundamental * Fundamental +
        b.Sentiment * Sentiment +
        b.Trend * Trend +
        b.Risk * Risk +
        b.SmartMoney * SmartMoney;

    public static FactorWeights Default() => new()
    {
        // 18% Smart Money — splits TipRanks ceiling (25%) and IBD floor (15%),
        // matches academic alpha-parity (Cohen/Malloy/Pomorski insider 6-10%
        // alpha, comparable to value/momentum). Other 7 factors scaled
        // proportionally from the original 7-factor weights.
        Momentum = 0.18,
        Volume = 0.10,
        Catalyst = 0.12,
        Fundamental = 0.15,
        Sentiment = 0.08,
        Trend = 0.11,
        Risk = 0.08,
        SmartMoney = 0.18,
    };

    /// <summary>
    /// Composite lens — the balanced "is this a good investment overall"
    /// score. Fundamentals anchor; Smart Money 18% peer; momentum dampened
    /// so AAPL/MSFT/JPM bubble up on quality.
    /// </summary>
    public static FactorWeights Composite() => new()
    {
        Momentum = 0.11,
        Volume = 0.06,
        Catalyst = 0.05,
        Fundamental = 0.27,
        Sentiment = 0.09,
        Trend = 0.11,
        Risk = 0.13,
        SmartMoney = 0.18,
    };

    /// <summary>
    /// Quality lens — fundamentals-led, low-risk-aware. Smart Money 18%
    /// still meaningful for insider conviction on durable franchises, but
    /// fundamentals dominate.
    /// </summary>
    public static FactorWeights Quality() => new()
    {
        Momentum = 0.05,
        Volume = 0.03,
        Catalyst = 0.05,
        Fundamental = 0.33,
        Sentiment = 0.08,
        Trend = 0.13,
        Risk = 0.15,
        SmartMoney = 0.18,
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
    // BUY_TODAY = top ~5% of the scored universe. Competitor benchmarks:
    // Zacks Strong Buy ~5%, TipRanks Strong Buy ~4%, Seeking Alpha Quant
    // top ~5–10%, Morningstar 5-star <5%. We were at ~11% (54/500) which
    // is Loose and undermines the "passed the bar" narrative.
    public double BuyToday { get; set; } = 85;
    public double Watch { get; set; } = 65;
    public double HighRisk { get; set; } = 40;

    // Reward-to-risk gate — raised to 2.0 for BUY_TODAY. Our trade plan
    // uses technical entry/stop/target, so R:R < 2 is a weak setup.
    public double MinRiskReward { get; set; } = 2.0;

    // Real-world confirmation gate — BUY_TODAY must have at least one
    // external validator beyond price math.
    public int MinNewsCountForBuy { get; set; } = 5;
    public bool RequireInsiderOrCatalystForBuy { get; set; } = true;

    // Per-factor floors — composite can be high while an individual
    // factor is dangerously weak (e.g. 85 composite but trend of 40).
    // Competitors universally require trend + volume confirmation.
    public double MinTrendForBuy { get; set; } = 60;
    public double MinRelVolumeForBuy { get; set; } = 55;
    public double MinRiskScoreForBuy { get; set; } = 45;  // score, not "risk level"
    public double MaxBearishSentiment { get; set; } = -0.1;

    // Daily signal-pool caps. After scoring + filtering, keep only the top N
    // by score for each tier. The product is broad stock-signalling (not
    // a 50-name terminal), so signals must be FEW and STRONG. Defaults
    // target ~7 BUY + ~5 WATCH = ~12 daily signals, every one above the
    // raised thresholds.
    public int MaxBuySignals { get; set; } = 7;
    public int MaxWatchSignals { get; set; } = 25;

    // Market-cap floor for *published* signals. The product is for the
    // common public, not finance professionals — daily signals must be
    // names people recognize (Apple, Tesla, Disney). Below the floor,
    // tickers still get scored (so /stock/{anything} works) but they
    // don't show up in /research featured signals. $50B cuts the
    // universe to roughly the Russell-200 tier (top ~250 names).
    // Set to 0 to disable the filter.
    public double MinPublishMarketCap { get; set; } = 50_000_000_000;

    public string Classify(double total) => total switch
    {
        var t when t >= BuyToday => "BUY_TODAY",
        var t when t >= Watch => "WATCH",
        var t when t >= HighRisk => "HIGH_RISK",
        _ => "AVOID"
    };

    /// <summary>
    /// Secondary gate applied only to BUY_TODAY candidates. A signal
    /// passes the BUY bar when ALL are true:
    ///   1. At least one real-world validator: news_count >= N, insider
    ///      buying, OR a filed catalyst (8-K / guidance / upgrade).
    ///   2. News sentiment not actively bearish (&gt;= MaxBearishSentiment).
    ///   3. Trend score &gt;= MinTrendForBuy (not fighting the tape).
    ///   4. Rel-volume score &gt;= MinRelVolumeForBuy (institutional interest).
    ///   5. Risk score &gt;= MinRiskScoreForBuy (not dangerously volatile).
    ///
    /// Candidates that fail any of these are demoted to WATCH — the
    /// composite may be high but the profile isn't strong enough to
    /// act on today.
    ///
    /// Returns (passes, reasonIfFailed) so the scan orchestrator can log
    /// which criterion dropped the signal. Aids threshold tuning.
    /// </summary>
    public (bool Passes, string? Reason) PassesBuyConfirmation(
        ScoringEngineV2.ScoreBreakdown breakdown,
        Dictionary<string, object?> provenance)
    {
        if (!RequireInsiderOrCatalystForBuy) return (true, null);

        var newsCount = ReadInt(provenance, "news_count");
        var insiderBuys = ReadInt(provenance, "insider_buy_count");
        var insiderSells = ReadInt(provenance, "insider_sell_count");
        var hasCatalyst = ReadBool(provenance, "has_catalyst");
        var sentiment = ReadDouble(provenance, "news_sentiment");

        var hasValidator =
            newsCount >= MinNewsCountForBuy
            || (insiderBuys > 0 && insiderBuys >= insiderSells)
            || hasCatalyst;
        if (!hasValidator)
            return (false, "no validator (news/insider/catalyst)");

        if (sentiment < MaxBearishSentiment)
            return (false, $"bearish sentiment {sentiment:F2}");

        if (breakdown.Trend < MinTrendForBuy)
            return (false, $"weak trend {breakdown.Trend:F0}");

        if (breakdown.Volume < MinRelVolumeForBuy)
            return (false, $"thin volume {breakdown.Volume:F0}");

        if (breakdown.Risk < MinRiskScoreForBuy)
            return (false, $"elevated risk {breakdown.Risk:F0}");

        return (true, null);
    }

    private static int ReadInt(Dictionary<string, object?> p, string key) =>
        p.TryGetValue(key, out var v) && v is int i ? i : 0;

    private static bool ReadBool(Dictionary<string, object?> p, string key) =>
        p.TryGetValue(key, out var v) && v is bool b && b;

    private static double ReadDouble(Dictionary<string, object?> p, string key)
    {
        if (!p.TryGetValue(key, out var v) || v is null) return 0;
        return v switch
        {
            double d => d,
            float f => f,
            int i => i,
            _ => 0,
        };
    }
}
