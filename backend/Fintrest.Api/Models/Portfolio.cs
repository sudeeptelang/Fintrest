using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

[Table("portfolios")]
public class Portfolio
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long UserId { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = "My Portfolio";

    [MaxLength(50)]
    public string? Strategy { get; set; } // growth, value, balanced, aggressive

    public double CashBalance { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    public ICollection<PortfolioHolding> Holdings { get; set; } = [];
    public ICollection<PortfolioTransaction> Transactions { get; set; } = [];
    public ICollection<PortfolioSnapshot> Snapshots { get; set; } = [];
    public ICollection<PortfolioAiRecommendation> Recommendations { get; set; } = [];
    public ICollection<PortfolioRiskMetric> RiskMetrics { get; set; } = [];
}

[Table("portfolio_holdings")]
public class PortfolioHolding
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long PortfolioId { get; set; }
    public long StockId { get; set; }

    public double Quantity { get; set; }
    public double AvgCost { get; set; }
    public double CurrentPrice { get; set; }
    public double CurrentValue { get; set; }
    public double UnrealizedPnl { get; set; }
    public double UnrealizedPnlPct { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(PortfolioId))]
    public Portfolio Portfolio { get; set; } = null!;

    [ForeignKey(nameof(StockId))]
    public Stock Stock { get; set; } = null!;
}

[Table("portfolio_transactions")]
public class PortfolioTransaction
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long PortfolioId { get; set; }
    public long StockId { get; set; }

    [Required, MaxLength(10)]
    public string Type { get; set; } = string.Empty; // BUY, SELL, DIVIDEND

    public double Quantity { get; set; }
    public double Price { get; set; }
    public double Fees { get; set; }
    public double Total { get; set; } // quantity * price + fees
    public string? Notes { get; set; }
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(PortfolioId))]
    public Portfolio Portfolio { get; set; } = null!;

    [ForeignKey(nameof(StockId))]
    public Stock Stock { get; set; } = null!;
}

[Table("portfolio_snapshots")]
public class PortfolioSnapshot
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long PortfolioId { get; set; }
    public DateTime Date { get; set; }
    public double TotalValue { get; set; }
    public double CashValue { get; set; }
    public double InvestedValue { get; set; }
    public double DailyReturnPct { get; set; }
    public double CumulativeReturnPct { get; set; }

    [ForeignKey(nameof(PortfolioId))]
    public Portfolio Portfolio { get; set; } = null!;
}

[Table("portfolio_ai_recommendations")]
public class PortfolioAiRecommendation
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long PortfolioId { get; set; }
    public long? StockId { get; set; }

    [Required, MaxLength(50)]
    public string Type { get; set; } = string.Empty; // REBALANCE, REDUCE, ADD, TAX_LOSS, ALERT

    [MaxLength(10)]
    public string? Ticker { get; set; }

    [Required, MaxLength(20)]
    public string Action { get; set; } = string.Empty; // BUY, SELL, HOLD, REDUCE, INCREASE

    [Required]
    public string Reasoning { get; set; } = string.Empty;

    public double Confidence { get; set; } // 0-100

    [MaxLength(20)]
    public string Status { get; set; } = "PENDING"; // PENDING, APPLIED, DISMISSED

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(PortfolioId))]
    public Portfolio Portfolio { get; set; } = null!;
}

[Table("portfolio_risk_metrics")]
public class PortfolioRiskMetric
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long PortfolioId { get; set; }
    public DateTime Date { get; set; }

    public double? SharpeRatio { get; set; }
    public double? SortinoRatio { get; set; }
    public double? MaxDrawdown { get; set; }
    public double? Beta { get; set; }
    public double? Var95 { get; set; } // Value at Risk 95%
    public double? Volatility { get; set; } // Annualized
    public double? TotalReturn { get; set; }

    [ForeignKey(nameof(PortfolioId))]
    public Portfolio Portfolio { get; set; } = null!;
}
