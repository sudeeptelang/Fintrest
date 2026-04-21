using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

/// <summary>
/// One row per briefing dispatch (morning or weekly). Populated by
/// <c>AlertDispatcher</c> so the admin dashboard can answer "did today's
/// email actually send?" — previously the dispatcher only logged to stdout.
/// </summary>
[Table("briefing_run")]
public class BriefingRun
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    /// <summary><c>"morning"</c> or <c>"weekly"</c>.</summary>
    [Column("kind")]
    public string Kind { get; set; } = "morning";

    [Column("started_at")]
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    /// <summary>Scan run whose signals were included. Null if no scan completed before send.</summary>
    [Column("scan_run_id")]
    public long? ScanRunId { get; set; }

    [Column("audience_size")]
    public int AudienceSize { get; set; }

    [Column("sent_count")]
    public int SentCount { get; set; }

    [Column("failed_count")]
    public int FailedCount { get; set; }

    /// <summary><c>"running"</c> | <c>"completed"</c> | <c>"failed"</c>.</summary>
    [Column("status")]
    public string Status { get; set; } = "running";

    [Column("error_message")]
    public string? ErrorMessage { get; set; }
}
