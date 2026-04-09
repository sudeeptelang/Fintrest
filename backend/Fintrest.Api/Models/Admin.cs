using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

[Table("admin_audit_logs")]
public class AdminAuditLog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long? ActorUserId { get; set; }

    [Required, MaxLength(100)]
    public string Action { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? EntityType { get; set; }

    public long? EntityId { get; set; }

    [Column(TypeName = "jsonb")]
    public string? MetadataJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("provider_health")]
public class ProviderHealth
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [MaxLength(100)]
    public string Provider { get; set; } = string.Empty;

    public bool Success { get; set; }
    public int? LatencyMs { get; set; }
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
}

[Table("llm_trace_logs")]
public class LlmTraceLog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long? SignalId { get; set; }

    [MaxLength(50)]
    public string? ExplanationType { get; set; }

    [MaxLength(50)]
    public string? Model { get; set; }

    [MaxLength(255)]
    public string? PromptHash { get; set; }

    [MaxLength(255)]
    public string? OutputHash { get; set; }

    public int? InputTokens { get; set; }
    public int? OutputTokens { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
