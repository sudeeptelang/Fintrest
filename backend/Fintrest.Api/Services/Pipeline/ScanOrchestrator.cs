using System.Diagnostics;
using System.Text.Json;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Scoring;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Pipeline;

/// <summary>
/// Orchestrates a full scan: loads data → scores each stock → persists signals.
/// This is the main entry point for the daily scan job.
/// </summary>
public class ScanOrchestrator(AppDbContext db, ILogger<ScanOrchestrator> logger)
{
    public async Task<ScanResult> RunScanAsync(CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();

        // 1. Load all active stocks (for universe size)
        var stocks = await db.Stocks
            .Where(s => s.Active)
            .ToListAsync(ct);

        // 2. Create scan run record
        var scanRun = new ScanRun
        {
            Status = "RUNNING",
            StrategyVersion = "v1.0",
            RunType = "daily",
            MarketSession = "pre_market",
            UniverseSize = stocks.Count,
        };
        db.ScanRuns.Add(scanRun);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Scan {ScanId} started", scanRun.Id);

        try
        {
            logger.LogInformation("Loaded {Count} active stocks", stocks.Count);

            var scoredSignals = new List<ScoredSignal>();

            // 3. Score each stock
            foreach (var stock in stocks)
            {
                try
                {
                    var snapshot = await BuildSnapshot(stock, ct);
                    if (snapshot is null) continue; // Not enough data

                    var scored = StockScorer.Score(snapshot);
                    scoredSignals.Add(scored);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to score {Ticker}", stock.Ticker);
                }
            }

            // 4. Rank by total score descending
            scoredSignals = scoredSignals
                .OrderByDescending(s => s.ScoreTotal)
                .ToList();

            logger.LogInformation("Scored {Count} stocks, top: {Top}",
                scoredSignals.Count,
                scoredSignals.FirstOrDefault()?.Ticker ?? "none");

            // 5. Persist signals + breakdowns
            foreach (var scored in scoredSignals)
            {
                var signal = new Signal
                {
                    StockId = scored.StockId,
                    ScanRunId = scanRun.Id,
                    SignalType = Enum.Parse<SignalType>(scored.SignalType),
                    ScoreTotal = scored.ScoreTotal,
                    StrategyVersion = "v1.0",
                    EntryLow = scored.EntryLow,
                    EntryHigh = scored.EntryHigh,
                    StopLoss = scored.StopLoss,
                    TargetLow = scored.TargetLow,
                    TargetHigh = scored.TargetHigh,
                    RiskLevel = scored.RiskLevel,
                    HorizonDays = scored.HorizonDays,
                    Status = "ACTIVE",
                };
                db.Signals.Add(signal);
                await db.SaveChangesAsync(ct); // Flush to get signal.Id

                var breakdown = new SignalBreakdown
                {
                    SignalId = signal.Id,
                    MomentumScore = scored.Breakdown.Momentum,
                    RelVolumeScore = scored.Breakdown.Volume,
                    NewsScore = scored.Breakdown.Catalyst,
                    FundamentalsScore = scored.Breakdown.Fundamental,
                    SentimentScore = scored.Breakdown.Sentiment,
                    TrendScore = scored.Breakdown.Trend,
                    RiskScore = scored.Breakdown.Risk,
                    ExplanationJson = JsonSerializer.Serialize(scored.Explanation),
                    WhyNowSummary = scored.Explanation.Summary,
                };
                db.SignalBreakdowns.Add(breakdown);

                // Event sourcing: record signal creation
                db.SignalEvents.Add(new SignalEvent
                {
                    SignalId = signal.Id,
                    EventType = "signal_created",
                    PayloadJson = JsonSerializer.Serialize(new
                    {
                        scored.ScoreTotal,
                        scored.SignalType,
                        scored.Ticker,
                    }),
                });
            }

            // 6. Finalize scan run
            sw.Stop();
            scanRun.Status = "COMPLETED";
            scanRun.SignalsGenerated = scoredSignals.Count;
            scanRun.CompletedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);

            logger.LogInformation(
                "Scan {ScanId} completed: {Count} signals in {Ms}ms",
                scanRun.Id, scoredSignals.Count, sw.ElapsedMilliseconds);

            return new ScanResult
            {
                ScanRunId = scanRun.Id,
                SignalsGenerated = scoredSignals.Count,
                DurationMs = (int)sw.ElapsedMilliseconds,
                TopSignals = scoredSignals.Take(12).ToList(),
            };
        }
        catch (Exception ex)
        {
            sw.Stop();
            scanRun.Status = "FAILED";
            scanRun.CompletedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(CancellationToken.None);

            logger.LogError(ex, "Scan {ScanId} failed", scanRun.Id);
            throw;
        }
    }

    /// <summary>
    /// Build a StockSnapshot from database data for a single stock.
    /// Returns null if insufficient price history.
    /// </summary>
    private async Task<StockSnapshot?> BuildSnapshot(Stock stock, CancellationToken ct)
    {
        // Load last 250 trading days of market data
        var marketData = (await db.MarketData
            .Where(m => m.StockId == stock.Id)
            .OrderByDescending(m => m.Ts)
            .Take(250)
            .Select(m => new { m.Ts, m.Open, m.High, m.Low, m.Close, m.Volume })
            .ToListAsync(ct))
            .OrderBy(m => m.Ts)
            .ToList();

        if (marketData.Count < 30) return null; // Need at least 30 days

        // Load latest fundamentals
        var fundamental = await db.Fundamentals
            .Where(f => f.StockId == stock.Id)
            .OrderByDescending(f => f.ReportDate)
            .FirstOrDefaultAsync(ct);

        // Load recent news sentiment (last 7 days)
        var recentDate = DateTime.UtcNow.AddDays(-7);
        var newsItems = await db.NewsItems
            .Where(n => n.StockId == stock.Id && n.PublishedAt >= recentDate)
            .ToListAsync(ct);

        var avgSentiment = newsItems.Count > 0
            ? newsItems.Where(n => n.SentimentScore.HasValue).Average(n => n.SentimentScore!.Value)
            : (double?)null;

        var hasCatalyst = newsItems.Any(n => n.CatalystType != null);
        var catalystType = newsItems
            .Where(n => n.CatalystType != null)
            .OrderByDescending(n => n.PublishedAt)
            .Select(n => n.CatalystType)
            .FirstOrDefault();

        var lastBar = marketData[^1];

        return new StockSnapshot
        {
            StockId = stock.Id,
            Ticker = stock.Ticker,
            Name = stock.Name,
            Sector = stock.Sector,
            Price = lastBar.Close,
            Volume = lastBar.Volume,
            ClosePrices = marketData.Select(m => m.Close).ToList(),
            HighPrices = marketData.Select(m => m.High).ToList(),
            LowPrices = marketData.Select(m => m.Low).ToList(),
            VolumeSeries = marketData.Select(m => m.Volume).ToList(),
            RevenueGrowth = fundamental?.RevenueGrowth,
            EpsGrowth = fundamental?.EpsGrowth,
            GrossMargin = fundamental?.GrossMargin,
            NetMargin = fundamental?.NetMargin,
            PeRatio = fundamental?.PeRatio,
            NewsSentiment = avgSentiment,
            HasCatalyst = hasCatalyst,
            CatalystType = catalystType,
            FloatShares = stock.FloatShares,
            MarketCap = stock.MarketCap,
        };
    }
}

public record ScanResult
{
    public long ScanRunId { get; init; }
    public int SignalsGenerated { get; init; }
    public int DurationMs { get; init; }
    public List<ScoredSignal> TopSignals { get; init; } = [];
}
