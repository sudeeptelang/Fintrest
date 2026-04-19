namespace Fintrest.Api.Services.Scoring.V3.Features.Sector;

/// <summary>
/// 60-day sector-relative strength: <c>ticker_return_60d − sector_etf_return_60d</c>,
/// expressed in percentage points. Positive = outperforming the sector benchmark;
/// negative = lagging. Resolves the ticker's GICS sector to its SPDR sector ETF
/// via <see cref="SectorMap"/>; falls back to SPY when the sector label can't be
/// mapped (which also increments <c>ctx.Counters.SectorFallbacks</c> so the run
/// log can flag excessive fallback usage).
///
/// <para>Classic factor: stocks that lead their sector tend to keep leading on
/// short horizons. Complements absolute momentum (roc_60d) — a stock can be up
/// 15% in 60d but still lag a 25% sector ETF, and the research should flag that.</para>
/// </summary>
public class SectorRelativeStrengthFeature(SectorMap sectorMap) : IFeature
{
    public string Name    => "sector_rs_60d";
    public string Source  => "computed";
    public string Version => "1";

    private const int Period = 60;

    public Task<FeatureOutput?> ComputeAsync(
        string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < Period + 1)
            return Task.FromResult<FeatureOutput?>(null);

        if (!ctx.StocksByTicker.TryGetValue(ticker, out var stock))
            return Task.FromResult<FeatureOutput?>(null);

        var etf = sectorMap.GetEtfForSectorLabel(stock.Sector, ticker);
        // Track fallbacks so run-log can warn on a sector map with coverage gaps.
        if (string.Equals(etf, sectorMap.MarketBenchmarkEtf, StringComparison.Ordinal)
            && !string.IsNullOrWhiteSpace(stock.Sector)
            && !sectorMap.CanonicalSectorLabels.Contains(stock.Sector))
        {
            ctx.Counters.IncrementSectorFallback();
        }

        if (!ctx.SectorBars.TryGetValue(etf, out var etfBars) || etfBars.Count < Period + 1)
            return Task.FromResult<FeatureOutput?>(null);

        var tickerRet = PercentReturn(bars[^(Period + 1)].Close, bars[^1].Close);
        var etfRet    = PercentReturn(etfBars[^(Period + 1)].Close, etfBars[^1].Close);
        if (tickerRet is null || etfRet is null)
            return Task.FromResult<FeatureOutput?>(null);

        var rsPct  = tickerRet.Value - etfRet.Value;
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(rsPct, asOfTs));
    }

    private static double? PercentReturn(double from, double to) =>
        from <= 0 ? null : (to - from) / from * 100.0;
}
