using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

[Table("stocks")]
public class Stock
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(10)]
    public string Ticker { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Exchange { get; set; }

    [MaxLength(100)]
    public string? Sector { get; set; }

    [MaxLength(100)]
    public string? Industry { get; set; }

    public double? MarketCap { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<MarketData> MarketData { get; set; } = [];
    public ICollection<Fundamental> Fundamentals { get; set; } = [];
    public ICollection<Signal> Signals { get; set; } = [];
}

[Table("market_data")]
public class MarketData
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid StockId { get; set; }
    public DateTime Ts { get; set; }
    public double Open { get; set; }
    public double High { get; set; }
    public double Low { get; set; }
    public double Close { get; set; }
    public long Volume { get; set; }

    // Technical indicators
    public double? Ma20 { get; set; }
    public double? Ma50 { get; set; }
    public double? Ma200 { get; set; }
    public double? Rsi14 { get; set; }
    public double? Adx14 { get; set; }
    public double? Atr14 { get; set; }
    public double? VolumeSma30 { get; set; }

    [ForeignKey(nameof(StockId))]
    public Stock Stock { get; set; } = null!;
}

[Table("fundamentals")]
public class Fundamental
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid StockId { get; set; }

    [Required, MaxLength(10)]
    public string Period { get; set; } = string.Empty; // e.g. "2025-Q4"

    public double? Revenue { get; set; }
    public double? RevenueGrowth { get; set; }
    public double? Eps { get; set; }
    public double? EpsSurprise { get; set; }
    public double? GrossMargin { get; set; }
    public double? OperatingMargin { get; set; }
    public double? PeRatio { get; set; }
    public double? PsRatio { get; set; }
    public DateTime? ReportedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(StockId))]
    public Stock Stock { get; set; } = null!;
}
