namespace Fintrest.Api.Services.Scoring.V3;

/// <summary>
/// Canonical resolver for <c>as_of_ts</c> on every feature row. All FMP-fundamentals
/// ingestion MUST route through this class — never call <see cref="DateTime"/> math
/// inline at the call site, and never use fiscal period-end as the knowable timestamp.
///
/// Rule set (see docs/SIGNALS_V3.md §6 and the matching project memory):
///
///   1. FMP <c>/stable/income-statement</c> and <c>/stable/balance-sheet-statement</c>
///      expose <c>fillingDate</c> on modern rows — use that as <c>as_of_ts</c>,
///      <c>source = "fmp"</c>.
///
///   2. If <c>fillingDate</c> is missing (older filings), fall back to
///      <c>period_end + 45 calendar days</c> as a conservative estimated-knowable
///      timestamp, and mark <c>source = "fmp_estimated_lag"</c> so audits can flag
///      these rows later.
///
///   3. NEVER use <c>period_end</c> itself as the knowable timestamp — that's the
///      classic lookahead leak that makes backtests lie about their alpha.
///
/// Other feature sources (news, OHLCV, analyst revisions) each have their own rule
/// and are added here as helpers grow.
/// </summary>
public static class AsOfTsResolver
{
    /// <summary>Default lag applied when FMP fundamentals row has no <c>fillingDate</c>.</summary>
    public const int FmpMissingFillingLagDays = 45;

    public const string SourceFmp = "fmp";
    public const string SourceFmpEstimated = "fmp_estimated_lag";

    /// <summary>
    /// Resolve <c>as_of_ts</c> + <c>source</c> for a row coming from FMP income
    /// statement or balance-sheet statement endpoints. Returns a tuple the caller
    /// feeds into <see cref="FeatureStore.UpsertAsync"/>.
    /// </summary>
    public static (DateTime AsOfTs, string Source) ForFmpFundamental(
        DateTime? fillingDate, DateTime periodEnd)
    {
        if (fillingDate.HasValue && fillingDate.Value > periodEnd)
            return (DateTime.SpecifyKind(fillingDate.Value, DateTimeKind.Utc), SourceFmp);

        var estimated = periodEnd.AddDays(FmpMissingFillingLagDays);
        return (DateTime.SpecifyKind(estimated, DateTimeKind.Utc), SourceFmpEstimated);
    }

    /// <summary>
    /// OHLCV bars / technical indicators — knowable at the bar's 4 PM ET close.
    /// Kept here as a sibling helper so every feature source uses one resolver.
    /// </summary>
    public static DateTime ForOhlcvBar(DateOnly barDate)
    {
        // 16:00 America/New_York on the bar date, converted to UTC.
        var et = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
        var local = new DateTime(barDate.Year, barDate.Month, barDate.Day, 16, 0, 0, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(local, et);
    }

    /// <summary>News publish timestamp IS the as_of_ts — trivial pass-through helper
    /// so callers don't hand-roll the UTC conversion.</summary>
    public static DateTime ForNewsPublished(DateTime publishedAt)
        => publishedAt.Kind == DateTimeKind.Utc ? publishedAt : publishedAt.ToUniversalTime();
}
