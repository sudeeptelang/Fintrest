using System.Security.Claims;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Ingestion;
using Fintrest.Api.Services.Pipeline;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/v1/admin")]
public class AdminController(AppDbContext db, ScanOrchestrator scanner, DataIngestionService ingestion) : ControllerBase
{
    private long AdminUserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("scan/run")]
    public async Task<IActionResult> TriggerScan(CancellationToken ct)
    {
        // Audit log
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "trigger_scan",
            EntityType = "scan_run",
        });
        await db.SaveChangesAsync(ct);

        // Run the full scoring pipeline
        var result = await scanner.RunScanAsync(ct);

        return Ok(new
        {
            result.ScanRunId,
            result.SignalsGenerated,
            result.DurationMs,
            TopPicks = result.TopSignals.Take(5).Select(s => new
            {
                s.Ticker,
                s.Name,
                Score = Math.Round(s.ScoreTotal, 1),
                s.SignalType,
                s.EntryLow,
                s.EntryHigh,
                s.StopLoss,
                s.TargetLow,
                s.TargetHigh,
                s.RiskRewardRatio,
                Explanation = s.Explanation.Summary,
            }),
        });
    }

    [HttpGet("scan-runs")]
    public async Task<IActionResult> ListScanRuns([FromQuery] int limit = 20)
    {
        var scans = await db.ScanRuns
            .OrderByDescending(s => s.StartedAt)
            .Take(limit)
            .Select(s => new
            {
                s.Id, s.RunType, s.MarketSession, s.StartedAt, s.CompletedAt, s.Status,
                s.UniverseSize, s.SignalsGenerated, s.StrategyVersion
            })
            .ToListAsync();

        return Ok(scans);
    }

    [HttpPost("signals/recompute/{signalId}")]
    public async Task<IActionResult> RecomputeSignal(long signalId, CancellationToken ct)
    {
        var signal = await db.Signals
            .Include(s => s.Stock)
            .FirstOrDefaultAsync(s => s.Id == signalId, ct);
        if (signal is null) return NotFound(new { message = "Signal not found" });

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "recompute_signal",
            EntityType = "signal",
            EntityId = signalId,
        });
        await db.SaveChangesAsync(ct);

        return Ok(new { SignalId = signalId, Status = "recompute_queued" });
    }

    /// <summary>
    /// Single-blob dashboard of nightly-job health. Answers "did today's scan
    /// run, when did the last briefing fire, is any upstream provider red,
    /// what should I be worried about?"
    ///
    /// The heavy lifting lives in <c>SystemHealthService</c> so the daily
    /// health email (<c>DailyHealthEmailJob</c>) produces the same view.
    /// </summary>
    [HttpGet("system-health")]
    public async Task<IActionResult> SystemHealth([FromServices] Fintrest.Api.Services.Health.SystemHealthService health, CancellationToken ct)
    {
        var report = await health.GatherAsync(ct);
        return Ok(report);
    }

    /// <summary>
    /// Fire the daily health email on demand — useful for verifying the
    /// template + recipient config without waiting for the 7:00 AM ET slot.
    /// </summary>
    /// <summary>
    /// Compute + persist Q/P/G sub-scores for today's as-of-date across the
    /// active universe. §14.1 — manual trigger until the nightly job lands.
    /// </summary>
    [HttpPost("fundamentals/subscores/recompute")]
    public async Task<IActionResult> RecomputeFundamentalSubscores(
        [FromServices] Fintrest.Api.Services.Scoring.FundamentalSubscoreService svc,
        CancellationToken ct)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "recompute_fundamental_subscores",
            EntityType = "fundamental_subscore",
        });
        await db.SaveChangesAsync(ct);

        var etNow = TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow,
            TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time"));
        var summary = await svc.ComputeAndStoreAsync(DateOnly.FromDateTime(etNow), ct);
        return Ok(summary);
    }

    /// <summary>
    /// Trigger an SEC EDGAR Form 4 ingest run. Without params defaults
    /// to the most recent trading day. Pass ?daysBack=5 to backfill the
    /// last 5 days (capped at 30). Idempotent — re-running the same day
    /// upserts against the composite unique index.
    /// </summary>
    [HttpPost("edgar/ingest")]
    public async Task<IActionResult> IngestEdgar(
        [FromServices] Fintrest.Api.Services.Providers.Edgar.EdgarIngestJob job,
        [FromQuery] int daysBack = 0,
        CancellationToken ct = default)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "ingest_edgar_form4",
            EntityType = "insider_transactions",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new { daysBack }),
        });
        await db.SaveChangesAsync(ct);

        daysBack = Math.Clamp(daysBack, 0, 30);
        var today = DateTime.UtcNow.Date;
        var dates = Enumerable.Range(0, daysBack + 1).Select(i => today.AddDays(-i)).ToArray();
        var summaries = await job.RunOnceAsync(dates, ct);
        return Ok(summaries);
    }

    /// <summary>
    /// Recompute insider scores across every ticker with activity in the
    /// last 30 days. Idempotent — rows for today's as_of_date are
    /// replaced. Run after an /admin/edgar/ingest to see fresh scores
    /// flow through the Smart Money sub-card.
    /// </summary>
    [HttpPost("insiders/score/recompute")]
    public async Task<IActionResult> RecomputeInsiderScores(
        [FromServices] Fintrest.Api.Services.Scoring.InsiderScoreJob job,
        CancellationToken ct)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "recompute_insider_scores",
            EntityType = "insider_scores",
        });
        await db.SaveChangesAsync(ct);

        var summary = await job.RunOnceAsync(ct);
        return Ok(summary);
    }

    /// <summary>
    /// Backfill / recompute the audit-log outcome table. Walks every open
    /// signal forward through market data and writes target_hit / stop_hit /
    /// horizon_expired rows into performance_tracking. Idempotent — already-
    /// closed signals are skipped. Safe to run any time for a catch-up.
    /// </summary>
    [HttpPost("audit-log/recompute-outcomes")]
    public async Task<IActionResult> RecomputeSignalOutcomes(
        [FromServices] Fintrest.Api.Services.Performance.SignalOutcomeJob job,
        CancellationToken ct)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "recompute_signal_outcomes",
            EntityType = "performance_tracking",
        });
        await db.SaveChangesAsync(ct);

        var summary = await job.RunOnceAsync(ct);
        return Ok(summary);
    }

    /// <summary>
    /// Manually fire one pass of the user-defined price/target/stop/volume
    /// alert evaluator. Useful during off-hours or for smoke-testing a new
    /// alert condition. Idempotent within a single tick: already-deactivated
    /// alerts are skipped.
    /// </summary>
    [HttpPost("alerts/evaluate")]
    public async Task<IActionResult> EvaluateAlerts(
        [FromServices] Fintrest.Api.Services.Email.AlertEvaluator evaluator,
        CancellationToken ct)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "evaluate_user_alerts",
            EntityType = "alerts",
        });
        await db.SaveChangesAsync(ct);

        var result = await evaluator.RunOnceAsync(ct);
        return Ok(result);
    }

    /// <summary>
    /// Manually set a user's plan. Admin support tool — the proper path
    /// for real subscriptions is Stripe webhooks reconciling automatically.
    /// This endpoint exists for (a) local QA testing across tiers, (b)
    /// manual correction when a webhook fires late or a user provides
    /// proof of purchase out-of-band. Always audited.
    /// </summary>
    [HttpPost("users/{email}/plan")]
    public async Task<IActionResult> SetUserPlan(
        string email,
        [FromBody] SetPlanRequest request,
        CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user is null) return NotFound(new { error = "User not found" });

        if (!Enum.TryParse<PlanType>(request.Plan, true, out var plan))
            return BadRequest(new { error = $"Plan must be one of: free, pro, elite. Got: {request.Plan}" });

        var previous = user.Plan;
        user.Plan = plan;
        user.UpdatedAt = DateTime.UtcNow;

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "set_user_plan",
            EntityType = "users",
            EntityId = user.Id,
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                previous = previous.ToString().ToLowerInvariant(),
                next = plan.ToString().ToLowerInvariant(),
            }),
        });

        await db.SaveChangesAsync(ct);
        return Ok(new { email = user.Email, plan = plan.ToString().ToLowerInvariant(), previous = previous.ToString().ToLowerInvariant() });
    }

    [HttpPost("system-health/send-email")]
    public async Task<IActionResult> SendHealthEmail([FromServices] Fintrest.Api.Services.Health.DailyHealthEmailJob job, CancellationToken ct)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "trigger_health_email",
            EntityType = "health",
        });
        await db.SaveChangesAsync(ct);

        var outcome = await job.SendOnceAsync(ct);
        return Ok(new { outcome });
    }

    [HttpGet("provider-health")]
    public async Task<IActionResult> ProviderHealth()
    {
        var records = await db.ProviderHealth
            .OrderByDescending(p => p.CheckedAt)
            .Take(20)
            .Select(p => new
            {
                p.Provider, p.Success, p.LatencyMs, p.CheckedAt
            })
            .ToListAsync();

        return Ok(new { Providers = records, CheckedAt = DateTime.UtcNow });
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> ListAuditLogs([FromQuery] int limit = 50)
    {
        var logs = await db.AdminAuditLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(limit)
            .Select(l => new
            {
                l.Id, l.ActorUserId, l.Action, l.EntityType,
                l.EntityId, l.MetadataJson, l.CreatedAt
            })
            .ToListAsync();

        return Ok(logs);
    }

    // --- Data Ingestion ---

    /// <summary>Run full data ingestion for all tracked stocks.
    /// <paramref name="maxParallel"/> caps how many stocks are ingested concurrently (default 6,
    /// raise on paid provider tiers, lower on free tiers).</summary>
    [HttpPost("ingest/run")]
    public async Task<IActionResult> TriggerIngestion([FromQuery] int maxParallel = 6, CancellationToken ct = default)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "trigger_ingestion",
        });
        await db.SaveChangesAsync(ct);

        var result = await ingestion.IngestAllAsync(maxParallel, ct);

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

    /// <summary>Backfill short interest for a list of tickers. Pulls the
    /// latest FMP short-interest snapshot per ticker and persists.
    /// Idempotent — re-runs refresh existing rows if FMP revised the
    /// settlement data. No cron wired yet; this is the manual trigger.</summary>
    [HttpPost("short-interest/ingest")]
    public async Task<IActionResult> IngestShortInterest(
        [FromBody] SyncUniverseRequest request,
        [FromServices] Fintrest.Api.Services.Scoring.ShortInterestService shortSvc,
        CancellationToken ct)
    {
        if (request?.Tickers is null || request.Tickers.Count == 0)
            return BadRequest(new { message = "Body { \"tickers\": [\"MU\",\"AMD\",...] } required" });

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "ingest_short_interest",
            EntityType = "short_interest_snapshots",
        });
        await db.SaveChangesAsync(ct);

        var results = new List<object>();
        foreach (var t in request.Tickers.Take(500))
        {
            var r = await shortSvc.FetchAndStoreAsync(t, ct);
            results.Add(new { r.Ticker, r.Persisted, r.ShortPctFloat, r.Note });
        }

        return Ok(new
        {
            requested = request.Tickers.Count,
            processed = results.Count,
            results,
        });
    }

    /// <summary>Last N scan runs — powers the admin Overview
    /// "Recent Scan Runs" table. Returns full timestamps so the UI
    /// can render datetime, not just a time-of-day.</summary>
    [HttpGet("scans/recent")]
    public async Task<IActionResult> RecentScans([FromQuery] int limit = 10, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 100);
        var rows = await db.ScanRuns
            .AsNoTracking()
            .OrderByDescending(s => s.StartedAt)
            .Take(limit)
            .Select(s => new
            {
                id = s.Id,
                startedAt = s.StartedAt,
                completedAt = s.CompletedAt,
                signalsGenerated = s.SignalsGenerated,
                status = s.Status,
                durationMs = s.CompletedAt.HasValue
                    ? (long?)(s.CompletedAt.Value - s.StartedAt).TotalMilliseconds
                    : null,
            })
            .ToListAsync(ct);

        return Ok(new { scans = rows });
    }

    /// <summary>Refresh the intraday live-quotes cache for the top-N
    /// active stocks. One FMP /quote call batched internally, ~5-15 sec
    /// wall-clock even at count=500. Auto-runs every 15 min during
    /// market hours; use this to force an immediate pull.</summary>
    [HttpPost("quotes/refresh")]
    public async Task<IActionResult> RefreshQuotes(
        [FromServices] Fintrest.Api.Services.Ingestion.LiveQuoteService svc,
        [FromQuery] int count = 500,
        CancellationToken ct = default)
    {
        count = Math.Clamp(count, 1, 2000);

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "refresh_live_quotes",
            EntityType = "live_quotes",
        });
        await db.SaveChangesAsync(ct);

        var summary = await svc.RefreshTopAsync(count, ct);
        return Ok(summary);
    }

    /// <summary>Fast-path bulk refresh for the top-N active stocks by
    /// market cap. Bars-only (skips fundamentals + news) so one call
    /// finishes in ~30–60s instead of the 5–10 minutes of
    /// /admin/ingest/run. Use this when Top Gainers is stale — the
    /// "INTC up 22% today isn't showing" class of ask.</summary>
    [HttpPost("ingest/top-caps")]
    public async Task<IActionResult> IngestTopCaps(
        [FromQuery] int count = 100,
        [FromQuery] int maxParallel = 8,
        CancellationToken ct = default)
    {
        count = Math.Clamp(count, 1, 1000);
        maxParallel = Math.Clamp(maxParallel, 1, 20);

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "ingest_top_caps",
            EntityType = "market_data",
        });
        await db.SaveChangesAsync(ct);

        var tickers = await db.Stocks
            .AsNoTracking()
            .Where(s => s.Active)
            .OrderByDescending(s => s.MarketCap ?? 0)
            .Select(s => s.Ticker)
            .Take(count)
            .ToListAsync(ct);

        var sw = System.Diagnostics.Stopwatch.StartNew();
        var results = new System.Collections.Concurrent.ConcurrentBag<(string Ticker, int Bars, string? Error)>();
        using var gate = new SemaphoreSlim(maxParallel);

        var tasks = tickers.Select(async t =>
        {
            await gate.WaitAsync(ct);
            try
            {
                var r = await ingestion.IngestStockAsync(t, ct, backfill: false, barsOnly: true);
                results.Add((t, r.Bars, null));
            }
            catch (Exception ex)
            {
                results.Add((t, 0, ex.Message));
            }
            finally
            {
                gate.Release();
            }
        });

        await Task.WhenAll(tasks);
        sw.Stop();

        return Ok(new
        {
            requested = tickers.Count,
            succeeded = results.Count(r => r.Error is null),
            failed = results.Count(r => r.Error is not null),
            totalBars = results.Sum(r => r.Bars),
            elapsedMs = sw.ElapsedMilliseconds,
            errors = results.Where(r => r.Error is not null).Take(10).Select(r => new { r.Ticker, r.Error }),
        });
    }

    /// <summary>Ingest data for a single stock (on-demand).</summary>
    [HttpPost("ingest/{ticker}")]
    public async Task<IActionResult> IngestStock(string ticker, CancellationToken ct)
    {
        await ingestion.IngestStockAsync(ticker, ct);
        return Ok(new { Ticker = ticker, Status = "ingested" });
    }

    /// <summary>Scan the universe for missing big-caps. Pulls FMP's
    /// large-cap screener (market cap >= minCap USD) and compares
    /// against our Stocks table. Returns missing tickers + stale-data
    /// stats so "why isn't MU / AMD / INTC in Top Gainers?" gets a
    /// data-backed answer without manual ticker lists.
    ///
    /// `minCap` defaults to 10B (typical "large cap" floor);
    /// 2000000000 (2B) catches the russell1k universe.</summary>
    [HttpGet("universe/scan-gaps")]
    public async Task<IActionResult> ScanUniverseGaps(
        [FromServices] Fintrest.Api.Services.Providers.Contracts.IFundamentalsProvider fmp,
        [FromQuery] long minCap = 10_000_000_000L,
        [FromQuery] int limit = 50,
        CancellationToken ct = default)
    {
        // Use the russell1k preset if minCap is >= 2B; russell2k for smaller.
        // The preset fetcher wraps FMP company-screener with the right filters.
        var presetKey = minCap >= 10_000_000_000L ? "sp500" : minCap >= 2_000_000_000L ? "russell1k" : "russell2k";
        var fmpTickers = await fmp.GetIndexConstituentsAsync(presetKey, ct);

        if (fmpTickers.Count == 0)
            return Ok(new { message = $"FMP returned no tickers for preset '{presetKey}' — try a different minCap", inDb = 0, missing = Array.Empty<object>() });

        // What we have in DB that intersects with the FMP list.
        var fmpSet = fmpTickers.Select(t => t.ToUpperInvariant()).ToHashSet();
        var haveRows = await db.Stocks
            .Where(s => fmpSet.Contains(s.Ticker))
            .Select(s => new { s.Id, s.Ticker, s.Name, s.MarketCap, s.Active })
            .ToListAsync(ct);
        var haveSet = haveRows.Select(r => r.Ticker).ToHashSet();

        // Tickers present on FMP but missing from DB.
        var missingTickers = fmpSet.Except(haveSet).ToList();

        // Stale check: for tickers we DO have, what's their newest bar date?
        var haveIds = haveRows.Select(r => r.Id).ToList();
        var cutoff = DateTime.UtcNow.AddDays(-7);
        var recent = await db.MarketData
            .Where(m => haveIds.Contains(m.StockId) && m.Ts >= cutoff)
            .Select(m => new { m.StockId, m.Ts })
            .ToListAsync(ct);
        var latestByStock = recent
            .GroupBy(m => m.StockId)
            .ToDictionary(g => g.Key, g => g.Max(x => x.Ts));

        var staleTickers = haveRows
            .Where(r => !latestByStock.TryGetValue(r.Id, out var t) || t < DateTime.UtcNow.AddDays(-3))
            .OrderByDescending(r => r.MarketCap ?? 0)
            .Take(limit)
            .Select(r => new
            {
                r.Ticker,
                r.Name,
                r.MarketCap,
                r.Active,
                lastBarAt = latestByStock.TryGetValue(r.Id, out var ts) ? ts : (DateTime?)null,
                note = !r.Active ? "inactive"
                    : !latestByStock.ContainsKey(r.Id) ? "no bars in last 7 days — run /admin/ingest/{ticker}"
                    : "last bar > 3 days old — re-ingest",
            })
            .ToList();

        return Ok(new
        {
            presetUsed = presetKey,
            fmpCount = fmpTickers.Count,
            inDbCount = haveRows.Count,
            missingCount = missingTickers.Count,
            staleCount = staleTickers.Count,
            missing = missingTickers.Take(limit).Select(t => new { ticker = t, note = "not in Stocks table — run /seed/preset/" + presetKey }),
            stale = staleTickers,
        });
    }

    /// <summary>Diagnose universe + data-freshness for a list of tickers.
    /// Pass ?tickers=MU,AMD,INTC to see for each: presence in the Stocks
    /// table, last-bar timestamp, latest close, and %change vs. previous
    /// close. Lets you confirm whether a "missing" ticker is actually
    /// absent from the universe or just stale / null-changePct.</summary>
    [HttpGet("universe/check")]
    public async Task<IActionResult> CheckUniverse([FromQuery] string tickers, CancellationToken ct)
    {
        var requested = (tickers ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(t => t.ToUpperInvariant())
            .Distinct()
            .ToList();

        if (requested.Count == 0)
            return BadRequest(new { message = "Pass ?tickers=MU,AMD,INTC" });

        var stocks = await db.Stocks
            .Where(s => requested.Contains(s.Ticker))
            .Select(s => new { s.Id, s.Ticker, s.Name, s.MarketCap, s.Active })
            .ToListAsync(ct);

        var stockIds = stocks.Select(s => s.Id).ToList();
        var cutoff = DateTime.UtcNow.AddDays(-30);
        var recentBars = await db.MarketData
            .Where(m => stockIds.Contains(m.StockId) && m.Ts >= cutoff)
            .Select(m => new { m.StockId, m.Ts, m.Close })
            .ToListAsync(ct);

        var lastTwoByStock = recentBars
            .GroupBy(m => m.StockId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(m => m.Ts).Take(2).ToList());

        var result = requested.Select(t =>
        {
            var stock = stocks.FirstOrDefault(s => s.Ticker == t);
            if (stock is null)
                return new { ticker = t, inUniverse = false, active = false, marketCap = (double?)null, lastBarAt = (DateTime?)null, latestClose = (double?)null, prevClose = (double?)null, changePct = (double?)null, barCount30d = 0, note = "not in Stocks table — run /seed/preset/sp500 or similar" };

            var bars = lastTwoByStock.GetValueOrDefault(stock.Id) ?? new();
            var latest = bars.FirstOrDefault();
            var prev = bars.Skip(1).FirstOrDefault();
            double? chg = latest is not null && prev is not null && prev.Close > 0
                ? Math.Round((latest.Close - prev.Close) / prev.Close * 100, 2)
                : null;

            return new
            {
                ticker = t,
                inUniverse = true,
                active = stock.Active,
                marketCap = stock.MarketCap,
                lastBarAt = latest?.Ts,
                latestClose = latest?.Close,
                prevClose = prev?.Close,
                changePct = chg,
                barCount30d = bars.Count,
                note = stock.Active == false ? "inactive — set active=true or re-seed"
                    : latest is null ? "no bars in last 30d — run /admin/ingest/{ticker}"
                    : bars.Count < 2 ? "only 1 bar — need 2 to compute changePct"
                    : chg is null ? "changePct is null (prev close is 0/null)"
                    : "ok",
            };
        }).ToList();

        return Ok(new { asOf = DateTime.UtcNow, tickers = result });
    }

    /// <summary>Add tickers to the stock universe.</summary>
    [HttpPost("universe/sync")]
    public async Task<IActionResult> SyncUniverse([FromBody] SyncUniverseRequest request, CancellationToken ct)
    {
        var added = await ingestion.SyncStockUniverseAsync(request.Tickers, ct);
        return Ok(new { Added = added, Total = request.Tickers.Count });
    }

    /// <summary>Run full pipeline: ingest → score → generate signals.</summary>
    [HttpPost("pipeline/run")]
    public async Task<IActionResult> RunFullPipeline([FromQuery] int maxParallel = 6, CancellationToken ct = default)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            ActorUserId = AdminUserId,
            Action = "run_full_pipeline",
        });
        await db.SaveChangesAsync(ct);

        // Step 1: Ingest latest data
        var ingestionResult = await ingestion.IngestAllAsync(maxParallel, ct);

        // Step 2: Run scoring engine
        var scanResult = await scanner.RunScanAsync(ct);

        return Ok(new
        {
            Ingestion = new
            {
                ingestionResult.StocksProcessed,
                ingestionResult.BarsIngested,
                ingestionResult.NewsIngested,
                ingestionResult.DurationMs,
            },
            Scan = new
            {
                scanResult.ScanRunId,
                scanResult.SignalsGenerated,
                scanResult.DurationMs,
                TopPicks = scanResult.TopSignals.Take(5).Select(s => new
                {
                    s.Ticker, s.Name,
                    Score = Math.Round(s.ScoreTotal, 1),
                    s.SignalType,
                    s.EntryLow, s.EntryHigh, s.StopLoss,
                    s.TargetLow, s.TargetHigh,
                }),
            },
        });
    }
}

public record SyncUniverseRequest(List<string> Tickers);

public record SetPlanRequest(string Plan);
