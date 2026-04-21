using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

/// <summary>
/// Persisted last-run state per scheduled job. Lets jobs survive a backend
/// restart without skipping a day: compare today's ET date to
/// <see cref="LastSuccessDate"/> and fire if today hasn't been done yet.
/// </summary>
[Table("job_state")]
public class JobState
{
    [Column("job_name")]
    public string JobName { get; set; } = "";

    /// <summary>ET (America/New_York) date of the last successful run.</summary>
    [Column("last_success_date")]
    public DateOnly? LastSuccessDate { get; set; }

    [Column("last_success_at")]
    public DateTime? LastSuccessAt { get; set; }

    [Column("last_error_at")]
    public DateTime? LastErrorAt { get; set; }

    [Column("last_error_message")]
    public string? LastErrorMessage { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
