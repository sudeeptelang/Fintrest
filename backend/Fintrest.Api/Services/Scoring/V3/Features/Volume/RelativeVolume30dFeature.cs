namespace Fintrest.Api.Services.Scoring.V3.Features.Volume;

/// <summary>
/// Today's volume divided by the prior 30-day average volume.
/// 1.0 = average; 2.0 = double average (elevated); &gt; 3.0 = unusual activity.
/// Used by v2's Volume factor as the primary "institutional interest" signal.
/// </summary>
public class RelativeVolume30dFeature : IFeature
{
    public string Name    => "volume_rel_30d";
    public string Source  => "computed";
    public string Version => "1";

    private const int Period = 30;

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < Period + 1)
            return Task.FromResult<FeatureOutput?>(null);

        // Prior 30 days (exclude today) — average the 30 bars BEFORE latest.
        double sum = 0;
        for (int i = bars.Count - Period - 1; i < bars.Count - 1; i++) sum += bars[i].Volume;
        var avg = sum / Period;
        if (avg <= 0) return Task.FromResult<FeatureOutput?>(null);

        var relVol = bars[^1].Volume / avg;
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(relVol, asOfTs));
    }
}
