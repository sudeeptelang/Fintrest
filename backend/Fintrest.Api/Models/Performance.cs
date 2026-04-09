using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

[Table("performance_tracking")]
public class PerformanceTracking
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long SignalId { get; set; }

    [MaxLength(20)]
    public string? EvaluationMode { get; set; }

    public double EntryPrice { get; set; }
    public double? ExitPrice { get; set; }
    public double? MaxDrawdownPct { get; set; }
    public double? MaxRunupPct { get; set; }
    public double? ReturnPct { get; set; }
    public int? DurationDays { get; set; }

    [MaxLength(20)]
    public string? Outcome { get; set; }

    public DateTime? ClosedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(SignalId))]
    public Signal Signal { get; set; } = null!;
}
