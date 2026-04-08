using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

[Table("admin_audit_logs")]
public class AdminAuditLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? AdminUserId { get; set; }

    [Required, MaxLength(100)]
    public string Action { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? ResourceType { get; set; }

    [MaxLength(100)]
    public string? ResourceId { get; set; }

    [Column(TypeName = "jsonb")]
    public string? Details { get; set; }

    [MaxLength(45)]
    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
