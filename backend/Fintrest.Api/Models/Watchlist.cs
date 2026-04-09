using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

[Table("watchlists")]
public class Watchlist
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long UserId { get; set; }

    [MaxLength(100)]
    public string Name { get; set; } = "My Watchlist";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    public ICollection<WatchlistItem> Items { get; set; } = [];
}

[Table("watchlist_items")]
public class WatchlistItem
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long WatchlistId { get; set; }
    public long StockId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(WatchlistId))]
    public Watchlist Watchlist { get; set; } = null!;

    [ForeignKey(nameof(StockId))]
    public Stock Stock { get; set; } = null!;
}
