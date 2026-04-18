using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

// ════════════════════════════════════════════════════════════════════════════
// Signal Engine v3 Foundation Models (docs/SIGNALS_V3.md)
//
// Four tables that power the v3 scoring upgrade. v2 engine keeps running
// unchanged; these tables are empty until later milestones populate them.
// ════════════════════════════════════════════════════════════════════════════

/// <summary>
/// Time-series feature store. Every row carries an <c>as_of_ts</c> — the
/// timestamp the value would have been knowable in real time. This is the
/// single most important column for honest backtesting and prevents the
/// classic "lookahead leak" failure that plagues retail signal platforms.
/// </summary>
[Table("features")]
public class FeatureRow
{
    /// <summary>Stock ticker (e.g. "AAPL"). Composite PK with Date + FeatureName.</summary>
    [Column("ticker")]
    public string Ticker { get; set; } = "";

    [Column("date")]
    public DateOnly Date { get; set; }

    /// <summary>Feature identifier (e.g. "momentum_roc_20", "eps_revision_breadth_30d").</summary>
    [Column("feature_name")]
    public string FeatureName { get; set; } = "";

    [Column("value")]
    public double? Value { get; set; }

    /// <summary>Timestamp the value was knowable in real time (filing date for
    /// fundamentals, publish time for news, bar close for OHLCV).</summary>
    [Column("as_of_ts")]
    public DateTime AsOfTs { get; set; }

    [Column("source")]
    public string? Source { get; set; }
}

/// <summary>
/// Cross-sectional percentile ranks per feature per date. Stocks are ranked
/// both within their sector (<c>SectorRank</c>) and against the full universe
/// (<c>MarketRank</c>). Absolute values mislead across sectors (a 15 P/E is
/// cheap for tech, expensive for utilities).
/// </summary>
[Table("feature_ranks")]
public class FeatureRank
{
    [Column("ticker")]
    public string Ticker { get; set; } = "";

    [Column("date")]
    public DateOnly Date { get; set; }

    [Column("feature_name")]
    public string FeatureName { get; set; } = "";

    /// <summary>Percentile within sector on this date (0.0 … 1.0).</summary>
    [Column("sector_rank")]
    public double? SectorRank { get; set; }

    /// <summary>Percentile across full tradable universe on this date (0.0 … 1.0).</summary>
    [Column("market_rank")]
    public double? MarketRank { get; set; }
}

/// <summary>
/// Per-ticker post-earnings drift profile. Replaces v2's one-size-fits-all
/// PEAD with a stock-specific pattern: some tickers drift for 60 days after a
/// beat, others don't drift at all.
/// </summary>
[Table("ticker_earnings_profile")]
public class TickerEarningsProfile
{
    [Column("ticker")]
    public string Ticker { get; set; } = "";

    [Column("beats_count")]
    public int BeatsCount { get; set; }

    [Column("misses_count")]
    public int MissesCount { get; set; }

    /// <summary>Average 3-day return after an earnings beat, in %.</summary>
    [Column("avg_drift_3d")]
    public double? AvgDrift3d { get; set; }

    [Column("avg_drift_10d")]
    public double? AvgDrift10d { get; set; }

    [Column("avg_drift_60d")]
    public double? AvgDrift60d { get; set; }

    /// <summary>Fraction of beats that produced a positive drift (0..1).</summary>
    [Column("drift_consistency")]
    public double? DriftConsistency { get; set; }

    [Column("last_earnings_at")]
    public DateTime? LastEarningsAt { get; set; }

    [Column("sample_quarters")]
    public int SampleQuarters { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Nightly Information Coefficient (Spearman rank correlation between an
/// algorithm's score and forward return) per algorithm, per regime. Feeds the
/// weekly weight-tuning report and is the dataset required for an eventual
/// ML meta-learner.
/// </summary>
[Table("algorithm_ic_history")]
public class AlgorithmIcHistory
{
    [Column("date")]
    public DateOnly Date { get; set; }

    /// <summary>Algorithm identifier (e.g. "momentum_roc_20").</summary>
    [Column("algorithm")]
    public string Algorithm { get; set; } = "";

    /// <summary>Market regime at the time: trending_bull | trending_bear | chop_low_vol | chop_high_vol.</summary>
    [Column("regime")]
    public string Regime { get; set; } = "";

    [Column("ic_5d")]
    public double? Ic5d { get; set; }

    [Column("ic_21d")]
    public double? Ic21d { get; set; }

    [Column("n_tickers")]
    public int NTickers { get; set; }
}
