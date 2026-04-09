using System.ComponentModel.DataAnnotations;

namespace Fintrest.Api.DTOs.Watchlists;

public record WatchlistCreateRequest(string Name = "My Watchlist");

public record WatchlistItemAddRequest([Required] long StockId);

public record WatchlistItemResponse(long Id, long StockId, string Ticker, string StockName, DateTime CreatedAt);

public record WatchlistResponse(long Id, string Name, List<WatchlistItemResponse> Items, DateTime CreatedAt);

public record AlertCreateRequest(
    [Required] string AlertType,
    [Required] string Channel,
    long? StockId,
    string? ThresholdJson
);

public record AlertResponse(long Id, string AlertType, string Channel, bool Active, long? StockId, string? ThresholdJson, DateTime CreatedAt);
