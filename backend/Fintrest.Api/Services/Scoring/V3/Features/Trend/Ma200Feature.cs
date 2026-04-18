namespace Fintrest.Api.Services.Scoring.V3.Features.Trend;

/// <summary>200-day simple moving average. The canonical long-term trend benchmark —
/// price above MA200 = bull regime for that stock, below = bear.</summary>
public class Ma200Feature : IFeature
{
    public string Name    => "ma_200";
    public string Source  => "computed";
    public string Version => "1";

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < 200)
            return Task.FromResult<FeatureOutput?>(null);
        double sum = 0;
        for (int i = bars.Count - 200; i < bars.Count; i++) sum += bars[i].Close;
        var ma = sum / 200.0;
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(ma, asOfTs));
    }
}
