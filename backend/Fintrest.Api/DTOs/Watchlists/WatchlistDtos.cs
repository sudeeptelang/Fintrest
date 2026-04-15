using System.ComponentModel.DataAnnotations;

namespace Fintrest.Api.DTOs.Watchlists;

public record WatchlistCreateRequest(string Name = "My Watchlist");

public record WatchlistItemAddRequest([Required] long StockId);

public record WatchlistItemResponse(
    long Id,
    long StockId,
    string Ticker,
    string StockName,
    DateTime CreatedAt,
    // Live market + signal data so watchlist rows are actionable at a glance
    double? CurrentPrice = null,
    double? ChangePct = null,
    double? SignalScore = null,
    string? SignalType = null,
    string? Verdict = null,
    double? EntryLow = null,
    double? EntryHigh = null,
    double? StopLoss = null,
    double? TargetLow = null,
    double? TargetHigh = null,
    double? RiskReward = null
);

public record WatchlistResponse(long Id, string Name, List<WatchlistItemResponse> Items, DateTime CreatedAt);

public record AlertCreateRequest(
    [Required] string AlertType,
    [Required] string Channel,
    long? StockId,
    string? ThresholdJson
);

public record AlertResponse(long Id, string AlertType, string Channel, bool Active, long? StockId, string? Ticker, string? ThresholdJson, DateTime CreatedAt);
