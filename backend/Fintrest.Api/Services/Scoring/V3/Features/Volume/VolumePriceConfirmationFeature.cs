namespace Fintrest.Api.Services.Scoring.V3.Features.Volume;

/// <summary>
/// Signed measure of whether volume confirms the price move. Over the last
/// 20 bars: <c>sign(Σ (ΔClose × Volume)) × (abs sum / total volume)</c>, bounded
/// to [-1, +1]. Positive = buying on strength / selling on weakness
/// (healthy); negative = climaxes (price up on fading volume, or down on
/// fading volume) which often precede reversals.
/// </summary>
public class VolumePriceConfirmationFeature : IFeature
{
    public string Name    => "volume_price_confirmation";
    public string Source  => "computed";
    public string Version => "1";

    private const int Period = 20;

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < Period + 1)
            return Task.FromResult<FeatureOutput?>(null);

        double signedFlow = 0;
        double totalVol   = 0;
        for (int i = bars.Count - Period; i < bars.Count; i++)
        {
            var dClose = bars[i].Close - bars[i - 1].Close;
            var vol    = (double)bars[i].Volume;
            signedFlow += Math.Sign(dClose) * vol;
            totalVol   += vol;
        }
        if (totalVol <= 0) return Task.FromResult<FeatureOutput?>(null);

        var confirmation = signedFlow / totalVol; // inherently in [-1, +1]
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(confirmation, asOfTs));
    }
}
