namespace Fintrest.Api.Services.Scoring.V3.Features.Volatility;

/// <summary>
/// How many standard deviations the latest close sits from its 50-day mean.
/// <c>(close - mean_50) / stdev_50</c>. Extreme Z-scores (> +2 or &lt; -2)
/// indicate overextension in either direction — used by v2's Risk factor
/// to penalize stocks that have run too far too fast.
/// </summary>
public class MeanReversionZScoreFeature : IFeature
{
    public string Name    => "mean_reversion_zscore";
    public string Source  => "computed";
    public string Version => "1";

    private const int Period = 50;

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < Period)
            return Task.FromResult<FeatureOutput?>(null);

        // Mean + variance of the last `Period` closes.
        double sum = 0;
        for (int i = bars.Count - Period; i < bars.Count; i++) sum += bars[i].Close;
        var mean = sum / Period;

        double sqDiffs = 0;
        for (int i = bars.Count - Period; i < bars.Count; i++)
        {
            var d = bars[i].Close - mean;
            sqDiffs += d * d;
        }
        var stdev = Math.Sqrt(sqDiffs / Period);
        if (stdev <= 0) return Task.FromResult<FeatureOutput?>(null);

        var z = (bars[^1].Close - mean) / stdev;
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(z, asOfTs));
    }
}
