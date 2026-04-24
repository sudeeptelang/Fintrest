using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Models;

/// <summary>
/// Per-ticker short-interest snapshot from FMP's /stable/short-interest
/// feed (which aggregates FINRA bi-monthly reporting). One row per
/// (ticker, settlement_date) so we can trend short_pct_float over time
/// — current MVP only reads the latest row for the Smart Money
/// "Short dynamics" sub-signal.
/// </summary>
[Table("short_interest_snapshots")]
[Index(nameof(Ticker), nameof(SettlementDate), IsUnique = true)]
[Index(nameof(SettlementDate))]
public class ShortInterestSnapshot
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Required, MaxLength(20)]
    public string Ticker { get; set; } = string.Empty;

    [Column(TypeName = "date")]
    public DateTime SettlementDate { get; set; }

    public long? ShortInterestShares { get; set; }
    public long? FloatShares { get; set; }

    /// <summary>Percent of float held short, e.g. 12.45 means 12.45%.</summary>
    [Column(TypeName = "numeric(8,4)")]
    public decimal? ShortPctFloat { get; set; }

    [Column(TypeName = "numeric(8,2)")]
    public decimal? DaysToCover { get; set; }

    public long? AvgDailyVolume { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
