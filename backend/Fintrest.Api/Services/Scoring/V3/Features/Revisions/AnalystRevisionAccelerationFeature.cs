namespace Fintrest.Api.Services.Scoring.V3.Features.Revisions;

/// <summary>
/// Analyst-revision acceleration — difference between 30-day breadth and
/// 90-day breadth. Positive means recent revisions skew more bullish than the
/// quarter-long trend (the narrative is *changing*); negative means fading.
/// §14.2 in docs/SIGNALS_V3.md.
///
/// <para><b>Why this matters:</b> a stock with 90d breadth of +30 but 30d
/// breadth of +60 is catching an upgrade cluster — a different trade than
/// one that's been steadily +30 all quarter. Practitioner research calls
/// this "revisions momentum" and finds it a meaningful add on top of raw
/// breadth.</para>
///
/// <para>Computes both windows inline instead of reading the outputs of
/// <see cref="AnalystRevisionBreadth30dFeature"/> + the 90d one — keeps
/// features stateless and order-independent.</para>
/// </summary>
public class AnalystRevisionAccelerationFeature : IFeature
{
    public string Name    => "analyst_revision_acceleration";
    public string Source  => "fmp";
    public string Version => "1";

    public Task<FeatureOutput?> ComputeAsync(
        string ticker, FeatureComputationContext ctx, CancellationToken ct = default)
    {
        if (!ctx.AnalystRevisionsByTicker.TryGetValue(ticker, out var events))
            return Task.FromResult<FeatureOutput?>(null);

        var now = DateTime.UtcNow;
        var cutoff30 = now.AddDays(-30);
        var cutoff90 = now.AddDays(-90);

        int ups30 = 0, downs30 = 0, ups90 = 0, downs90 = 0;
        foreach (var e in events)
        {
            if (e.Date < cutoff90) continue;
            var a = e.Action ?? "";
            if (a == "up")
            {
                ups90++;
                if (e.Date >= cutoff30) ups30++;
            }
            else if (a == "down")
            {
                downs90++;
                if (e.Date >= cutoff30) downs30++;
            }
        }

        double Breadth(int up, int down) =>
            (up + down) == 0 ? 0 : (up - down) / (double)(up + down) * 100.0;

        // Require at least a handful of events in each window — otherwise
        // "acceleration" is noise on tiny samples.
        var total90 = ups90 + downs90;
        var total30 = ups30 + downs30;
        if (total90 < 3 || total30 < 2)
            return Task.FromResult<FeatureOutput?>(null);

        var acceleration = Breadth(ups30, downs30) - Breadth(ups90, downs90);
        return Task.FromResult<FeatureOutput?>(new FeatureOutput(acceleration, now));
    }
}
