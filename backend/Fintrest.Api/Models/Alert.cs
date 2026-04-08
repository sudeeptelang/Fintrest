using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

[Table("alerts")]
public class Alert
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [Required, MaxLength(50)]
    public string AlertType { get; set; } = string.Empty;

    [Required, MaxLength(10)]
    public string Channel { get; set; } = string.Empty; // email, sms, push

    [Column(TypeName = "jsonb")]
    public string? Config { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    public ICollection<AlertDelivery> Deliveries { get; set; } = [];
}

[Table("alert_deliveries")]
public class AlertDelivery
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AlertId { get; set; }
    public Guid? SignalId { get; set; }

    [Required, MaxLength(10)]
    public string Channel { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public DateTime? SentAt { get; set; }
    public string? ErrorMessage { get; set; }

    [ForeignKey(nameof(AlertId))]
    public Alert Alert { get; set; } = null!;
}
