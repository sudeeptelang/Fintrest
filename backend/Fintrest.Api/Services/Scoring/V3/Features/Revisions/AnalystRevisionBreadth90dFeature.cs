namespace Fintrest.Api.Services.Scoring.V3.Features.Revisions;

/// <summary>
/// Net direction of analyst rating changes over the last 90 days — a
/// sentiment-breadth signal. Counts "up" and "down" events, ignores
/// "reiterate" / "initialize" / "target" (which don't indicate a change in
/// stance), and returns the net ratio as a percentage in the range −100 to +100.
///
/// <para><b>Interpretation:</b> <c>+40</c> means 70% of active analyst revisions
/// over the last 90 days were upgrades. <c>−40</c> is the reverse.
/// <c>0</c> (and near-zero) means balanced sentiment or no activity.</para>
///
/// <para>Returns <c>null</c> when we have no analyst-revision data for the
/// ticker in <see cref="FeatureComputationContext.AnalystRevisionsByTicker"/> —
/// either the universe skip path or the FMP call failed. Null is correct
/// because a feature of 0 would be interpretable as "balanced sentiment",
/// which is not the same as "missing data".</para>
/// </summary>
public class AnalystRevisionBreadth90dFeature : IFeature
{
    public string Name    => "analyst_revision_breadth_90d";
    public string Source  => "fmp";
    public string Version => "1";

    private const int WindowDays = 90;

    public Task<FeatureOutput?> ComputeAsync(
        string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.AnalystRevisionsByTicker.TryGetValue(ticker, out var events))
            return Task.FromResult<FeatureOutput?>(null);

        var cutoff = DateTime.UtcNow.AddDays(-WindowDays);
        int ups = 0, downs = 0;
        foreach (var e in events)
        {
            if (e.Date < cutoff) continue;
            var a = e.Action ?? "";
            if (a == "up")   ups++;
            else if (a == "down") downs++;
            // "reiterate" / "initialize" / "target" = not a direction change
        }

        var total = ups + downs;
        if (total == 0)
            return Task.FromResult<FeatureOutput?>(new FeatureOutput(0, DateTime.UtcNow));

        var breadthPct = (ups - downs) / (double)total * 100.0;
        var asOfTs = DateTime.UtcNow;
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(breadthPct, asOfTs));
    }
}
