namespace Fintrest.Api.Services.Scoring.V3.Features.Volume;

/// <summary>
/// Short-term vs medium-term volume accumulation ratio: <c>avg_vol_5d / avg_vol_30d</c>.
/// &gt; 1.2 suggests accumulation (institutions adding); &lt; 0.8 suggests distribution.
/// Complements <c>volume_rel_30d</c> — the ratio catches "today's volume is high"
/// while this catches "the last week has systematically been heavier".
/// </summary>
public class AccumulationDistributionFeature : IFeature
{
    public string Name    => "accumulation_distribution";
    public string Source  => "computed";
    public string Version => "1";

    private const int ShortWindow  = 5;
    private const int LongWindow   = 30;

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < LongWindow)
            return Task.FromResult<FeatureOutput?>(null);

        double short5 = 0, long30 = 0;
        for (int i = bars.Count - ShortWindow; i < bars.Count; i++) short5 += bars[i].Volume;
        for (int i = bars.Count - LongWindow; i < bars.Count; i++) long30 += bars[i].Volume;
        short5 /= ShortWindow;
        long30 /= LongWindow;
        if (long30 <= 0) return Task.FromResult<FeatureOutput?>(null);

        var ratio = short5 / long30;
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(ratio, asOfTs));
    }
}
