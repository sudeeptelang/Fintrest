namespace Fintrest.Api.Services.Scoring.V3.Features.Momentum;

/// <summary>5-day rate of change: short end of the Jegadeesh-Titman momentum trio.</summary>
public class Roc5dFeature : IFeature
{
    public string Name    => "roc_5d";
    public string Source  => "computed";
    public string Version => "1";

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < 6)
            return Task.FromResult<FeatureOutput?>(null);
        var latest = bars[^1];
        var prior  = bars[^6];
        if (prior.Close <= 0) return Task.FromResult<FeatureOutput?>(null);
        var rocPct = (latest.Close - prior.Close) / prior.Close * 100.0;
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(latest.Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(rocPct, asOfTs));
    }
}
