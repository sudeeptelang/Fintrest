using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

/// <summary>
/// Per-ticker, per-day decomposition of the fundamentals score into three
/// sector-normalized sub-models (Quality / Profitability / Growth).
/// §14.1 in docs/SIGNALS_V3.md. The nightly FundamentalSubscoreJob writes
/// these rows; the scoring engine reads them to blend a composite fundamentals
/// score that's transparent to users ("strong profitability, weak growth").
/// </summary>
[Table("fundamental_subscore")]
public class FundamentalSubscore
{
    [Column("ticker")]
    public string Ticker { get; set; } = "";

    [Column("as_of_date")]
    public DateOnly AsOfDate { get; set; }

    [Column("sector")]
    public string? Sector { get; set; }

    // Raw 0..100 — signal strength before peer ranking
    [Column("quality_raw")]
    public double? QualityRaw { get; set; }

    [Column("profitability_raw")]
    public double? ProfitabilityRaw { get; set; }

    [Column("growth_raw")]
    public double? GrowthRaw { get; set; }

    // Percentile within sector 0..1
    [Column("quality_rank")]
    public double? QualityRank { get; set; }

    [Column("profitability_rank")]
    public double? ProfitabilityRank { get; set; }

    [Column("growth_rank")]
    public double? GrowthRank { get; set; }

    // Final 0..100 — blend of raw and rank, what the scoring engine consumes
    [Column("quality_score")]
    public double? QualityScore { get; set; }

    [Column("profitability_score")]
    public double? ProfitabilityScore { get; set; }

    [Column("growth_score")]
    public double? GrowthScore { get; set; }

    /// <summary>JSONB: which underlying FMP fields were present for this ticker on this date.</summary>
    [Column("inputs_available_json", TypeName = "jsonb")]
    public string? InputsAvailableJson { get; set; }

    [Column("computed_at")]
    public DateTime ComputedAt { get; set; } = DateTime.UtcNow;
}
