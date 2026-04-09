using static Fintrest.Api.Services.ScoringEngine;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Full output of scoring a single stock — score breakdown, signal type,
/// trade zones, and human-readable explanation.
/// </summary>
public record ScoredSignal
{
    public required long StockId { get; init; }
    public required string Ticker { get; init; }
    public required string Name { get; init; }

    // Scores
    public required ScoreBreakdown Breakdown { get; init; }
    public double ScoreTotal => Breakdown.Total;
    public string SignalType => Breakdown.SignalType;

    // Trade zones (range-based: low/high for entry and target)
    public double? EntryLow { get; init; }
    public double? EntryHigh { get; init; }
    public double? StopLoss { get; init; }
    public double? TargetLow { get; init; }
    public double? TargetHigh { get; init; }
    public double? RiskRewardRatio { get; init; }

    // Risk metadata
    public string? RiskLevel { get; init; }
    public int? HorizonDays { get; init; }

    // Explanation
    public required SignalExplanation Explanation { get; init; }

    // Provenance — what data went into the score
    public required Dictionary<string, object?> Provenance { get; init; }
}

public record SignalExplanation
{
    public required string Summary { get; init; }
    public required List<string> BullishFactors { get; init; }
    public required List<string> BearishFactors { get; init; }
    public required string TradeZoneNarrative { get; init; }
}
