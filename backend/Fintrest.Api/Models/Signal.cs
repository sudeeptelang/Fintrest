using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

public enum SignalType
{
    [System.Runtime.Serialization.EnumMember(Value = "BUY_TODAY")]
    BUY_TODAY,
    [System.Runtime.Serialization.EnumMember(Value = "WATCH")]
    WATCH,
    [System.Runtime.Serialization.EnumMember(Value = "AVOID")]
    AVOID,
    [System.Runtime.Serialization.EnumMember(Value = "TAKE_PROFIT")]
    TAKE_PROFIT,
    [System.Runtime.Serialization.EnumMember(Value = "HIGH_RISK")]
    HIGH_RISK
}

[Table("scan_runs")]
public class ScanRun
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Required, MaxLength(50)]
    public string RunType { get; set; } = "daily";

    [MaxLength(20)]
    public string? MarketSession { get; set; }

    [MaxLength(20)]
    public string StrategyVersion { get; set; } = "v1.0";

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public int? UniverseSize { get; set; }
    public int SignalsGenerated { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "running"; // running, success, failed

    public ICollection<Signal> Signals { get; set; } = [];
}

[Table("signals")]
public class Signal
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long StockId { get; set; }
    public long ScanRunId { get; set; }

    public double ScoreTotal { get; set; }

    [Required]
    public SignalType SignalType { get; set; }

    [MaxLength(20)]
    public string? StrategyVersion { get; set; }

    // Trade zone
    public double? EntryLow { get; set; }
    public double? EntryHigh { get; set; }
    public double? StopLoss { get; set; }
    public double? TargetLow { get; set; }
    public double? TargetHigh { get; set; }

    [MaxLength(20)]
    public string? RiskLevel { get; set; }

    public int? HorizonDays { get; set; }

    [MaxLength(20)]
    public string? Status { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }

    // Navigation
    [ForeignKey(nameof(StockId))]
    public Stock Stock { get; set; } = null!;

    [ForeignKey(nameof(ScanRunId))]
    public ScanRun ScanRun { get; set; } = null!;

    public SignalBreakdown? Breakdown { get; set; }
    public ICollection<SignalEvent> Events { get; set; } = [];
}

[Table("signal_breakdowns")]
public class SignalBreakdown
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long SignalId { get; set; }

    // 8 factor scores (0-100)
    public double MomentumScore { get; set; }
    public double RelVolumeScore { get; set; }
    public double NewsScore { get; set; }
    public double FundamentalsScore { get; set; }
    public double SentimentScore { get; set; }
    public double TrendScore { get; set; }
    public double RiskScore { get; set; }
    // Smart Money family — 25% of composite (matches TipRanks Smart Score
    // ceiling). Composed of Insider 35% / Institutional 25% / Short 15%
    // / Congressional 15% / Options 10%. Defaults to 50 (neutral) when
    // sub-signals are missing so tickers without smart-money data don't
    // crater. Persisted per signal for explainability.
    public double SmartMoneyScore { get; set; } = 50.0;

    // JSON explanation
    [Column(TypeName = "jsonb")]
    public string? ExplanationJson { get; set; }

    public string? WhyNowSummary { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(SignalId))]
    public Signal Signal { get; set; } = null!;
}

[Table("signal_events")]
public class SignalEvent
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long SignalId { get; set; }

    [Required, MaxLength(50)]
    public string EventType { get; set; } = string.Empty;

    public DateTime EventTs { get; set; } = DateTime.UtcNow;

    [Column(TypeName = "jsonb")]
    public string? PayloadJson { get; set; }

    [ForeignKey(nameof(SignalId))]
    public Signal Signal { get; set; } = null!;
}
