namespace Fintrest.Api.Services.Scoring.V3.Features.Momentum;

/// <summary>
/// 20-day rate of change: <c>(close[t] / close[t-20]) - 1</c>, expressed as a
/// percentage. One of the Jegadeesh–Titman momentum timeframes (algorithm #1
/// in v2). Carried over to v3 so the feature store has a baseline pure-compute
/// feature to validate the pipeline end-to-end.
/// </summary>
public class Roc20dFeature : IFeature
{
    public string Name    => "roc_20d";
    public string Source  => "computed";
    public string Version => "1";

    public Task<FeatureOutput?> ComputeAsync(
        string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < 21)
            return Task.FromResult<FeatureOutput?>(null);

        var latest = bars[^1];
        var prior  = bars[^21];
        if (prior.Close <= 0)
            return Task.FromResult<FeatureOutput?>(null);

        var rocPct = (latest.Close - prior.Close) / prior.Close * 100.0;
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(latest.Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(rocPct, asOfTs));
    }
}
