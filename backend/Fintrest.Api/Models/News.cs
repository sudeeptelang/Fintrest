using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

[Table("news_items")]
public class NewsItem
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long StockId { get; set; }

    [Required]
    public string Headline { get; set; } = string.Empty;

    public string? Summary { get; set; }

    [MaxLength(100)]
    public string? Source { get; set; }

    public string? Url { get; set; }
    public DateTime? PublishedAt { get; set; }
    public double? SentimentScore { get; set; } // -1.0 to 1.0

    [MaxLength(50)]
    public string? CatalystType { get; set; }

    [MaxLength(100)]
    public string? VendorSourceId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Athena's 2-3 sentence editorial take on this headline, tied to the ticker's context.
    /// Generated on-demand the first time a user opens the news reader, then cached here
    /// forever — headlines don't change, so one LLM call per article per lifetime.
    /// </summary>
    public string? AthenaSummary { get; set; }

    public DateTime? AthenaSummaryAt { get; set; }

    [ForeignKey(nameof(StockId))]
    public Stock Stock { get; set; } = null!;
}
