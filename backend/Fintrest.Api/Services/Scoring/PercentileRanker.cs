namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Converts raw factor scores into cross-sectional percentile ranks across the universe.
/// This is how most professional quant products (IBD, Zacks, AAII, Barra) produce their
/// factor scores — each stock's score reflects *relative* strength against every other
/// stock scanned today, so the distribution shifts with the market instead of being anchored
/// to static thresholds. A "90 momentum" means top-decile among ~500 names, not ROC > X.
/// </summary>
public static class PercentileRanker
{
    /// <summary>
    /// Rank each raw value within <paramref name="rawValues"/> and return the percentile (0-100).
    /// Ties are handled via average rank. Works on any monotonic factor where higher raw = better.
    /// </summary>
    public static double[] Rank(IReadOnlyList<double> rawValues)
    {
        var n = rawValues.Count;
        if (n == 0) return Array.Empty<double>();
        if (n == 1) return new[] { 50.0 };

        var indexed = rawValues
            .Select((v, i) => (value: v, originalIndex: i))
            .OrderBy(t => t.value)
            .ToArray();

        var ranks = new double[n];
        int i0 = 0;
        while (i0 < n)
        {
            int i1 = i0;
            while (i1 + 1 < n && indexed[i1 + 1].value == indexed[i0].value) i1++;
            // Average rank for ties. Rank is 1-based; convert to 0-100 percentile.
            double avgRank = (i0 + i1) / 2.0 + 1; // 1-based
            double percentile = (avgRank - 0.5) / n * 100.0;
            for (int k = i0; k <= i1; k++)
                ranks[indexed[k].originalIndex] = percentile;
            i0 = i1 + 1;
        }
        return ranks;
    }

    /// <summary>
    /// Rank each stock's breakdown factor-by-factor across the full universe.
    /// Returns a new breakdown where each factor is the stock's percentile (0-100) on that factor.
    /// Stocks where a raw factor was 0 (missing) keep their raw value so we don't upweight gaps.
    /// </summary>
    public static ScoringEngineV2.ScoreBreakdown[] RankBreakdowns(
        IReadOnlyList<ScoringEngineV2.ScoreBreakdown> raw)
    {
        var n = raw.Count;
        if (n == 0) return Array.Empty<ScoringEngineV2.ScoreBreakdown>();

        var mom = Rank(raw.Select(b => b.Momentum).ToList());
        var vol = Rank(raw.Select(b => b.Volume).ToList());
        var cat = Rank(raw.Select(b => b.Catalyst).ToList());
        var fun = Rank(raw.Select(b => b.Fundamental).ToList());
        var sen = Rank(raw.Select(b => b.Sentiment).ToList());
        var trd = Rank(raw.Select(b => b.Trend).ToList());
        var rsk = Rank(raw.Select(b => b.Risk).ToList());

        var output = new ScoringEngineV2.ScoreBreakdown[n];
        for (int i = 0; i < n; i++)
        {
            output[i] = new ScoringEngineV2.ScoreBreakdown(
                Momentum: mom[i],
                Volume: vol[i],
                Catalyst: cat[i],
                Fundamental: fun[i],
                Sentiment: sen[i],
                Trend: trd[i],
                Risk: rsk[i]);
        }
        return output;
    }
}
