using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

[Table("seo_articles")]
public class SeoArticle
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid StockId { get; set; }

    [Required, MaxLength(255)]
    public string Slug { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(320)]
    public string? MetaDescription { get; set; }

    [Required]
    public string ContentHtml { get; set; } = string.Empty;

    public bool Published { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(StockId))]
    public Stock Stock { get; set; } = null!;
}
