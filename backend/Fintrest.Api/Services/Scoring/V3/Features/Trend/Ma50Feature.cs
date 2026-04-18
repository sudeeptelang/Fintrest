namespace Fintrest.Api.Services.Scoring.V3.Features.Trend;

/// <summary>50-day simple moving average. Paired with MA200 for regime + trend analysis.</summary>
public class Ma50Feature : IFeature
{
    public string Name    => "ma_50";
    public string Source  => "computed";
    public string Version => "1";

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < 50)
            return Task.FromResult<FeatureOutput?>(null);
        double sum = 0;
        for (int i = bars.Count - 50; i < bars.Count; i++) sum += bars[i].Close;
        var ma = sum / 50.0;
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(ma, asOfTs));
    }
}
