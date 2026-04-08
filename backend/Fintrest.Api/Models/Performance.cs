using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

[Table("performance_tracking")]
public class PerformanceTracking
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SignalId { get; set; }
    public double EntryPrice { get; set; }
    public double? ExitPrice { get; set; }
    public double? ReturnPct { get; set; }
    public double? MaxDrawdown { get; set; }
    public double? MaxGain { get; set; }
    public int? DaysHeld { get; set; }
    public bool IsClosed { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(SignalId))]
    public Signal Signal { get; set; } = null!;
}
