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
            // PASS 2 — Cross-sectional percentile ranking across universe.
            // Converts each factor score from "raw table output" to "your stock's
            // percentile within today's universe on this factor" (0-100).
            // ─────────────────────────────────────────────────────────────
            ScoringEngineV2.ScoreBreakdown[] ranked;
            if (_options.UsePercentileRanking && pending.Count >= _options.MinUniverseForRanking)
            {
                ranked = PercentileRanker.RankBreakdowns(pending.Select(p => p.Raw.Breakdown).ToList());
                logger.LogInformation("Percentile-ranked {N} stocks across 7 factors", ranked.Length);
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
                var final = StockScorer.Finalize(snap, tilted, raw.Provenance, _options, _regime);
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
            var buyCandidates = scoredSignals
                .Where(s => s.SignalType == "BUY_TODAY"
                         && s.RiskRewardRatio.HasValue
                         && s.RiskRewardRatio.Value >= _options.Thresholds.MinRiskReward)
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

            var watchSignals = scoredSignals
                .Where(s => s.SignalType == "WATCH" && s.EntryLow.HasValue)
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
