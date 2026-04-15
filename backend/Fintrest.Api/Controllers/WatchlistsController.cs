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

        // Collect all stocks on the user's watchlists, then fetch latest price + latest active signal
        // in two round-trips so item rows can render score, verdict, and trade zone without the
        // frontend making N+1 calls per watchlist.
        var stockIds = watchlists.SelectMany(w => w.Items).Select(i => i.StockId).Distinct().ToList();

        Dictionary<long, (double? Price, double? ChangePct)> priceByStock = new();
        if (stockIds.Count > 0)
        {
            var cutoff = DateTime.UtcNow.AddDays(-7);
            var recentBars = await db.MarketData
                .Where(m => stockIds.Contains(m.StockId) && m.Ts >= cutoff)
                .Select(m => new { m.StockId, m.Ts, m.Close })
                .ToListAsync();
            foreach (var grp in recentBars.GroupBy(m => m.StockId))
            {
                var ordered = grp.OrderByDescending(m => m.Ts).Take(2).ToList();
                double? price = ordered.Count > 0 ? ordered[0].Close : null;
                double? change = null;
                if (ordered.Count >= 2 && ordered[1].Close > 0)
                    change = Math.Round((ordered[0].Close - ordered[1].Close) / ordered[1].Close * 100, 2);
                priceByStock[grp.Key] = (price, change);
            }
        }

        Dictionary<long, Signal> latestSignalByStock = new();
        Dictionary<long, SignalBreakdown> breakdownBySignal = new();
        if (stockIds.Count > 0)
        {
            var signals = await db.Signals
                .Where(s => stockIds.Contains(s.StockId) && s.Status == "ACTIVE")
                .ToListAsync();
            latestSignalByStock = signals
                .GroupBy(s => s.StockId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.CreatedAt).First());
            var sigIds = latestSignalByStock.Values.Select(s => s.Id).ToList();
            breakdownBySignal = await db.SignalBreakdowns
                .Where(b => sigIds.Contains(b.SignalId))
                .ToDictionaryAsync(b => b.SignalId);
        }

        return Ok(watchlists.Select(w => new WatchlistResponse(
            w.Id, w.Name,
            w.Items.Select(i =>
            {
                var (price, change) = priceByStock.TryGetValue(i.StockId, out var p) ? p : (null, null);
                latestSignalByStock.TryGetValue(i.StockId, out var sig);
                SignalBreakdown? bd = null;
                if (sig is not null) breakdownBySignal.TryGetValue(sig.Id, out bd);

                double? rr = null;
                if (sig?.EntryHigh is > 0 && sig.StopLoss is > 0 && sig.TargetLow is > 0)
                {
                    var reward = (sig.TargetLow ?? 0) - (sig.EntryHigh ?? 0);
                    var risk = (sig.EntryHigh ?? 0) - (sig.StopLoss ?? 0);
                    if (risk > 0) rr = Math.Round(reward / risk, 2);
                }

                return new WatchlistItemResponse(
                    i.Id, i.StockId, i.Stock.Ticker, i.Stock.Name, i.CreatedAt,
                    CurrentPrice: price,
                    ChangePct: change,
                    SignalScore: sig?.ScoreTotal,
                    SignalType: sig?.SignalType.ToString(),
                    Verdict: ClassifyWatchlistVerdict(i.Stock, sig?.SignalType.ToString(), bd, change),
                    EntryLow: sig?.EntryLow,
                    EntryHigh: sig?.EntryHigh,
                    StopLoss: sig?.StopLoss,
                    TargetLow: sig?.TargetLow,
                    TargetHigh: sig?.TargetHigh,
                    RiskReward: rr
                );
            }).ToList(),
            w.CreatedAt
        )).ToList());
    }

    /// <summary>
    /// Lightweight verdict for watchlist rows — same labels as the signal engine but computed
    /// from whatever data we have for the stock. Falls back gracefully for tickers without signals.
    /// </summary>
    private static string? ClassifyWatchlistVerdict(
        Stock stock, string? signalType, SignalBreakdown? bd, double? todayChangePct)
    {
        if (stock.NextEarningsDate.HasValue)
        {
            var days = (stock.NextEarningsDate.Value - DateTime.UtcNow).TotalDays;
            if (days is >= 0 and <= 14) return "Event-Driven";
        }
        if (bd is not null)
        {
            if (bd.FundamentalsScore >= 70 && bd.MomentumScore >= 70 && (todayChangePct ?? 0) < -0.5)
                return "Buy the Dip";
            if (bd.TrendScore >= 75 && bd.RelVolumeScore >= 75)
                return "Breakout Setup";
            if (bd.MomentumScore >= 80 && bd.TrendScore >= 65)
                return "Momentum Run";
            if (bd.FundamentalsScore >= 75 && bd.MomentumScore <= 55)
                return "Value Setup";
            if ((stock.Beta ?? 1.0) < 0.8 && bd.FundamentalsScore >= 65)
                return "Defensive Hold";
        }
        return signalType switch
        {
            "BUY_TODAY" => "Quality Setup",
            "WATCH" => "Watchlist",
            _ => null
        };
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
