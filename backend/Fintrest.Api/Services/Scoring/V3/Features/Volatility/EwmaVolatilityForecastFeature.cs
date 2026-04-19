namespace Fintrest.Api.Services.Scoring.V3.Features.Volatility;

/// <summary>
/// Exponentially-weighted moving average volatility forecast (RiskMetrics λ=0.94).
/// More responsive than a rolling stdev because recent observations get higher
/// weight; captures ~85% of GARCH's value with 1/10th the complexity and zero
/// numerical-optimization risk. Output is annualized volatility in percentage
/// points — so <c>20.0</c> means the model expects ~20% annualized vol over
/// the next period.
///
/// <para><b>Formula:</b>
/// <code>σ²_t = λ · σ²_{t-1} + (1 − λ) · r_{t-1}²</code>
/// where <c>r</c> is the simple daily return and <c>λ = 0.94</c>. Seeded with
/// the unweighted variance of the first 20 returns so the early EWMA estimate
/// isn't degenerate.</para>
///
/// <para>Reasoning for the name: spec YAML historically called it
/// <c>garch_volatility_forecast</c>; we ship EWMA and rename on the config side.
/// The feature name persisted to the DB uses the EWMA label so downstream
/// consumers don't think GARCH is in the feature store.</para>
/// </summary>
public class EwmaVolatilityForecastFeature : IFeature
{
    public string Name    => "ewma_volatility_forecast";
    public string Source  => "computed";
    public string Version => "1";

    private const double Lambda           = 0.94;   // RiskMetrics standard
    private const int    SeedWindow       = 20;     // bars to seed the unweighted variance
    private const int    MinHistoryBars   = 61;     // 60 returns + 1
    private const double TradingDaysYear  = 252.0;

    public Task<FeatureOutput?> ComputeAsync(
        string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.BarsByTicker.TryGetValue(ticker, out var bars) || bars.Count < MinHistoryBars)
            return Task.FromResult<FeatureOutput?>(null);

        // Simple daily returns. Use the last 60 to keep the estimate focused on
        // the recent regime — adding more years would make the EWMA sluggish.
        var window = Math.Min(60, bars.Count - 1);
        var returns = new double[window];
        var offset = bars.Count - window - 1;
        for (int i = 0; i < window; i++)
        {
            var prev = bars[offset + i].Close;
            var curr = bars[offset + i + 1].Close;
            if (prev <= 0) return Task.FromResult<FeatureOutput?>(null);
            returns[i] = (curr - prev) / prev;
        }

        // Seed with the unweighted variance of the first N returns.
        double sumSq = 0;
        var seedN = Math.Min(SeedWindow, returns.Length);
        for (int i = 0; i < seedN; i++) sumSq += returns[i] * returns[i];
        double variance = sumSq / seedN;

        // Iterate the EWMA recurrence over the rest of the window.
        for (int i = seedN; i < returns.Length; i++)
        {
            variance = Lambda * variance + (1 - Lambda) * returns[i] * returns[i];
        }

        // Annualize and express as a percentage so downstream consumers can
        // compare against other vol measures (atr_pct, realized vol, etc.).
        var annualizedVolPct = Math.Sqrt(variance * TradingDaysYear) * 100.0;
        var asOfTs = AsOfTsResolver.ForOhlcvBar(DateOnly.FromDateTime(bars[^1].Ts));
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(annualizedVolPct, asOfTs));
    }
}
