using Fintrest.Api.Data;
using Fintrest.Api.Services.Ingestion;
using Fintrest.Api.Services.Pipeline;
using Fintrest.Api.Services.Portfolio;
using Fintrest.Api.Services.Providers.Contracts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Controllers;

/// <summary>
/// Temporary seed controller for initial data setup.
/// TODO: Remove or protect behind environment check before production.
/// </summary>
[ApiController]
[Route("api/v1/seed")]
public class SeedController(AppDbContext db, DataIngestionService ingestion, ScanOrchestrator scanner, PortfolioImporter importer, PortfolioAiAdvisor advisor, ClaudeFinancialAdvisor claudeAdvisor, IFundamentalsProvider fundamentalsProvider) : ControllerBase
{
    private static readonly List<string> DefaultTickers =
    [
        "NVDA", "AAPL", "MSFT", "TSLA", "META", "AMZN",
        "GOOGL", "AMD", "JPM", "V", "NFLX", "COST"
    ];

    /// <summary>Add tickers and ingest initial data.</summary>
    [HttpPost("universe")]
    public async Task<IActionResult> SeedUniverse([FromBody] SeedRequest? request, CancellationToken ct)
    {
        var tickers = request?.Tickers ?? DefaultTickers;

        var added = await ingestion.SyncStockUniverseAsync(tickers, ct);

        return Ok(new { Added = added, Tickers = tickers });
    }

    /// <summary>Add a major-index constituent set (or market-cap band) to the universe.
    /// Supported keys:
    ///   sp500 (~503), nasdaq (~100), dowjones (~30),
    ///   midcap (~400–500, market cap $2B–$20B),
    ///   russell1k (~900–1100, market cap ≥ $2B).
    /// Idempotent — only inserts new tickers. Always also adds index ETF proxies (SPY/QQQ/DIA/IWM)
    /// so the /market/indices endpoint has data. Does NOT trigger ingestion — call /seed/ingest after.</summary>
    [HttpPost("preset/{key}")]
    public async Task<IActionResult> SeedPreset(string key, CancellationToken ct)
    {
        var indexTickers = await fundamentalsProvider.GetIndexConstituentsAsync(key, ct);
        if (indexTickers.Count == 0)
            return BadRequest(new { message = $"No tickers returned for preset '{key}'. Supported: sp500, nasdaq, dowjones, midcap, russell1k" });

        // Always include the index ETF proxies (for /market/indices) AND the
        // 11 SPDR sector ETFs (needed by sector-relative v3 features).
        var etfProxies = new[]
        {
            "SPY", "QQQ", "DIA", "IWM",
            "XLK", "XLF", "XLE", "XLV", "XLI", "XLY", "XLP", "XLRE", "XLU", "XLB", "XLC",
        };
        var fullList = indexTickers.Concat(etfProxies).Distinct().ToList();

        var added = await ingestion.SyncStockUniverseAsync(fullList, ct);

        return Ok(new
        {
            Preset = key,
            ConstituentsFromFmp = indexTickers.Count,
            EtfProxiesAdded = etfProxies.Length,
            TotalRequested = fullList.Count,
            NewlyAdded = added,
            NextStep = "Run POST /api/v1/seed/ingest to fetch market data + fundamentals for the new tickers (rate-limited, may take a while).",
        });
    }

    /// <summary>Ingest market data for all stocks.
    /// <paramref name="maxParallel"/> caps concurrent stock fetches (default 6).</summary>
    [HttpPost("ingest")]
    public async Task<IActionResult> SeedIngest([FromQuery] int maxParallel = 6, [FromQuery] bool backfill = false, CancellationToken ct = default)
    {
        var result = await ingestion.IngestAllAsync(maxParallel, ct, backfill);

        return Ok(new
        {
            result.StocksProcessed,
            result.BarsIngested,
            result.FundamentalsIngested,
            result.NewsIngested,
            result.Errors,
            result.DurationMs,
        });
    }

    /// <summary>
    /// Force a drift scan with synthetic SPY/VIX values — lets you verify regime-conditional
    /// weight flips + tilt shifts without waiting for real market movement.
    /// Query params (all optional): spyPct (default -2.0), vixLevel, vixPct.
    /// </summary>
    [HttpPost("scan/drift")]
    public async Task<IActionResult> SeedDriftScan(
        [FromQuery] double spyPct = -2.0,
        [FromQuery] double? vixLevel = null,
        [FromQuery] double? vixPct = null,
        CancellationToken ct = default)
    {
        var trigger = new DriftTrigger(spyPct, vixLevel, vixPct,
            $"forced (SPY {spyPct:+0.00;-0.00}%)");
        var result = await scanner.RunScanAsync("drift", trigger, ct);
        return Ok(new
        {
            Trigger = trigger,
            result.ScanRunId,
            result.SignalsGenerated,
            result.DurationMs,
            TopPicks = result.TopSignals.Take(6).Select(s => new
            {
                s.Ticker,
                Score = Math.Round(s.ScoreTotal, 1),
                s.SignalType,
            }),
        });
    }

