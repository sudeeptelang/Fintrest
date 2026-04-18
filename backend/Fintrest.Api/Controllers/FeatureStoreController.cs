using Fintrest.Api.Services.Scoring.V3;
using Microsoft.AspNetCore.Mvc;

namespace Fintrest.Api.Controllers;

/// <summary>
/// Admin-only endpoints to manually trigger the v3 feature-population job
/// and inspect the run log. No public surface — intended for dev / QA spot-checks.
/// </summary>
[ApiController]
[Route("api/v1/admin/v3")]
public class FeatureStoreController(FeaturePopulationJob job, ILogger<FeatureStoreController> logger) : ControllerBase
{
    /// <summary>
    /// Run the feature population job for a given trade date. Omit the date to
    /// use today in US/Eastern. Returns the resulting run-log summary.
    /// </summary>
    [HttpPost("features/populate")]
    public async Task<IActionResult> Populate(
        [FromQuery] string? date,
        CancellationToken ct)
    {
        var tradeDate = string.IsNullOrWhiteSpace(date)
            ? DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time")))
            : DateOnly.Parse(date);

        try
        {
            var log = await job.RunOnceAsync(tradeDate, ct);
            return Ok(new
            {
                runId           = log.RunId,
                tradeDate       = log.TradeDate,
                startedAt       = log.StartedAt,
                endedAt         = log.EndedAt,
                universeSize    = log.UniverseSize,
                rowsWritten     = log.RowsWrittenJson,
                errorCount      = log.ErrorCountJson,
                sectorFallbacks = log.SectorFallbacks,
                status          = log.Status,
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                error = ex.Message,
                hint  = "If this persists after a backend restart, POST /api/v1/admin/v3/features/force-reset to clear the flag.",
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Manual feature populate failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Emergency reset of the running flag. Use only when a previous run got
    /// stuck in a way that blocks further attempts. Does NOT interrupt a
    /// genuinely-running job.
    /// </summary>
    [HttpPost("features/force-reset")]
    public IActionResult ForceReset()
    {
        job.ForceResetRunningFlag();
        return Ok(new { message = "running flag cleared" });
    }
}
