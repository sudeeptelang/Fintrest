using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

[Table("news_items")]
public class NewsItem
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid StockId { get; set; }

    [Required]
    public string Headline { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Source { get; set; }

    public string? Url { get; set; }
    public double? SentimentScore { get; set; } // -1.0 to 1.0

    [MaxLength(50)]
    public string? CatalystType { get; set; }

    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(StockId))]
    public Stock Stock { get; set; } = null!;
}
