using System.Diagnostics;
using System.Text.Json;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Scoring;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

using RegimeModel = Fintrest.Api.Services.Scoring.MarketRegime;

namespace Fintrest.Api.Services.Pipeline;

/// <summary>
/// Orchestrates a full scan: loads data → scores each stock → persists signals.
/// This is the main entry point for the daily scan job.
/// </summary>
public class ScanOrchestrator(
    AppDbContext db,
    ILogger<ScanOrchestrator> logger,
    IOptions<ScoringOptions> scoringOptions,
    AthenaThesisService thesisService)
{
    private readonly ScoringOptions _options = scoringOptions.Value;
    /// <summary>How many top signals get an AI thesis generated per scan.</summary>
    private const int ThesisTopN = 10;

    public async Task<ScanResult> RunScanAsync(CancellationToken ct = default)
        => await RunScanAsync(runType: "daily", liveTrigger: null, ct: ct);

    /// <summary>
    /// Run a scoring scan. <paramref name="liveTrigger"/> comes from the intraday drift watcher
    /// and overrides the SPY/VIX values in the computed MarketRegime so the tilt + regime-conditional
    /// weights reflect *now* rather than the stale daily bars in the DB.
    /// </summary>
    public async Task<ScanResult> RunScanAsync(
        string runType,
        DriftTrigger? liveTrigger,
        CancellationToken ct = default)
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
            RunType = runType,
            MarketSession = liveTrigger is not null ? "intraday" : "pre_market",
            UniverseSize = stocks.Count,
        };
        db.ScanRuns.Add(scanRun);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Scan {ScanId} started (type={Type})", scanRun.Id, runType);

        try
        {
            // Compute market regime once for all stocks
            await ComputeMarketRegime(ct);
            if (liveTrigger is not null)
            {
                _regime = _regime with
                {
                    SpyReturn1d = liveTrigger.SpyChangePct,
                    VixLevel = liveTrigger.VixLevel ?? _regime.VixLevel,
                    VixChange1d = liveTrigger.VixChangePct ?? _regime.VixChange1d,
                };
                logger.LogInformation(
                    "Drift override: SPY 1d={Spy:F2}% VIX={Vix} VIXΔ={VixChg}",
                    _regime.SpyReturn1d,
                    _regime.VixLevel?.ToString("F1") ?? "n/a",
                    _regime.VixChange1d?.ToString("F2") ?? "n/a");
            }

            logger.LogInformation("Loaded {Count} active stocks", stocks.Count);

            // ─────────────────────────────────────────────────────────────
            // PASS 1 — Compute raw factor scores for every stock (no Total yet).
            // ─────────────────────────────────────────────────────────────
            var pending = new List<(StockSnapshot Snap, StockScorer.FactorResult Raw)>(stocks.Count);
            foreach (var stock in stocks)
            {
                try
                {
                    var snapshot = await BuildSnapshot(stock, ct);
                    if (snapshot is null) continue;
                    var raw = StockScorer.ScoreFactors(snapshot);
                    pending.Add((snapshot, raw));
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to score {Ticker}", stock.Ticker);
                }
            }

            // §14.1 — Override the Fundamental factor with the sector-normalized
            // Q/P/G blend from fundamental_subscore (populated nightly by
            // FundamentalSubscoreJob). Falls back to the inline StockScorer output
            // when no subscore row exists for a ticker — so the scan still works
            // on a fresh install before the job has ever run.
            var todayEt = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time")));
            var subScoreLookup = await db.FundamentalSubscores
                .AsNoTracking()
                .Where(f => f.AsOfDate == todayEt)
                .Select(f => new
                {
                    f.Ticker,
                    f.QualityScore,
                    f.ProfitabilityScore,
                    f.GrowthScore,
                })
                .ToDictionaryAsync(f => f.Ticker, ct);

            if (subScoreLookup.Count > 0)
            {
                int blended = 0;
                for (int i = 0; i < pending.Count; i++)
                {
                    var (snap, raw) = pending[i];
                    if (!subScoreLookup.TryGetValue(snap.Ticker, out var sub)) continue;

                    var blendedFundamental = BlendQpg(
                        sub.QualityScore, sub.ProfitabilityScore, sub.GrowthScore);
                    if (blendedFundamental is null) continue;

                    var newBreakdown = raw.Breakdown with { Fundamental = blendedFundamental.Value };
                    var newRaw = raw with { Breakdown = newBreakdown };
                    pending[i] = (snap, newRaw);
                    blended++;
                }
                logger.LogInformation(
                    "Blended Q/P/G subscores into Fundamental factor for {N} of {Total} pending stocks",
                    blended, pending.Count);
            }
            else
            {
                logger.LogInformation(
                    "No fundamental_subscore rows for {Date} — keeping inline Fundamental score",
                    todayEt);
            }

            // ─────────────────────────────────────────────────────────────
            // PASS 1.5 — Smart Money family rollup.
            // Bulk-load the 5 sub-signals (Insider 35% / Institutional 25% /
            // Short 15% / Congress 15% / Options 10%) and compute the family
            // composite per ticker. Sub-signals with no data fall back to
            // 50 (neutral) so partial coverage doesn't crater the score.
            // Pass B currently wires Insider + Short — Institutional /
            // Congress / Options remain neutral until their bulk feeds ship.
            // ─────────────────────────────────────────────────────────────
            // Track which tickers have ANY real smart-money sub-signal so the
            // composite formula can re-normalize for tickers without data
            // (otherwise neutral-50 SmartMoney compresses the no-data majority
            // ~10 points). Filled inside the rollup block below; consumed in
            // Pass 3 Finalize.
            var hasSmartMoneyData = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            try
            {
                var pendingTickers = pending.Select(p => p.Snap.Ticker).Distinct().ToList();
                // EF Core's GroupBy().Select(g => g.OrderByDescending(...).First()) does
                // NOT translate to PG SQL and throws "EmptyProjectionMember not present"
                // — same gotcha as GetFundamentalSubscoresAsync. Fetch flat then group
                // in-memory.
                var insiderRowsRaw = await db.InsiderScores
                    .AsNoTracking()
                    .Where(i => pendingTickers.Contains(i.Ticker))
                    .Select(i => new { i.Ticker, i.AsOfDate, Score = (double)i.Score })
                    .ToListAsync(ct);
                var insiderLatest = insiderRowsRaw
                    .GroupBy(r => r.Ticker)
                    .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.AsOfDate).First().Score);

                var shortRowsRaw = await db.ShortInterestSnapshots
                    .AsNoTracking()
                    .Where(s => pendingTickers.Contains(s.Ticker))
                    .Select(s => new { s.Ticker, s.SettlementDate, Pct = s.ShortPctFloat })
                    .ToListAsync(ct);
                var shortLatest = shortRowsRaw
                    .GroupBy(r => r.Ticker)
                    .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.SettlementDate).First().Pct);

                foreach (var t in insiderLatest.Keys) hasSmartMoneyData.Add(t);
                foreach (var t in shortLatest.Keys) hasSmartMoneyData.Add(t);

                // Short interest → 0-100 score. Lower short = better smart-money
                // signal (institutions aren't betting against it). Linear ramp:
                // 0% → 100, 10% → 50, 20% → 0. Clamps outside that band.
                static double ShortPctToScore(decimal? shortPct)
                {
                    if (!shortPct.HasValue) return 50.0;
                    return Math.Clamp(100.0 - (double)shortPct.Value * 5.0, 0.0, 100.0);
                }

                int hydrated = 0;
                for (int i = 0; i < pending.Count; i++)
                {
                    var (snap, raw) = pending[i];
                    var insider = insiderLatest.TryGetValue(snap.Ticker, out var ins) ? ins : 50.0;
                    var shortScore = shortLatest.TryGetValue(snap.Ticker, out var sp) ? ShortPctToScore(sp) : 50.0;
                    // Institutional / Congress / Options stay neutral 50 until
                    // their bulk feeds are wired. Weights as configured: 35/25/15/15/10.
                    var smartMoney =
                        insider    * 0.35 +
                        50.0       * 0.25 +  // Institutional
                        shortScore * 0.15 +
                        50.0       * 0.15 +  // Congressional
                        50.0       * 0.10;   // Options
                    if (insiderLatest.ContainsKey(snap.Ticker) || shortLatest.ContainsKey(snap.Ticker))
                        hydrated++;

                    var newBreakdown = raw.Breakdown with { SmartMoney = smartMoney };
                    pending[i] = (snap, raw with { Breakdown = newBreakdown });
                }
                logger.LogInformation(
                    "Smart Money rollup: {Hyd} of {Total} tickers had insider/short data ({Ins} insider, {Sht} short)",
                    hydrated, pending.Count, insiderLatest.Count, shortLatest.Count);
            }
            catch (Npgsql.PostgresException pex) when (pex.SqlState == "42P01")
            {
                logger.LogWarning(
                    "Smart Money rollup skipped — insider_scores or short_interest_snapshots missing (migration 024/025 pending). All tickers stay at neutral 50.");
            }

            // ─────────────────────────────────────────────────────────────
            // PASS 2 — Cross-sectional percentile ranking across universe.
            // Converts each factor score from "raw table output" to "your stock's
            // percentile within today's universe on this factor" (0-100).
            //
            // Magnitude blend: before ranking, amplify each stock's raw
            // Momentum + Volume by a log(market-cap) factor so a $295B
            // INTC moving 2% outranks a $5B small-cap moving 8% in
            // dollar-impact terms. Without this, mega-cap rallies got
            // buried in the percentile contest and never crossed the
            // BUY/WATCH threshold even when billions were created.
            // The bonus tops out at +50% so it nudges, doesn't dominate.
            // ─────────────────────────────────────────────────────────────
            static double McapMomentumBlend(ScoringEngineV2.ScoreBreakdown b, double? mcap)
            {
                if (!mcap.HasValue || mcap.Value <= 0) return b.Momentum;
                // log10(mcap / 1B) — gives 0 at $1B, 1 at $10B, 2 at $100B,
                // 3 at $1T. Half-weight, capped at 0.5.
                var mcapLog = Math.Log10(mcap.Value / 1e9 + 1);
                var bonus = Math.Clamp((mcapLog - 1) * 0.25, 0, 0.5);
                return b.Momentum * (1 + bonus);
            }
            static double McapVolumeBlend(ScoringEngineV2.ScoreBreakdown b, double? mcap)
            {
                if (!mcap.HasValue || mcap.Value <= 0) return b.Volume;
                var mcapLog = Math.Log10(mcap.Value / 1e9 + 1);
                var bonus = Math.Clamp((mcapLog - 1) * 0.20, 0, 0.4);
                return b.Volume * (1 + bonus);
            }

            ScoringEngineV2.ScoreBreakdown[] ranked;
            if (_options.UsePercentileRanking && pending.Count >= _options.MinUniverseForRanking)
            {
                var blended = pending.Select(p =>
                    p.Raw.Breakdown with
                    {
                        Momentum = McapMomentumBlend(p.Raw.Breakdown, p.Snap.MarketCap),
                        Volume = McapVolumeBlend(p.Raw.Breakdown, p.Snap.MarketCap),
                    }).ToList();
                ranked = PercentileRanker.RankBreakdowns(blended);
                logger.LogInformation(
                    "Percentile-ranked {N} stocks across 7 factors (Momentum/Volume mcap-blended)",
                    ranked.Length);
            }
            else
            {
                ranked = pending.Select(p => p.Raw.Breakdown).ToArray();
                logger.LogInformation("Percentile ranking skipped (universe={N}, min={Min})",
                    pending.Count, _options.MinUniverseForRanking);
            }

            // ─────────────────────────────────────────────────────────────
            // PASS 3 — Apply market-regime tilt (±TiltCap), then finalize each stock:
            // pick regime-conditional weights, compute Total, classify, build trade zones.
            // ─────────────────────────────────────────────────────────────
            var scoredSignals = new List<ScoredSignal>(pending.Count);
            for (int i = 0; i < pending.Count; i++)
            {
                var (snap, raw) = pending[i];
                var tilted = ApplyRegimeTilt(ranked[i], snap.Sector, snap.StockReturn5d);
                var final = StockScorer.Finalize(
                    snap, tilted, raw.Provenance, _options, _regime,
                    hasSmartMoneyData: hasSmartMoneyData.Contains(snap.Ticker));
                scoredSignals.Add(final);
            }

            scoredSignals = scoredSignals.OrderByDescending(s => s.ScoreTotal).ToList();

            logger.LogInformation("Scored {Count} stocks, top: {Top} ({Score:F1})",
                scoredSignals.Count,
                scoredSignals.FirstOrDefault()?.Ticker ?? "none",
                scoredSignals.FirstOrDefault()?.ScoreTotal ?? 0);

            // ─────────────────────────────────────────────────────────────
            // PASS 4 — Publish filter: BUY_TODAY with R:R >= min, WATCH capped at N.
            // ─────────────────────────────────────────────────────────────
            var publishable = new List<ScoredSignal>();

            // BUY_TODAY: must clear composite threshold (handled by the
            // classifier) AND pass the R:R gate AND have supporting
            // evidence — news flow, insider buying, or a filed catalyst.
            // A high composite without any real-world validator is a
            // WATCH, not a BUY. Prevents the "everything is a BUY"
            // compression when the scored universe is pre-filtered for
            // quality.
            // Market-cap floor for publishing. The product is for the common
            // public — Featured signals must be names like Apple, Tesla,
            // Disney, not $5B homebuilders or institutional banks. Tickers
            // below the floor still got scored above (so any /stock/X page
            // works), they just don't enter the daily-drop pool.
            var minPublishMcap = _options.Thresholds.MinPublishMarketCap;
            var mcapByStockId = pending.ToDictionary(
                p => p.Snap.StockId,
                p => p.Snap.MarketCap ?? 0);
            bool ClearsMcapFloor(ScoredSignal s) =>
                minPublishMcap <= 0
                || (mcapByStockId.TryGetValue(s.StockId, out var m) && m >= minPublishMcap);

            var buyCandidates = scoredSignals
                .Where(s => s.SignalType == "BUY_TODAY"
                         && s.RiskRewardRatio.HasValue
                         && s.RiskRewardRatio.Value >= _options.Thresholds.MinRiskReward
                         && ClearsMcapFloor(s))
                .ToList();

            var buySignals = new List<ScoredSignal>();
            var demotedToWatch = new List<ScoredSignal>();
            var demoteReasons = new Dictionary<string, int>();
            foreach (var s in buyCandidates)
            {
                var (passes, reason) = _options.Thresholds.PassesBuyConfirmation(s.Breakdown, s.Provenance);
                if (passes)
                {
                    buySignals.Add(s);
                }
                else
                {
                    demotedToWatch.Add(s);
                    if (reason is not null)
                        demoteReasons[reason] = demoteReasons.GetValueOrDefault(reason) + 1;
                }
            }
            // Cap BUY_TODAY at the top N by score. The threshold + per-factor
            // floors already filter quality; this ensures we publish a tight
            // daily list (target ~7) instead of every name that cleared the
            // bar. Overflow demotes to WATCH so it can still surface there
            // if it beats the WATCH cohort.
            if (buySignals.Count > _options.Thresholds.MaxBuySignals)
            {
                var sorted = buySignals.OrderByDescending(s => s.ScoreTotal).ToList();
                buySignals = sorted.Take(_options.Thresholds.MaxBuySignals).ToList();
                demotedToWatch.AddRange(sorted.Skip(_options.Thresholds.MaxBuySignals));
            }

            // Same mcap floor as BUY — WATCH signals on /research are
            // also "for the common public", so $5B homebuilders shouldn't
            // appear here either. Demoted BUY candidates already cleared
            // the floor before being demoted, so they keep their slot.
            var watchSignals = scoredSignals
                .Where(s => s.SignalType == "WATCH" && s.EntryLow.HasValue && ClearsMcapFloor(s))
                .Concat(demotedToWatch) // demoted BUY_TODAY rows without confirmation
                .Take(_options.Thresholds.MaxWatchSignals)
                .ToList();

            publishable.AddRange(buySignals);
            publishable.AddRange(watchSignals);

            logger.LogInformation(
                "Publishing {Buy} BUY_TODAY + {Watch} WATCH signals " +
                "(filtered from {Total} scored; {Demoted} BUY candidates demoted). " +
                "Demote reasons: {Reasons}",
                buySignals.Count, watchSignals.Count, scoredSignals.Count, demotedToWatch.Count,
                string.Join(", ", demoteReasons.Select(kv => $"{kv.Key}={kv.Value}")));

            // 5. Persist signals + breakdowns
            foreach (var scored in publishable)
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
                    SmartMoneyScore = scored.Breakdown.SmartMoney,
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

            // 5b. Persist one score-history row per published signal. Feeds
            // real sparklines on the UI + real day-over-day deltas on
            // ScoreGradeChip. Upsert on (ticker, today): delete any
            // existing rows for these tickers today, then insert fresh.
            // Guarded against missing migration 026 so a fresh DB doesn't
            // fail the scan — just logs and skips.
            // Phase 1 of multi-lens scoring: write a history row for EVERY
            // scored ticker, not just publishable signals. This decouples
            // "score" from "signal" — AMD, AAPL, NVDA all get a daily score
            // even when the swing-setup classifier doesn't fire BUY_TODAY.
            // The screener and stock detail page read scores for the entire
            // universe from this table, so big caps stop showing up at 0.
            // SignalType is null for non-publishable rows; the column is
            // used by Today/Boards UI to skip rows without a published call.
            var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
            if (scoredSignals.Count > 0)
            {
                try
                {
                    // Replace any existing rows for today; one upsert pass.
                    await db.SignalScoreHistory
                        .Where(h => h.AsOfDate == today)
                        .ExecuteDeleteAsync(ct);

                    var publishableTickers = publishable
                        .Select(p => p.Ticker)
                        .ToHashSet(StringComparer.OrdinalIgnoreCase);
                    var publishableTypeByTicker = publishable
                        .ToDictionary(p => p.Ticker, p => p.SignalType, StringComparer.OrdinalIgnoreCase);

                    // Phase 2 of multi-lens scoring: re-weight the same 7
                    // factors with the Composite (balanced) and Quality
                    // (fundamentals-led) lens weights. Both come from
                    // FactorWeights.Composite()/Quality() — see
                    // ScoringOptions.cs for rationale.
                    var compositeWeights = Fintrest.Api.Services.Scoring.FactorWeights.Composite();
                    var qualityWeights = Fintrest.Api.Services.Scoring.FactorWeights.Quality();

                    foreach (var scored in scoredSignals)
                    {
                        var b = scored.Breakdown;
                        var composite = compositeWeights.Apply(b);
                        var quality = qualityWeights.Apply(b);

                        db.SignalScoreHistory.Add(new Models.SignalScoreHistory
                        {
                            Ticker = scored.Ticker,
                            AsOfDate = today,
                            ScoreTotal = (decimal)scored.ScoreTotal,
                            CompositeScore = (decimal)Math.Round(composite, 2),
                            QualityScore = (decimal)Math.Round(quality, 2),
                            // Only carry SignalType when the row was published.
                            // Non-publishable rows get null so consumers can
                            // tell "score exists but no call was made".
                            SignalType = publishableTickers.Contains(scored.Ticker)
                                ? publishableTypeByTicker[scored.Ticker]
                                : null,
                            ScanRunId = scanRun.Id,
                        });
                    }
                    logger.LogInformation(
                        "signal_score_history: persisted {Total} ticker scores ({Pub} with published signal) — Setup + Composite + Quality lenses",
                        scoredSignals.Count, publishable.Count);
                }
                catch (Npgsql.PostgresException pex) when (pex.SqlState == "42P01")
                {
                    logger.LogWarning(
                        "Skipping signal_score_history writes — table does not exist (migration 026 pending). Scan will still complete; sparklines degrade to synthetic until migration runs.");
                }
            }

            // 6. Finalize scan run
            sw.Stop();
            scanRun.Status = "COMPLETED";
            scanRun.SignalsGenerated = publishable.Count;
            scanRun.CompletedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);

            logger.LogInformation(
                "Scan {ScanId} completed: {Count} signals in {Ms}ms",
                scanRun.Id, scoredSignals.Count, sw.ElapsedMilliseconds);

            // 7. Athena AI theses for top N publishable signals — runs post-scan so signals are
            //    visible to users immediately; theses appear as they're generated. Sequential
            //    (not parallel) to stay under Anthropic rate limits and keep token usage predictable.
            await GenerateThesesForTopSignals(
                publishable, pending, scanRun.Id, ct);

            return new ScanResult
            {
                ScanRunId = scanRun.Id,
                SignalsGenerated = scoredSignals.Count,
                DurationMs = (int)sw.ElapsedMilliseconds,
                TopSignals = publishable.Take(12).ToList(),
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
            // Fundamentals (quarterly + TTM from Stock model)
            RevenueGrowth = fundamental?.RevenueGrowth,
            EpsGrowth = fundamental?.EpsGrowth,
            GrossMargin = fundamental?.GrossMargin,
            NetMargin = fundamental?.NetMargin,
            PeRatio = fundamental?.PeRatio ?? stock.ForwardPe,
            PegRatio = stock.PegRatio,
            ReturnOnEquity = stock.ReturnOnEquity,
            ReturnOnAssets = stock.ReturnOnAssets,
            OperatingMargin = stock.OperatingMargin,
            DebtToEquity = fundamental?.DebtToEquity,
            // News & Catalyst
            NewsSentiment = avgSentiment,
            HasCatalyst = hasCatalyst,
            CatalystType = catalystType,
            NewsCount = newsItems.Count,
            // Analyst
            AnalystTargetPrice = stock.AnalystTargetPrice,
            // Insider (defaults — populated if Finnhub data exists)
            InsiderBuying = false,
            InsiderBuyCount = 0,
            InsiderSellCount = 0,
            // Float/market
            FloatShares = stock.FloatShares,
            MarketCap = stock.MarketCap,
            Beta = stock.Beta,
            // Earnings
            NextEarningsDate = stock.NextEarningsDate,
            LastEpsSurprise = fundamental?.EpsGrowth, // Proxy: EPS growth as surprise indicator
            // Market regime (set separately)
            SpyTrendDirection = _regime.SpyTrendDirection,
            Regime = _regime,
            StockReturn5d = PctReturn(marketData.Select(m => m.Close).ToList(), 5),
        };
    }

    private RegimeModel _regime = RegimeModel.Neutral;

    /// <summary>
    /// Generate AI theses for the top publishable signals. Best-effort — failures per ticker
    /// are logged and skipped so one bad Claude response doesn't break the scan.
    /// </summary>
    private async Task GenerateThesesForTopSignals(
        List<ScoredSignal> publishable,
        List<(StockSnapshot Snap, StockScorer.FactorResult Raw)> pending,
        long scanRunId,
        CancellationToken ct)
    {
        var snapshotByTicker = pending.ToDictionary(p => p.Snap.Ticker, p => p.Snap);
        // Only BUY_TODAY signals get an Athena thesis. WATCH signals are tracked but don't
        // need full AI narratives — keeps LLM spend focused on actionable picks and cuts
        // per-scan failure surface significantly.
        var top = publishable
            .Where(s => s.SignalType == "BUY_TODAY")
            .Take(ThesisTopN)
            .ToList();
        if (top.Count == 0)
        {
            logger.LogInformation("No BUY_TODAY signals this scan — skipping Athena thesis generation.");
            return;
        }

        logger.LogInformation("Generating Athena theses for top {N} BUY_TODAY signals", top.Count);

        foreach (var signal in top)
        {
            if (ct.IsCancellationRequested) break;
            if (!snapshotByTicker.TryGetValue(signal.Ticker, out var snap)) continue;

            var zone = signal.EntryLow.HasValue
                ? new TradeZoneCalculator.TradeZone(
                    EntryLow: signal.EntryLow ?? 0,
                    EntryHigh: signal.EntryHigh ?? 0,
                    StopLoss: signal.StopLoss ?? 0,
                    TargetLow: signal.TargetLow ?? 0,
                    TargetHigh: signal.TargetHigh ?? 0,
                    RiskRewardRatio: signal.RiskRewardRatio ?? 0)
                : null;

            var todayChangePct = snap.ClosePrices.Count >= 2 && snap.ClosePrices[^2] > 0
                ? (snap.Price - snap.ClosePrices[^2]) / snap.ClosePrices[^2] * 100
                : 0;

            try
            {
                await thesisService.GenerateAsync(snap, signal.Breakdown, zone, _regime, scanRunId, todayChangePct, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Thesis generation failed for {Ticker}", signal.Ticker);
            }
        }
    }

    /// <summary>
    /// On-demand thesis generation for a ticker not covered by the last scan (e.g. user visits a
    /// detail page for a stock that didn't hit the top-N threshold). Builds a snapshot, scores it
    /// with the most recent regime, and feeds the thesis service. Returns null if the stock lacks
    /// enough history to score.
    /// </summary>
    public async Task<AthenaThesis?> GenerateThesisForTickerAsync(
        Stock stock,
        CancellationToken ct = default)
    {
        // Ensure we have a recent regime snapshot — reuse cached if fresh, else recompute.
        if (_regime.SpyReturn5d == 0 && _regime.SpyReturn20d == 0)
            await ComputeMarketRegime(ct);

        var snapshot = await BuildSnapshot(stock, ct);
        if (snapshot is null) return null;

        var raw = StockScorer.ScoreFactors(snapshot);

        // Single-stock percentile ranking doesn't make sense; apply regime tilt to the raw breakdown
        // so the thesis sees a reasonable score profile rather than 50/50/50/...
        var tilted = ApplyRegimeTilt(raw.Breakdown, snapshot.Sector, snapshot.StockReturn5d);
        var signal = StockScorer.Finalize(snapshot, tilted, raw.Provenance, _options, _regime);

        var zone = signal.EntryLow.HasValue
            ? new TradeZoneCalculator.TradeZone(
                EntryLow: signal.EntryLow ?? 0,
                EntryHigh: signal.EntryHigh ?? 0,
                StopLoss: signal.StopLoss ?? 0,
                TargetLow: signal.TargetLow ?? 0,
                TargetHigh: signal.TargetHigh ?? 0,
                RiskRewardRatio: signal.RiskRewardRatio ?? 0)
            : null;

        var todayChangePct = snapshot.ClosePrices.Count >= 2 && snapshot.ClosePrices[^2] > 0
            ? (snapshot.Price - snapshot.ClosePrices[^2]) / snapshot.ClosePrices[^2] * 100
            : 0;

        return await thesisService.GenerateAsync(
            snapshot, signal.Breakdown, zone, _regime, scanRunId: null, todayChangePct, ct);
    }


    /// <summary>
    /// Apply regime tilt to each factor of a ranked breakdown, bounded by configured cap.
    /// Runs AFTER percentile ranking so the tilt is applied on universe-relative scores.
    /// </summary>
    /// <summary>
    /// Blend Quality / Profitability / Growth sub-scores into a single
    /// Fundamental factor score (§14.1). Equal-weight 1/3 each when all
    /// three are non-null; otherwise an average of what's available. Returns
    /// null when none of the three sub-scores are available for this ticker,
    /// which signals the caller to fall back to the inline StockScorer value.
    /// </summary>
    private static double? BlendQpg(double? quality, double? profitability, double? growth)
    {
        var parts = new List<double>();
        if (quality is not null) parts.Add(quality.Value);
        if (profitability is not null) parts.Add(profitability.Value);
        if (growth is not null) parts.Add(growth.Value);
        return parts.Count == 0 ? null : parts.Average();
    }

    private ScoringEngineV2.ScoreBreakdown ApplyRegimeTilt(
        ScoringEngineV2.ScoreBreakdown ranked,
        string? sector,
        double? stockReturn5d)
    {
        var cap = _options.RegimeTiltCap;
        return new ScoringEngineV2.ScoreBreakdown(
            Momentum: ScoringEngineV2.ApplyRegime(ranked.Momentum, "Momentum", _regime, sector, stockReturn5d, cap),
            Volume: ScoringEngineV2.ApplyRegime(ranked.Volume, "Volume", _regime, sector, stockReturn5d, cap),
            Catalyst: ScoringEngineV2.ApplyRegime(ranked.Catalyst, "Catalyst", _regime, sector, stockReturn5d, cap),
            Fundamental: ScoringEngineV2.ApplyRegime(ranked.Fundamental, "Fundamental", _regime, sector, stockReturn5d, cap),
            Sentiment: ScoringEngineV2.ApplyRegime(ranked.Sentiment, "Sentiment", _regime, sector, stockReturn5d, cap),
            Trend: ScoringEngineV2.ApplyRegime(ranked.Trend, "Trend", _regime, sector, stockReturn5d, cap),
            Risk: ScoringEngineV2.ApplyRegime(ranked.Risk, "Risk", _regime, sector, stockReturn5d, cap)
        );
    }


    /// <summary>
    /// Compute full market regime once per scan: SPY trend, SPY returns (1d/5d/20d),
    /// VIX level + change, and per-sector 5d average return. Snapshot is reused for every stock.
    /// </summary>
    private async Task ComputeMarketRegime(CancellationToken ct)
    {
        var spy = await db.Stocks.FirstOrDefaultAsync(s => s.Ticker == "SPY", ct);
        if (spy is null) { _regime = RegimeModel.Neutral; return; }

        var spyBars = await db.MarketData
            .Where(m => m.StockId == spy.Id)
            .OrderByDescending(m => m.Ts)
            .Take(250)
            .Select(m => m.Close)
            .ToListAsync(ct);

        if (spyBars.Count < 50) { _regime = RegimeModel.Neutral; return; }

        spyBars.Reverse();
        var spyMa50 = spyBars.TakeLast(50).Average();
        var spyMa200 = spyBars.Count >= 200 ? spyBars.Average() : spyMa50;
        var spyPrice = spyBars[^1];
        var spyTrend = Indicators.TechnicalIndicators.TrendDirection(spyPrice, null, spyMa50, spyMa200);

        var spy1d = PctReturn(spyBars, 1) ?? 0;
        var spy5d = PctReturn(spyBars, 5) ?? 0;
        var spy20d = PctReturn(spyBars, 20) ?? 0;

        // VIX: try common tickers if user's universe includes it.
        double? vixLevel = null, vixChange = null;
        var vix = await db.Stocks.FirstOrDefaultAsync(
            s => s.Ticker == "VIX" || s.Ticker == "^VIX" || s.Ticker == "VIXY",
            ct);
        if (vix is not null)
        {
            var vixBars = await db.MarketData
                .Where(m => m.StockId == vix.Id)
                .OrderByDescending(m => m.Ts)
                .Take(5)
                .Select(m => m.Close)
                .ToListAsync(ct);
            if (vixBars.Count >= 1) vixLevel = vixBars[0];
            if (vixBars.Count >= 2 && vixBars[1] > 0)
                vixChange = (vixBars[0] - vixBars[1]) / vixBars[1] * 100;
        }

        // Sector RS — average 5d return per sector across active stocks (cheap proxy for sector ETF RS).
        var sectorReturns = new Dictionary<string, double>();
        var sectorGroups = await db.Stocks
            .Where(s => s.Active && s.Sector != null)
            .Select(s => new { s.Id, s.Sector })
            .ToListAsync(ct);

        var cutoff = DateTime.UtcNow.AddDays(-12); // enough bars to span 5 sessions + weekends
        var recentBars = await db.MarketData
            .Where(m => m.Ts >= cutoff)
            .Select(m => new { m.StockId, m.Ts, m.Close })
            .ToListAsync(ct);

        var closesByStock = recentBars
            .GroupBy(b => b.StockId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(b => b.Ts).Select(b => b.Close).ToList());

        foreach (var bySector in sectorGroups.GroupBy(s => s.Sector!))
        {
            var returns = new List<double>();
            foreach (var s in bySector)
            {
                if (closesByStock.TryGetValue(s.Id, out var closes) && closes.Count >= 6)
                {
                    var r = PctReturn(closes, 5);
                    if (r.HasValue) returns.Add(r.Value);
                }
            }
            if (returns.Count >= 3) // skip tiny sectors
                sectorReturns[bySector.Key] = returns.Average();
        }

        _regime = new RegimeModel
        {
            SpyTrendDirection = spyTrend,
            SpyReturn1d = spy1d,
            SpyReturn5d = spy5d,
            SpyReturn20d = spy20d,
            VixLevel = vixLevel,
            VixChange1d = vixChange,
            SectorReturns5d = sectorReturns,
        };

        logger.LogInformation(
            "Market regime: SPY trend={Dir} 1d={D1:F2}% 5d={D5:F2}% 20d={D20:F2}% VIX={Vix} Sectors={Sectors}",
            spyTrend, spy1d, spy5d, spy20d,
            vixLevel?.ToString("F1") ?? "n/a",
            sectorReturns.Count);
    }

    private static double? PctReturn(IReadOnlyList<double> closes, int lookback)
    {
        if (closes.Count <= lookback) return null;
        var prev = closes[^(lookback + 1)];
        if (prev <= 0) return null;
        return (closes[^1] - prev) / prev * 100;
    }
}

public record ScanResult
{
    public long ScanRunId { get; init; }
    public int SignalsGenerated { get; init; }
    public int DurationMs { get; init; }
    public List<ScoredSignal> TopSignals { get; init; } = [];
}

/// <summary>
/// Live market snapshot passed from <see cref="IntradayDriftJob"/> into the scan
/// so regime-conditional weights + tilts react to what the tape is doing right now.
/// </summary>
public record DriftTrigger(
    double SpyChangePct,
    double? VixLevel,
    double? VixChangePct,
    string Reason);
