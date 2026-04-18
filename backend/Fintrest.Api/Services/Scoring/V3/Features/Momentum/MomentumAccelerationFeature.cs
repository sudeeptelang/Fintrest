namespace Fintrest.Api.Services.Scoring.V3.Features.Momentum;

/// <summary>
/// Momentum acceleration: short-term ROC relative to medium-term ROC.
/// <c>roc_10d - (roc_20d / 2)</c>. Positive = accelerating, negative = slowing.
/// Carried from v2's "Momentum Acceleration" algorithm (one of the three
/// momentum sub-algorithms in the Jegadeesh-Titman family).
/// </summary>
public class MomentumAccelerationFeature : IFeature
{
    public string Name    => "momentum_acceleration";
    public string Source  => "computed";
    public string Version => "1";

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < 21)
            return Task.FromResult<FeatureOutput?>(null);

        var latestClose = bars[^1].Close;
        var c10 = bars[^11].Close;
        var c20 = bars[^21].Close;
        if (c10 <= 0 || c20 <= 0) return Task.FromResult<FeatureOutput?>(null);

        var roc10 = (latestClose - c10) / c10 * 100.0;
        var roc20 = (latestClose - c20) / c20 * 100.0;
        var acceleration = roc10 - roc20 / 2.0;

        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(acceleration, asOfTs));
    }
}
