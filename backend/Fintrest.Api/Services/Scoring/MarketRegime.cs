namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Snapshot of broad market state used to tilt per-stock scores. Computed once per scan.
/// Reused across every stock so scoring reflects "what the market is doing right now".
/// </summary>
public record MarketRegime
{
    /// <summary>SPY MA50/MA200 cross: -1 bear, 0 mixed, 1 bull.</summary>
    public int SpyTrendDirection { get; init; }

    /// <summary>SPY % move today (last bar vs prior close).</summary>
    public double SpyReturn1d { get; init; }

    /// <summary>SPY % move last 5 sessions.</summary>
    public double SpyReturn5d { get; init; }

    /// <summary>SPY % move last 20 sessions.</summary>
    public double SpyReturn20d { get; init; }

    /// <summary>Current VIX level (null if VIX ticker not in universe).</summary>
    public double? VixLevel { get; init; }

    /// <summary>VIX % change today.</summary>
    public double? VixChange1d { get; init; }

    /// <summary>Sector → 5d average return across all active stocks in that sector.</summary>
    public IReadOnlyDictionary<string, double> SectorReturns5d { get; init; }
        = new Dictionary<string, double>();

    /// <summary>True if VIX > 25 or VIX jumped >15% today.</summary>
    public bool IsFearSpike =>
        (VixLevel.HasValue && VixLevel.Value > 25) ||
        (VixChange1d.HasValue && VixChange1d.Value > 15);

    /// <summary>True if SPY dropped >1.5% today or down >3% over 5d.</summary>
    public bool IsRiskOff =>
        SpyReturn1d < -1.5 || SpyReturn5d < -3.0;

    /// <summary>True if SPY up >1% today and in confirmed uptrend.</summary>
    public bool IsRiskOn =>
        SpyTrendDirection == 1 && SpyReturn1d > 1.0;

    public static MarketRegime Neutral => new();
}
