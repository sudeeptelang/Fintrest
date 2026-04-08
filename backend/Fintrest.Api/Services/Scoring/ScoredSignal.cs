using static Fintrest.Api.Services.ScoringEngine;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Full output of scoring a single stock — score breakdown, signal type,
/// trade zones, and human-readable explanation.
/// </summary>
public record ScoredSignal
{
    public required Guid StockId { get; init; }
    public required string Ticker { get; init; }
    public required string Name { get; init; }

    // Scores
    public required ScoreBreakdown Breakdown { get; init; }
    public double ScoreTotal => Breakdown.Total;
    public string SignalType => Breakdown.SignalType;

    // Trade zones
    public double? EntryPrice { get; init; }
    public double? StopPrice { get; init; }
    public double? TargetPrice { get; init; }
    public double? RiskRewardRatio { get; init; }

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
