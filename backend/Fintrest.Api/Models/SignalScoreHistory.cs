using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Models;

/// <summary>
/// Per-ticker daily composite-score snapshot. Written at scan time by
/// ScanOrchestrator; read by the score-history endpoint to render
/// real sparklines on the Today grid + ticker hero, and to compute
/// real day-over-day deltas on ScoreGradeChip. Migration 025.
///
/// One row per (ticker, as_of_date). If a ticker signals twice in
/// the same day (re-scan), the later row overwrites earlier via the
/// unique index.
/// </summary>
[Table("signal_score_history")]
[Index(nameof(Ticker), nameof(AsOfDate), IsUnique = true)]
[Index(nameof(AsOfDate))]
public class SignalScoreHistory
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Required, MaxLength(20)]
    public string Ticker { get; set; } = string.Empty;

    [Column(TypeName = "date")]
    public DateTime AsOfDate { get; set; }

    [Column(TypeName = "numeric(5,2)")]
    public decimal ScoreTotal { get; set; }

    // Phase 2 of multi-lens scoring (migration 029).
    // ScoreTotal carries the Setup lens (current swing-trade formula).
    // CompositeScore is the balanced "good investment overall" lens.
    // QualityScore is the fundamentals-led "would I hold long-term" lens.
    // Nullable so pre-Phase-2 rows stay valid without a backfill.
    [Column(TypeName = "numeric(5,2)")]
    public decimal? CompositeScore { get; set; }

    [Column(TypeName = "numeric(5,2)")]
    public decimal? QualityScore { get; set; }

    [MaxLength(20)]
    public string? SignalType { get; set; }

    public long? ScanRunId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
