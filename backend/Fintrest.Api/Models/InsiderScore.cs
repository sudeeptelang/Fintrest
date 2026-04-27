using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Models;

/// <summary>
/// Per-ticker insider-activity composite (0-100). Computed nightly from
/// insider_transactions using the 30-day rolling window. Composite is a
/// weighted blend of net dollar flow (50%), distinct-insider cluster
/// count (30%), and officer-vs-director seniority (20%).
///
/// Highlight fields capture the single strongest transaction in the
/// window so the Smart Money sub-card can render a specific Lens line
/// like "CFO bought $2.4M — largest since 2023" without a second query.
/// </summary>
[Table("insider_scores")]
[PrimaryKey(nameof(Ticker), nameof(AsOfDate))]
[Index(nameof(AsOfDate))]
public class InsiderScore
{
    [Required, MaxLength(20)]
    public string Ticker { get; set; } = string.Empty;

    [Column(TypeName = "date")]
    public DateTime AsOfDate { get; set; }

    [Column(TypeName = "numeric(5,2)")]
    public decimal Score { get; set; }

    // Explicit [Column] mapping — the snake-case naming convention
    // turns "NetDollarFlow30d" into "net_dollar_flow30d" (no separator
    // before the "30d"), but the DB migration uses "net_dollar_flow_30d".
    // Same for ClusterCount30d → cluster_count_30d. Without these
    // mappings, EF queries fail with `column does not exist`.
    [Column("net_dollar_flow_30d", TypeName = "numeric(18,2)")]
    public decimal? NetDollarFlow30d { get; set; }

    [Column("cluster_count_30d")]
    public int? ClusterCount30d { get; set; }
    public int? OfficerBuyCount { get; set; }
    public int? DirectorBuyCount { get; set; }

    [Column(TypeName = "numeric(18,2)")]
    public decimal? LargestPurchaseValue { get; set; }

    public string? LargestPurchaserName { get; set; }
    public string? LargestPurchaserTitle { get; set; }

    /// <summary>
    /// Pre-computed sentence like "largest purchase since records begin"
    /// or "first disclosed open-market purchase". Renders directly into
    /// the Smart Money sub-card under the score bar.
    /// </summary>
    public string? LargestPurchaserHistoryNote { get; set; }

    [Required, MaxLength(50)]
    public string MethodologyVersion { get; set; } = "insider_v1.0";

    public DateTime ComputedAt { get; set; } = DateTime.UtcNow;
}
