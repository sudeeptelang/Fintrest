namespace Fintrest.Api.Services.Scoring.V3.Features.Trend;

/// <summary>
/// 10-bar slope of the 50-day moving average, expressed as % change over 10 days:
/// <c>((MA50_today - MA50_10d_ago) / MA50_10d_ago) * 100</c>. Positive = uptrending
/// MA50; negative = downtrending. v2 uses this in the Trend factor as a tiebreaker
/// when price is near MA50.
/// </summary>
public class Ma50SlopeFeature : IFeature
{
    public string Name    => "ma_50_slope_10d";
    public string Source  => "computed";
    public string Version => "1";

    private const int MaPeriod    = 50;
    private const int SlopeWindow = 10;

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < MaPeriod + SlopeWindow)
            return Task.FromResult<FeatureOutput?>(null);

        double maToday = 0, maPrior = 0;
        for (int i = bars.Count - MaPeriod; i < bars.Count; i++) maToday += bars[i].Close;
        maToday /= MaPeriod;
        for (int i = bars.Count - MaPeriod - SlopeWindow; i < bars.Count - SlopeWindow; i++) maPrior += bars[i].Close;
        maPrior /= MaPeriod;

        if (maPrior <= 0) return Task.FromResult<FeatureOutput?>(null);
        var slopePct = (maToday - maPrior) / maPrior * 100.0;

        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(slopePct, asOfTs));
    }
}
