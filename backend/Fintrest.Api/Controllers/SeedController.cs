using Fintrest.Api.Services.Ingestion;
using Fintrest.Api.Services.Pipeline;
using Microsoft.AspNetCore.Mvc;

namespace Fintrest.Api.Controllers;

/// <summary>
/// Temporary seed controller for initial data setup.
/// TODO: Remove or protect behind environment check before production.
/// </summary>
[ApiController]
[Route("api/v1/seed")]
public class SeedController(DataIngestionService ingestion, ScanOrchestrator scanner) : ControllerBase
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

    /// <summary>Ingest market data for all stocks.</summary>
    [HttpPost("ingest")]
    public async Task<IActionResult> SeedIngest(CancellationToken ct)
    {
        var result = await ingestion.IngestAllAsync(ct);

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
    public async Task<IActionResult> SeedFull(CancellationToken ct)
    {
        // Step 1: Add tickers
        var added = await ingestion.SyncStockUniverseAsync(DefaultTickers, ct);

        // Step 2: Ingest data
        var ingestResult = await ingestion.IngestAllAsync(ct);

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
}

public record SeedRequest(List<string>? Tickers);
