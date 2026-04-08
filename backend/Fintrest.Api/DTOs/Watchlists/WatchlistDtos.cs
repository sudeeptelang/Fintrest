using System.ComponentModel.DataAnnotations;

namespace Fintrest.Api.DTOs.Watchlists;

public record WatchlistCreateRequest(string Name = "My Watchlist");

public record WatchlistItemAddRequest([Required] Guid StockId);

public record WatchlistItemResponse(Guid Id, Guid StockId, string Ticker, string StockName, DateTime AddedAt);

public record WatchlistResponse(Guid Id, string Name, List<WatchlistItemResponse> Items, DateTime CreatedAt);

public record AlertCreateRequest(
    [Required] string AlertType,
    [Required] string Channel,
    string? Config
);

public record AlertResponse(Guid Id, string AlertType, string Channel, bool IsActive, string? Config, DateTime CreatedAt);
