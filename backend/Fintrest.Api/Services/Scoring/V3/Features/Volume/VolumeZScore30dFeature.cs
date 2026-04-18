namespace Fintrest.Api.Services.Scoring.V3.Features.Volume;

/// <summary>
/// Z-score of today's volume vs the prior 30-day distribution:
/// <c>(today_vol - mean_30) / stdev_30</c>. Complements <c>volume_rel_30d</c> —
/// the ratio catches "today is 3x average"; the z-score catches "today is
/// 4 standard deviations above normal" which better flags unusual spikes
/// on normally-low-volume names.
/// </summary>
public class VolumeZScore30dFeature : IFeature
{
    public string Name    => "volume_zscore_30d";
    public string Source  => "computed";
    public string Version => "1";

    private const int Period = 30;

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < Period + 1)
            return Task.FromResult<FeatureOutput?>(null);

        double sum = 0;
        for (int i = bars.Count - Period - 1; i < bars.Count - 1; i++) sum += bars[i].Volume;
        var mean = sum / Period;

        double sqDiffs = 0;
        for (int i = bars.Count - Period - 1; i < bars.Count - 1; i++)
        {
            var d = bars[i].Volume - mean;
            sqDiffs += d * d;
        }
        var stdev = Math.Sqrt(sqDiffs / Period);
        if (stdev <= 0) return Task.FromResult<FeatureOutput?>(null);

        var z = (bars[^1].Volume - mean) / stdev;
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(z, asOfTs));
    }
}
