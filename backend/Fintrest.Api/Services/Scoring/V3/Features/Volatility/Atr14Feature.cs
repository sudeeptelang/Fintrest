namespace Fintrest.Api.Services.Scoring.V3.Features.Volatility;

/// <summary>
/// 14-period Average True Range via Wilder's smoothing. True Range is
/// <c>max(high-low, |high-prevClose|, |low-prevClose|)</c>; ATR is the smoothed
/// 14-bar average. Used by the trade-zone calculator to size entries/stops and
/// by the Risk factor as a raw volatility input.
/// </summary>
public class Atr14Feature : IFeature
{
    public string Name    => "atr_14";
    public string Source  => "computed";
    public string Version => "1";

    private const int Period = 14;

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < Period + 1)
            return Task.FromResult<FeatureOutput?>(null);

        // Seed ATR with the simple average of the first `Period` true ranges.
        double atr = 0;
        for (int i = 1; i <= Period; i++) atr += TrueRange(bars[i], bars[i - 1]);
        atr /= Period;

        // Wilder smoothing for the remaining bars.
        for (int i = Period + 1; i < bars.Count; i++)
        {
            var tr = TrueRange(bars[i], bars[i - 1]);
            atr = (atr * (Period - 1) + tr) / Period;
        }

        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(atr, asOfTs));
    }

    private static double TrueRange(Models.MarketData curr, Models.MarketData prev)
    {
        var range1 = curr.High - curr.Low;
        var range2 = Math.Abs(curr.High - prev.Close);
        var range3 = Math.Abs(curr.Low  - prev.Close);
        return Math.Max(range1, Math.Max(range2, range3));
    }
}
