namespace Fintrest.Api.Services.Scoring.V3.Features.Trend;

/// <summary>
/// Distance of the latest close from the 50-day MA, expressed as a signed
/// percentage: <c>((close - ma50) / ma50) * 100</c>. Positive = trading above the
/// trend line (bullish); negative = below (bearish). Used together with
/// <c>ma_50_slope_10d</c> to distinguish "trending up with room to run" from
/// "extended above a flat MA".
/// </summary>
public class CloseVsMa50PctFeature : IFeature
{
    public string Name    => "close_vs_ma_50_pct";
    public string Source  => "computed";
    public string Version => "1";

    private const int Period = 50;

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < Period)
            return Task.FromResult<FeatureOutput?>(null);

        double sum = 0;
        for (int i = bars.Count - Period; i < bars.Count; i++) sum += bars[i].Close;
        var ma = sum / Period;
        if (ma <= 0) return Task.FromResult<FeatureOutput?>(null);

        var distPct = (bars[^1].Close - ma) / ma * 100.0;
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(distPct, asOfTs));
    }
}
