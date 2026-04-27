using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Providers.Contracts;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Ingestion;

/// <summary>
/// Intraday live-quote cache. Pulls FMP /quote in batches, upserts
/// into live_quotes. The screener overlays live_quotes onto its EOD
/// bars so users see today's price + changePct in real time instead
/// of yesterday's close.
/// </summary>
public class LiveQuoteService(
    AppDbContext db,
    IFundamentalsProvider fmp,
    ILogger<LiveQuoteService> logger)
{
    public record RunSummary(int Requested, int Fetched, int Persisted, long ElapsedMs);

    /// <summary>Fetch + persist for an explicit ticker list. Idempotent —
    /// existing rows are updated in place.</summary>
    public async Task<RunSummary> RefreshAsync(IReadOnlyList<string> tickers, CancellationToken ct = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        if (tickers.Count == 0)
            return new RunSummary(0, 0, 0, 0);

        var normalized = tickers
            .Select(t => t.Trim().ToUpperInvariant())
            .Where(t => t.Length > 0)
            .Distinct()
            .ToList();

        var quotes = await fmp.GetQuotesAsync(normalized, ct);
        if (quotes.Count == 0)
        {
            sw.Stop();
            return new RunSummary(normalized.Count, 0, 0, sw.ElapsedMilliseconds);
        }

        // Load existing rows for this batch so we can update in place
        // (avoids churning the table with delete-insert patterns).
        var tickersInQuotes = quotes.Select(q => q.Ticker).ToList();
        var existing = await db.LiveQuotes
            .Where(l => tickersInQuotes.Contains(l.Ticker))
            .ToListAsync(ct);
        var existingByTicker = existing.ToDictionary(e => e.Ticker);

        int persisted = 0;
        var nowUtc = DateTime.UtcNow;
        foreach (var q in quotes)
        {
            if (!existingByTicker.TryGetValue(q.Ticker, out var row))
            {
                row = new LiveQuote { Ticker = q.Ticker };
                db.LiveQuotes.Add(row);
            }
            row.Price = q.Price;
            row.PreviousClose = q.PreviousClose;
            row.ChangeValue = q.Change;
            row.ChangePct = q.ChangePct;
            row.DayHigh = q.DayHigh;
            row.DayLow = q.DayLow;
            row.Open = q.Open;
            row.YearHigh = q.YearHigh;
            row.YearLow = q.YearLow;
            row.PriceAvg50 = q.PriceAvg50;
            row.PriceAvg200 = q.PriceAvg200;
            row.MarketCap = q.MarketCap;
            row.Volume = q.Volume;
            row.AsOf = q.AsOf ?? nowUtc;
            row.UpdatedAt = nowUtc;
            persisted++;
        }

        await db.SaveChangesAsync(ct);
        sw.Stop();

        logger.LogInformation(
            "LiveQuoteService: {Requested} requested, {Fetched} fetched from FMP, {Persisted} persisted in {Ms}ms",
            normalized.Count, quotes.Count, persisted, sw.ElapsedMilliseconds);

        return new RunSummary(normalized.Count, quotes.Count, persisted, sw.ElapsedMilliseconds);
    }

    /// <summary>Refresh the top-N active stocks by market cap — the
    /// default cron cadence. Bars-only refresh parallel; this is one
    /// bulk FMP call batched internally (vs. per-ticker in
    /// BarsRefreshJob).</summary>
    public async Task<RunSummary> RefreshTopAsync(int count = 500, CancellationToken ct = default)
    {
        var tickers = await db.Stocks
            .AsNoTracking()
            .Where(s => s.Active)
            .OrderByDescending(s => s.MarketCap ?? 0)
            .Select(s => s.Ticker)
            .Take(count)
            .ToListAsync(ct);
        return await RefreshAsync(tickers, ct);
    }
}
