using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

public enum SignalType { BuyToday, Watch, Avoid, TakeProfit, HighRisk }

[Table("scan_runs")]
public class ScanRun
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "running"; // running, success, failed

    public int SignalsGenerated { get; set; }
    public int? DurationMs { get; set; }
    public string? ErrorMessage { get; set; }

    [MaxLength(20)]
    public string StrategyVersion { get; set; } = "v1.0";

    public ICollection<Signal> Signals { get; set; } = [];
}

[Table("signals")]
public class Signal
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid StockId { get; set; }
    public Guid ScanRunId { get; set; }

    [Required]
    public SignalType SignalType { get; set; }

    public double ScoreTotal { get; set; }

    // Trade zone
    public double? EntryPrice { get; set; }
    public double? StopPrice { get; set; }
    public double? TargetPrice { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

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
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SignalId { get; set; }

    // 7 factor scores (0-100)
    public double MomentumScore { get; set; }
    public double VolumeScore { get; set; }
    public double CatalystScore { get; set; }
    public double FundamentalScore { get; set; }
    public double SentimentScore { get; set; }
    public double TrendScore { get; set; }
    public double RiskScore { get; set; }

    // JSON explanation
    [Column(TypeName = "jsonb")]
    public string? ExplanationJson { get; set; }

    [Column(TypeName = "jsonb")]
    public string? FactorProvenance { get; set; }

    [ForeignKey(nameof(SignalId))]
    public Signal Signal { get; set; } = null!;
}

[Table("signal_events")]
public class SignalEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SignalId { get; set; }

    [Required, MaxLength(50)]
    public string EventType { get; set; } = string.Empty;

    [Column(TypeName = "jsonb")]
    public string? Payload { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(SignalId))]
    public Signal Signal { get; set; } = null!;
}
