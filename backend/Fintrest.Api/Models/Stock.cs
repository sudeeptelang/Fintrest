using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

[Table("stocks")]
public class Stock
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

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
    public double? FloatShares { get; set; }

    [MaxLength(10)]
    public string? Country { get; set; }

    // Slow-changing per-stock profile metrics (refreshed by FMP /profile, /key-metrics-ttm,
    // /ratios-ttm, /price-target-consensus, /earning_calendar). Live on Stock rather than
    // Fundamental because Fundamental rows are quarterly and these are TTM/forward.
    public double? Beta { get; set; }
    public double? AnalystTargetPrice { get; set; }
    public DateTime? NextEarningsDate { get; set; }
    public double? ForwardPe { get; set; }
    public double? PegRatio { get; set; }
    public double? PriceToBook { get; set; }
    public double? ReturnOnEquity { get; set; }
    public double? ReturnOnAssets { get; set; }
    public double? OperatingMargin { get; set; }
    public DateTime? MetricsUpdatedAt { get; set; }

    public bool Active { get; set; } = true;
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
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long StockId { get; set; }

    [MaxLength(10)]
    public string? Timeframe { get; set; }

    public DateTime Ts { get; set; }
    public double Open { get; set; }
    public double High { get; set; }
    public double Low { get; set; }
    public double Close { get; set; }
    public long Volume { get; set; }
    public double? AvgVolume { get; set; }
    public double? Vwap { get; set; }
    public double? PrevClose { get; set; }

    // Technical indicators
    public double? Rsi { get; set; }
    public double? Macd { get; set; }
    public double? MacdSignal { get; set; }
    public double? Ma20 { get; set; }
    public double? Ma50 { get; set; }
    public double? Ma200 { get; set; }
    public double? Atr { get; set; }
    public double? AtrPct { get; set; }

    [Column(TypeName = "jsonb")]
    public string? RawJson { get; set; }

    [MaxLength(100)]
    public string? VendorSourceId { get; set; }

    [ForeignKey(nameof(StockId))]
    public Stock Stock { get; set; } = null!;
}

[Table("fundamentals")]
public class Fundamental
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long StockId { get; set; }
    public DateTime? ReportDate { get; set; }
    public double? RevenueGrowth { get; set; }
    public double? EpsGrowth { get; set; }
    public double? GrossMargin { get; set; }
    public double? NetMargin { get; set; }
    public double? PeRatio { get; set; }
    public double? PsRatio { get; set; }
    public double? DebtToEquity { get; set; }
    public double? MarketCap { get; set; }
    public double? FloatShares { get; set; }

    [MaxLength(100)]
    public string? VendorSourceId { get; set; }

    [Column(TypeName = "jsonb")]
    public string? RawJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(StockId))]
    public Stock Stock { get; set; } = null!;
}
