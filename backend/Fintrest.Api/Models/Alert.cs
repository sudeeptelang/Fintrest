using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

[Table("alerts")]
public class Alert
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long UserId { get; set; }
    public long? StockId { get; set; }

    [Required, MaxLength(50)]
    public string AlertType { get; set; } = string.Empty;

    [Required, MaxLength(10)]
    public string Channel { get; set; } = string.Empty; // email, sms, push

    [Column(TypeName = "jsonb")]
    public string? ThresholdJson { get; set; }

    public bool Active { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(StockId))]
    public Stock? Stock { get; set; }

    public ICollection<AlertDelivery> Deliveries { get; set; } = [];
}

[Table("alert_deliveries")]
public class AlertDelivery
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long AlertId { get; set; }
    public long? SignalId { get; set; }
    public long? UserId { get; set; }

    [Required, MaxLength(20)]
    public string DeliveryChannel { get; set; } = string.Empty;

    [MaxLength(20)]
    public string DeliveryStatus { get; set; } = "pending";

    public DateTime? SentAt { get; set; }

    [MaxLength(255)]
    public string? ProviderMessageId { get; set; }

    [ForeignKey(nameof(AlertId))]
    public Alert Alert { get; set; } = null!;
}
