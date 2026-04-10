using Fintrest.Api.Core;
using Fintrest.Api.Data;
using Fintrest.Api.DTOs.Watchlists;
using Fintrest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/watchlists")]
public class WatchlistsController(AppDbContext db) : ControllerBase
{
    private async Task<long> GetUserId()
    {
        var id = await User.ResolveUserId(db);
        return id ?? throw new UnauthorizedAccessException();
    }

    [HttpGet]
    public async Task<ActionResult<List<WatchlistResponse>>> ListWatchlists()
    {
        var userId = await GetUserId();
        var watchlists = await db.Watchlists
            .Include(w => w.Items).ThenInclude(i => i.Stock)
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();

        return Ok(watchlists.Select(w => new WatchlistResponse(
            w.Id, w.Name,
            w.Items.Select(i => new WatchlistItemResponse(i.Id, i.StockId, i.Stock.Ticker, i.Stock.Name, i.CreatedAt)).ToList(),
            w.CreatedAt
        )).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<WatchlistResponse>> CreateWatchlist(WatchlistCreateRequest request)
    {
        var userId = await GetUserId();
        var wl = new Watchlist { UserId = userId, Name = request.Name };
        db.Watchlists.Add(wl);
        await db.SaveChangesAsync();
        return Created($"/api/v1/watchlists/{wl.Id}", new WatchlistResponse(wl.Id, wl.Name, [], wl.CreatedAt));
    }

    [HttpPost("{watchlistId}/items")]
    public async Task<IActionResult> AddItem(long watchlistId, WatchlistItemAddRequest request)
    {
        var userId = await GetUserId();
        var wl = await db.Watchlists.FirstOrDefaultAsync(w => w.Id == watchlistId && w.UserId == userId);
        if (wl is null) return NotFound(new { message = "Watchlist not found" });

        var item = new WatchlistItem { WatchlistId = wl.Id, StockId = request.StockId };
        db.WatchlistItems.Add(item);
        await db.SaveChangesAsync();

        return Created("", new { item.Id, item.StockId, item.CreatedAt });
    }

    [HttpDelete("{watchlistId}/items/{itemId}")]
    public async Task<IActionResult> RemoveItem(long watchlistId, long itemId)
    {
        var userId = await GetUserId();
        var item = await db.WatchlistItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.WatchlistId == watchlistId && i.Watchlist.UserId == userId);
        if (item is null) return NotFound();
        db.WatchlistItems.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
