namespace Fintrest.Api.Services.Scoring.V3.Features.PriceRange;

/// <summary>
/// Where the current price sits inside the trailing 252-bar (approx 52-week)
/// high/low range, expressed as a percentage. 100 = at/above 52W high,
/// 0 = at/below 52W low. Near-100 feeds breakout detection; near-0 feeds
/// capitulation / mean-reversion candidates.
/// </summary>
public class Week52RangePctFeature : IFeature
{
    public string Name    => "week52_range_pct";
    public string Source  => "computed";
    public string Version => "1";

    private const int Period = 252;

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < Period)
            return Task.FromResult<FeatureOutput?>(null);

        double high = double.MinValue, low = double.MaxValue;
        for (int i = bars.Count - Period; i < bars.Count; i++)
        {
            if (bars[i].High > high) high = bars[i].High;
            if (bars[i].Low  < low)  low  = bars[i].Low;
        }
        if (high <= low) return Task.FromResult<FeatureOutput?>(null);

        var pct = (bars[^1].Close - low) / (high - low) * 100.0;
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(pct, asOfTs));
    }
}