    /// <summary>Run the scoring engine on all ingested data.</summary>
    [HttpPost("scan")]
    public async Task<IActionResult> SeedScan(CancellationToken ct)
    {
        var result = await scanner.RunScanAsync(ct);

        return Ok(new
        {
            result.ScanRunId,
            result.SignalsGenerated,
            result.DurationMs,
            TopPicks = result.TopSignals.Take(6).Select(s => new
            {
                s.Ticker,
                s.Name,
                Score = Math.Round(s.ScoreTotal, 1),
                s.SignalType,
                s.EntryLow,
                s.StopLoss,
                s.TargetHigh,
                Explanation = s.Explanation.Summary,
            }),
        });
    }

    /// <summary>Full pipeline: add tickers → ingest → score.</summary>
    [HttpPost("full")]
    public async Task<IActionResult> SeedFull([FromQuery] int maxParallel = 6, CancellationToken ct = default)
    {
        // Step 1: Add tickers
        var added = await ingestion.SyncStockUniverseAsync(DefaultTickers, ct);

        // Step 2: Ingest data
        var ingestResult = await ingestion.IngestAllAsync(maxParallel, ct);

        // Step 3: Score
        var scanResult = await scanner.RunScanAsync(ct);

        return Ok(new
        {
            StocksAdded = added,
            Ingestion = new
            {
                ingestResult.StocksProcessed,
                ingestResult.BarsIngested,
                ingestResult.FundamentalsIngested,
                ingestResult.NewsIngested,
                ingestResult.Errors,
            },
            Scan = new
            {
                scanResult.ScanRunId,
                scanResult.SignalsGenerated,
                scanResult.DurationMs,
                TopPicks = scanResult.TopSignals.Take(6).Select(s => new
                {
                    s.Ticker,
                    s.Name,
                    Score = Math.Round(s.ScoreTotal, 1),
                    s.SignalType,
                    s.EntryLow,
                    s.StopLoss,
                    s.TargetHigh,
                }),
            },
        });
    }

    /// <summary>Upload CSV and analyze (no auth required for dev).</summary>
    [HttpPost("portfolio/upload")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UploadPortfolio(
        IFormFile file,
        [FromQuery] string name = "Imported Portfolio",
        [FromQuery] double? cash = null,
        CancellationToken ct = default)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded" });

        using var stream = file.OpenReadStream();
        var importResult = await importer.ImportFromCsvAsync(3, name, stream, cash, ct); // Demo user id=3

        // Run AI analysis
        object? analysis = null;
        try
        {
            analysis = await advisor.AnalyzePortfolio(importResult.PortfolioId);
        }
        catch { /* best effort */ }

        return Ok(new { import_ = importResult, analysis });
    }

    /// <summary>Paste text and analyze (no auth required for dev).</summary>
    [HttpPost("portfolio/text")]
    public async Task<IActionResult> TextPortfolio(
        [FromBody] SeedPortfolioTextRequest request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Holdings))
            return BadRequest(new { message = "No holdings provided" });

        var importResult = await importer.ImportFromTextAsync(
            3, request.Name ?? "Imported Portfolio", request.Holdings, request.Cash, ct); // Demo user id=3

        object? analysis = null;
        try
        {
            analysis = await advisor.AnalyzePortfolio(importResult.PortfolioId);
        }
        catch { /* best effort */ }

        return Ok(new { import_ = importResult, analysis });
    }

    /// <summary>Run deep Claude AI analysis on a portfolio.</summary>
    [HttpGet("portfolio/{id}/ai-analysis")]
    public async Task<IActionResult> AiAnalysis(long id, CancellationToken ct)
    {
        var result = await claudeAdvisor.AnalyzePortfolioAsync(id, ct);
        return Ok(result);
    }

    /// <summary>Get portfolio holdings (no auth for dev).</summary>
    [HttpGet("portfolio/{id}/holdings")]
    public async Task<IActionResult> GetHoldings(long id)
    {
        var holdings = await db.PortfolioHoldings
            .Include(h => h.Stock)
            .Where(h => h.PortfolioId == id)
            .ToListAsync();

        // Get latest signal scores
        var result = new List<object>();
        foreach (var h in holdings)
        {
            var signal = await db.Signals
                .Where(s => s.StockId == h.StockId)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

            result.Add(new
            {
                h.Id, h.StockId,
                Ticker = h.Stock.Ticker,
                StockName = h.Stock.Name,
                h.Quantity, h.AvgCost, h.CurrentPrice, h.CurrentValue,
                h.UnrealizedPnl, h.UnrealizedPnlPct,
                SignalScore = signal?.ScoreTotal
            });
        }
        return Ok(result);
    }

    /// <summary>Get portfolio advisor (no auth for dev).</summary>
    [HttpGet("portfolio/{id}/advisor")]
    public async Task<IActionResult> GetAdvisor(long id)
    {
        var result = await advisor.AnalyzePortfolio(id);
        return Ok(result);
    }
}

public record SeedRequest(List<string>? Tickers);
public record SeedPortfolioTextRequest(string Holdings, string? Name = null, double? Cash = null);
