namespace Fintrest.Api.Services.Scoring.V3.Features.Revisions;

/// <summary>
/// Short-window (30d) analyst-revision breadth — counterpart to the 90d
/// version. §14.2 in docs/SIGNALS_V3.md.
///
/// <para><b>Why two windows:</b> 30d captures recent sentiment shifts that get
/// diluted in the 90d aggregate. Used alongside the 90d version by the
/// <see cref="AnalystRevisionAccelerationFeature"/>, which reads the delta
/// between them as "revisions accelerating vs decelerating."</para>
///
/// <para>Returns <c>null</c> when no revision data is available for the ticker
/// (same semantics as the 90d feature — null ≠ zero).</para>
/// </summary>
public class AnalystRevisionBreadth30dFeature : IFeature
{
    public string Name    => "analyst_revision_breadth_30d";
    public string Source  => "fmp";
    public string Version => "1";

    private const int WindowDays = 30;

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
        }

        var total = ups + downs;
        if (total == 0)
            return Task.FromResult<FeatureOutput?>(new FeatureOutput(0, DateTime.UtcNow));

        var breadthPct = (ups - downs) / (double)total * 100.0;
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(breadthPct, DateTime.UtcNow));
    }
}
