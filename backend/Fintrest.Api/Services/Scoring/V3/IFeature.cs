using Fintrest.Api.Models;

namespace Fintrest.Api.Services.Scoring.V3;

/// <summary>
/// Contract every v3 feature implementation must satisfy. One <see cref="IFeature"/>
/// per <c>feature_name</c>: a single thin class owns the compute + the name + the
/// source tag. Implementations are stateless — all per-run inputs come through
/// <see cref="FeatureComputationContext"/>.
/// </summary>
public interface IFeature
{
    /// <summary>Feature identifier, matches what ends up in <c>features.feature_name</c>.
    /// Snake_case convention, must be unique across the registry.</summary>
    string Name { get; }

    /// <summary>Provider tag written to <c>features.source</c>. Values: "polygon",
    /// "fmp", "fmp_estimated_lag", "finnhub", "fred", "computed".</summary>
    string Source { get; }

    /// <summary>Bump when the compute changes. Used by the backfill tooling to
    /// decide whether history needs recomputation (see M2 plan §2.6).</summary>
    string Version { get; }

    /// <summary>True if this feature should run today. Lets us skip macro features
    /// when FRED is down, or short-interest if Finnhub plan blocks it, without a
    /// code deploy. Default is true; override for plan-gated features.</summary>
    bool IsEnabled(FeatureComputationContext ctx) => true;

    /// <summary>
    /// Compute the feature value for one ticker on the trade date in <paramref name="ctx"/>.
    /// Return <c>null</c> if there isn't enough history or the input is missing —
    /// the runner records that as coverage loss, not an error.
    /// </summary>
    Task<FeatureOutput?> ComputeAsync(
        string ticker,
        FeatureComputationContext ctx,
        CancellationToken ct = default);
}

/// <summary>
/// What a feature emits. The runner packs this into a <see cref="FeatureRow"/>
/// before handing the batch to <see cref="FeatureBulkRepository"/>.
/// </summary>
public readonly record struct FeatureOutput(double Value, DateTime AsOfTs);
