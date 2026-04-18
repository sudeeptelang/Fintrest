namespace Fintrest.Api.Services.Scoring.V3.Features.Trend;

/// <summary>
/// 14-period Average Directional Index. ADX ∈ [0, 100] — a pure magnitude-of-trend
/// indicator (does NOT signal direction). &gt; 25 = strong trend, &lt; 20 = weak /
/// ranging. v2's Trend factor uses this as the foundation; direction is handled
/// separately by comparing +DI and -DI (omitted here — we only emit ADX itself).
/// </summary>
public class Adx14Feature : IFeature
{
    public string Name    => "adx_14";
    public string Source  => "computed";
    public string Version => "1";

    private const int Period = 14;

    public Task<FeatureOutput?> ComputeAsync(string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        // Need Period for DM/TR smoothing + Period for DX smoothing + 1 prior bar = 2*Period + 1.
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < 2 * Period + 1)
            return Task.FromResult<FeatureOutput?>(null);

        // Step 1: compute +DM, -DM, TR for each bar.
        var plusDM  = new double[bars.Count];
        var minusDM = new double[bars.Count];
        var tr      = new double[bars.Count];
        for (int i = 1; i < bars.Count; i++)
        {
            var upMove   = bars[i].High - bars[i - 1].High;
            var downMove = bars[i - 1].Low - bars[i].Low;
            plusDM[i]  = upMove   > downMove && upMove   > 0 ? upMove   : 0;
            minusDM[i] = downMove > upMove   && downMove > 0 ? downMove : 0;
            var range1 = bars[i].High - bars[i].Low;
            var range2 = Math.Abs(bars[i].High - bars[i - 1].Close);
            var range3 = Math.Abs(bars[i].Low  - bars[i - 1].Close);
            tr[i] = Math.Max(range1, Math.Max(range2, range3));
        }

        // Step 2: Wilder-smooth +DM, -DM, TR. Seed = simple sum of first Period values.
        double sPlusDM = 0, sMinusDM = 0, sTR = 0;
        for (int i = 1; i <= Period; i++) { sPlusDM += plusDM[i]; sMinusDM += minusDM[i]; sTR += tr[i]; }

        // Step 3: compute DX per bar starting after the seed window, smooth with Wilder's again → ADX.
        double adx = 0;
        int dxCount = 0;
        for (int i = Period + 1; i < bars.Count; i++)
        {
            sPlusDM  = sPlusDM  - sPlusDM  / Period + plusDM[i];
            sMinusDM = sMinusDM - sMinusDM / Period + minusDM[i];
            sTR      = sTR      - sTR      / Period + tr[i];
            if (sTR <= 0) continue;

            var plusDI  = 100.0 * sPlusDM  / sTR;
            var minusDI = 100.0 * sMinusDM / sTR;
            var sumDI   = plusDI + minusDI;
            if (sumDI <= 0) continue;
            var dx = 100.0 * Math.Abs(plusDI - minusDI) / sumDI;

            // ADX = Wilder-smoothed DX. Seed on the first Period DX values (simple average),
            // then smooth thereafter.
            dxCount++;
            if (dxCount <= Period) adx += dx / Period;
            else adx = (adx * (Period - 1) + dx) / Period;
        }

        if (dxCount < Period) return Task.FromResult<FeatureOutput?>(null);
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(adx, asOfTs));
    }
}
