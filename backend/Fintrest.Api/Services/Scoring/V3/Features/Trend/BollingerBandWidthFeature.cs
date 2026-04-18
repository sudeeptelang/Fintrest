namespace Fintrest.Api.Services.Scoring.V3.Features.Trend;

/// <summary>
/// Bollinger Band width as a percentage of the 20-day mean:
/// <c>((upper - lower) / mean) * 100</c> where upper/lower are ± 2σ from the mean.
/// Narrow width = volatility compression = breakout candidate (the "BB squeeze").
/// v2 scores tight squeezes (&lt; 3%) highest.
/// </summary>
public class BollingerBandWidthFeature : IFeature
{
    public string Name    => "bb_width";
    public string Source  => "computed";
    public string Version => "1";

    private const int Period = 20;
    private const double StDevMultiplier = 2.0;

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < Period)
            return Task.FromResult<FeatureOutput?>(null);

        double sum = 0;
        for (int i = bars.Count - Period; i < bars.Count; i++) sum += bars[i].Close;
        var mean = sum / Period;
        if (mean <= 0) return Task.FromResult<FeatureOutput?>(null);

        double sqDiffs = 0;
        for (int i = bars.Count - Period; i < bars.Count; i++)
        {
            var d = bars[i].Close - mean;
            sqDiffs += d * d;
        }
        var stdev = Math.Sqrt(sqDiffs / Period);
        var widthPct = (stdev * 2 * StDevMultiplier) / mean * 100.0;

        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(widthPct, asOfTs));
    }
}
