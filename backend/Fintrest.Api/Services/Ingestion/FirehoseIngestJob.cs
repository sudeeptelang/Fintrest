using System.Text.Json;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Providers.Contracts;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Ingestion;

/// <summary>
/// Nightly write-through cache for FMP firehoses. Fires at 6:15 AM ET Mon–Fri
/// — after FeaturePopulationJob (5:45) and before DailyCronJob (6:30). Pulls
/// the insider + senate + house firehoses in one shot and replaces the last
/// 10 days of rows per kind.
///
/// <para>
/// Why this exists: <c>/insiders</c> and <c>/congress</c> used to call FMP
/// live on every user request. One rate-limit blip or transient 429 → blank
/// page. After this job runs, the pages read from
/// <c>market_firehose_snapshot</c> and survive provider hiccups for at least
/// 24 hours.
/// </para>
/// </summary>
public class FirehoseIngestJob(
    IServiceScopeFactory scopeFactory,
    ILogger<FirehoseIngestJob> logger) : IHostedService, IDisposable
{
    private const string JobName = "FirehoseIngestJob";
    private const int TargetHourEt = 6;
    private const int TargetMinuteEt = 15;
    private Timer? _timer;
    private int _runningFlag;
    private static readonly TimeZoneInfo EasternZone = SafeEasternZone();

    public Task StartAsync(CancellationToken ct)
    {
        logger.LogInformation(
            "FirehoseIngestJob started. Checking every minute for {H}:{M:D2} AM ET trigger.",
            TargetHourEt, TargetMinuteEt);
        _timer = new Timer(Tick, null, TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(1));
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken ct)
    {
        _timer?.Change(Timeout.Infinite, 0);
        return Task.CompletedTask;
    }

    public void Dispose() => _timer?.Dispose();

    private void Tick(object? state)
    {
        if (Volatile.Read(ref _runningFlag) == 1) return;
        _ = TickAsync();
    }

    private async Task TickAsync()
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var jobState = scope.ServiceProvider.GetRequiredService<Fintrest.Api.Services.JobState.JobStateService>();
            if (!await jobState.ShouldRunAsync(JobName, TargetHourEt, TargetMinuteEt, weekdayOnly: true))
                return;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "FirehoseIngestJob: gating check failed; skipping tick");
            return;
        }

        await RunOnceAsync(CancellationToken.None);
    }

    /// <summary>Manual-trigger entry point — admin endpoint can call this.</summary>
    public async Task<FirehoseRunSummary> RunOnceAsync(CancellationToken ct)
    {
        if (Interlocked.CompareExchange(ref _runningFlag, 1, 0) == 1)
            throw new InvalidOperationException("FirehoseIngestJob already running");

        var sw = System.Diagnostics.Stopwatch.StartNew();
        var insiderCount = 0;
        var senateCount = 0;
        var houseCount = 0;
        string? error = null;

        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var fundamentals = scope.ServiceProvider.GetRequiredService<IFundamentalsProvider>();
            var jobState = scope.ServiceProvider.GetRequiredService<Fintrest.Api.Services.JobState.JobStateService>();

            // Fetch + write each kind independently so a single-provider
            // failure doesn't wipe the whole day's cache.
            insiderCount = await IngestInsidersAsync(db, fundamentals, ct);
            (senateCount, houseCount) = await IngestCongressAsync(db, fundamentals, ct);

            sw.Stop();
            logger.LogInformation(
                "FirehoseIngestJob complete in {Ms}ms: insider={Insider} senate={Senate} house={House}",
                sw.ElapsedMilliseconds, insiderCount, senateCount, houseCount);

            await jobState.MarkSuccessAsync(JobName, ct);
            return new FirehoseRunSummary(insiderCount, senateCount, houseCount, sw.ElapsedMilliseconds, null);
        }
        catch (Exception ex)
        {
            error = ex.Message;
            logger.LogError(ex, "FirehoseIngestJob failed");
            try
            {
                using var errScope = scopeFactory.CreateScope();
                var jobState = errScope.ServiceProvider.GetRequiredService<Fintrest.Api.Services.JobState.JobStateService>();
                await jobState.MarkErrorAsync(JobName, ex.Message, ct);
            }
            catch { /* best-effort */ }
            return new FirehoseRunSummary(insiderCount, senateCount, houseCount, sw.ElapsedMilliseconds, error);
        }
        finally
        {
            Interlocked.Exchange(ref _runningFlag, 0);
        }
    }

    private async Task<int> IngestInsidersAsync(AppDbContext db, IFundamentalsProvider fundamentals, CancellationToken ct)
    {
        var rows = await fundamentals.GetLatestInsiderTradesAsync(200, ct);
        if (rows.Count == 0)
        {
            logger.LogWarning("FirehoseIngestJob: insider firehose returned 0 rows — keeping prior snapshot");
            return 0;
        }

        // Clear last 10 days of insider rows; insert fresh. Older rows remain
        // as a longer-term audit trail even though the dashboard filters to
        // recent only.
        var cutoff = DateTime.UtcNow.AddDays(-10);
        var stale = await db.MarketFirehoseSnapshots
            .Where(s => s.Kind == "insider" && s.CapturedAt >= cutoff)
            .ToListAsync(ct);
        db.MarketFirehoseSnapshots.RemoveRange(stale);

        var now = DateTime.UtcNow;
        foreach (var r in rows)
        {
            db.MarketFirehoseSnapshots.Add(new MarketFirehoseSnapshot
            {
                Kind = "insider",
                Ticker = string.IsNullOrWhiteSpace(r.Ticker) ? null : r.Ticker,
                TransactionDate = r.TransactionDate.HasValue ? DateOnly.FromDateTime(r.TransactionDate.Value) : null,
                FilingDate = r.FilingDate.HasValue ? DateOnly.FromDateTime(r.FilingDate.Value) : null,
                ActorName = r.ReportingName,
                ActorRole = r.Relationship,
                TransactionType = r.TransactionType,
                Shares = r.SharesTraded,
                Price = r.Price,
                TotalValue = r.TotalValue,
                PayloadJson = JsonSerializer.Serialize(r),
                CapturedAt = now,
            });
        }
        await db.SaveChangesAsync(ct);
        return rows.Count;
    }

    private async Task<(int senate, int house)> IngestCongressAsync(AppDbContext db, IFundamentalsProvider fundamentals, CancellationToken ct)
    {
        var rows = await fundamentals.GetCongressTradesAsync(200, ct);
        if (rows.Count == 0)
        {
            logger.LogWarning("FirehoseIngestJob: congress firehose returned 0 rows — keeping prior snapshot");
            return (0, 0);
        }

        var cutoff = DateTime.UtcNow.AddDays(-10);
        var stale = await db.MarketFirehoseSnapshots
            .Where(s => (s.Kind == "senate" || s.Kind == "house") && s.CapturedAt >= cutoff)
            .ToListAsync(ct);
        db.MarketFirehoseSnapshots.RemoveRange(stale);

        var now = DateTime.UtcNow;
        int senate = 0, house = 0;
        foreach (var r in rows)
        {
            var kind = r.Chamber?.ToLowerInvariant() ?? "senate";
            if (kind == "senate") senate++; else house++;

            db.MarketFirehoseSnapshots.Add(new MarketFirehoseSnapshot
            {
                Kind = kind,
                Chamber = kind,
                Ticker = string.IsNullOrWhiteSpace(r.Ticker) ? null : r.Ticker,
                TransactionDate = r.TransactionDate.HasValue ? DateOnly.FromDateTime(r.TransactionDate.Value) : null,
                DisclosureDate = r.DisclosureDate.HasValue ? DateOnly.FromDateTime(r.DisclosureDate.Value) : null,
                ActorName = r.Representative,
                TransactionType = r.TransactionType,
                AmountRange = r.Amount,
                AssetDescription = r.AssetDescription,
                SourceUrl = r.SourceUrl,
                PayloadJson = JsonSerializer.Serialize(r),
                CapturedAt = now,
            });
        }
        await db.SaveChangesAsync(ct);
        return (senate, house);
    }

    private static TimeZoneInfo SafeEasternZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("America/New_York"); }
    }
}

public record FirehoseRunSummary(int InsiderRows, int SenateRows, int HouseRows, long DurationMs, string? Error);
