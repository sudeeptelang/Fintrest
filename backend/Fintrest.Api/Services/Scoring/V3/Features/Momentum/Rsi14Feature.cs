namespace Fintrest.Api.Services.Scoring.V3.Features.Momentum;

/// <summary>
/// Classic 14-period RSI via Wilder's smoothing. Identical to the RSI the v2
/// scorer uses in-memory, emitted here as a feature so cross-sectional ranks
/// can compare it across the universe.
/// </summary>
public class Rsi14Feature : IFeature
{
    public string Name    => "rsi_14";
    public string Source  => "computed";
    public string Version => "1";

    private const int Period = 14;

    public Task<FeatureOutput?> ComputeAsync(
        string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < Period + 1)
            return Task.FromResult<FeatureOutput?>(null);

        // Wilder's smoothing — classic RSI initialization using the first `Period` diffs.
        double gainAvg = 0, lossAvg = 0;
        for (int i = 1; i <= Period; i++)
        {
            var diff = bars[i].Close - bars[i - 1].Close;
            if (diff >= 0) gainAvg += diff; else lossAvg -= diff;
        }
        gainAvg /= Period;
        lossAvg /= Period;

        for (int i = Period + 1; i < bars.Count; i++)
        {
            var diff = bars[i].Close - bars[i - 1].Close;
            var gain = diff >= 0 ? diff : 0.0;
            var loss = diff < 0 ? -diff : 0.0;
            gainAvg = (gainAvg * (Period - 1) + gain) / Period;
            lossAvg = (lossAvg * (Period - 1) + loss) / Period;
        }

        double rsi;
        if (lossAvg == 0) rsi = 100.0;
        else
        {
            var rs = gainAvg / lossAvg;
            rsi = 100.0 - (100.0 / (1.0 + rs));
        }

        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(rsi, asOfTs));
    }
}
