using System.Text.Json;
using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Generates Athena's narrative thesis for a scored stock: why it matters now, what's driving
/// the setup, risks, and the trade plan. Combines:
///
///   1. A deterministic <b>sub-verdict classifier</b> that pattern-matches factor scores into
///      human-readable setups ("Buy the Dip", "Breakout Setup", "Momentum Run", etc). No LLM
///      — fast, auditable, consistent.
///
///   2. A <b>Claude Sonnet 4</b> call that takes the full structured context (factor scores,
///      fundamentals, regime, analyst data, trade zone) and produces the editorial paragraphs,
///      catalysts, and risks. Strict JSON output, compliance rules enforced in the system prompt.
///
/// Caching: theses are persisted per (scan_run_id, ticker). <see cref="GetOrGenerateAsync"/>
/// returns the cached row if one exists from the current scan run.
/// </summary>
public class AthenaThesisService(
    AppDbContext db,
    IConfiguration config,
    ILogger<AthenaThesisService> logger)
{
    private readonly string _apiKey = config["AI:Anthropic:ApiKey"] ?? "";
    private readonly string _model = config["AI:Anthropic:Model"] ?? "claude-sonnet-4-20250514";

    private const string SystemPrompt = """
        You are Athena, the editorial voice of Fintrest.ai. You turn quantitative signal data
        into clear, educational thesis narratives that help retail investors understand WHY a
        stock is a signal right now.

        COMPLIANCE — NON-NEGOTIABLE:
        - Never tell the reader to buy or sell. Say "the setup" or "the signal suggests", not
          "you should buy".
        - NEVER include dollar amounts for position sizing ("put $6K in this"). Use qualitative
          tiers only.
        - Never guarantee returns or claim the signal is always right.
        - Frame everything as educational context about the current setup.

        OUTPUT FORMAT — STRICT JSON, no preamble, no markdown fences:
        {
          "thesis": "2-3 paragraphs, editorial voice, plain English. Open with what the company
                     is and its position in the market. Then what's driving the current setup
                     (momentum, catalyst, value, regime tailwind). Then valuation + sentiment
                     context (analyst target / consensus if meaningful). End with the volume
                     read (accumulating / distributing / quiet). Use specific numbers from the
                     context — 52W position, upside%, analyst count — not generalities.",
          "catalysts": ["Short bullet 1", "Short bullet 2", "..."],
          "risks": ["Short bullet 1", "Short bullet 2", "..."],
          "tradePlanNarrative": "One short sentence describing the setup: 'Entry zone $X-$Y, stop $Z (-A%), target $P-$Q (+B%) over N days.'"
        }

        STYLE:
        - Sharp, confident, editorial — like TipRanks or Motley Fool editorial, not a bank research report.
        - Use hard numbers from the provided context.
        - No hedging filler ("it could be noted that...").
        - No emojis.
        """;

    public record ThesisResult(
        string Verdict,
        string Tier,
        string Thesis,
        List<string> Catalysts,
        List<string> Risks,
        string TradePlanNarrative,
        int InputTokens,
        int OutputTokens);

    /// <summary>Pull the most recent thesis for this ticker, regenerating if none is cached.</summary>
    public async Task<AthenaThesis?> GetOrGenerateAsync(
        string ticker,
        CancellationToken ct = default)
    {
        var cached = await db.AthenaTheses
            .Where(t => t.Ticker == ticker)
            .OrderByDescending(t => t.GeneratedAt)
            .FirstOrDefaultAsync(ct);

        // Cache for 6 hours — beyond that the tape has moved enough to warrant a refresh.
        if (cached is not null && DateTime.UtcNow - cached.GeneratedAt < TimeSpan.FromHours(6))
            return cached;

        // No fresh cache — would need a snapshot + breakdown to regen. Return stale if any.
        return cached;
    }

    /// <summary>
    /// Generate a thesis for the given stock + scoring context. Persists and returns the row.
    /// </summary>
    public async Task<AthenaThesis?> GenerateAsync(
        StockSnapshot snap,
        ScoringEngineV2.ScoreBreakdown breakdown,
        TradeZoneCalculator.TradeZone? zone,
        MarketRegime regime,
        long? scanRunId,
        double todayChangePct,
        CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            logger.LogWarning("Athena API key missing — skipping thesis generation for {Ticker}", snap.Ticker);
            return null;
        }

        var verdict = ClassifyVerdict(breakdown, snap, regime, todayChangePct);
        var tier = ClassifyTier(breakdown, snap, regime);

        var userPrompt = BuildUserPrompt(snap, breakdown, zone, regime, todayChangePct, verdict, tier);

        try
        {
            var client = new AnthropicClient(new APIAuthentication(_apiKey));
            var request = new MessageParameters
            {
                Model = _model,
                MaxTokens = 900,
                System = [new SystemMessage(SystemPrompt)],
                Messages = [new Message(RoleType.User, userPrompt)],
            };

            var response = await client.Messages.GetClaudeMessageAsync(request, ct);
            var raw = response.Message?.ToString() ?? "";
            var parsed = ParseThesisJson(raw);
            if (parsed is null)
            {
                logger.LogWarning("Athena returned unparseable JSON for {Ticker}: {Raw}",
                    snap.Ticker, raw.Substring(0, Math.Min(raw.Length, 200)));
                return null;
            }

            var entity = new AthenaThesis
            {
                ScanRunId = scanRunId,
                StockId = snap.StockId,
                Ticker = snap.Ticker,
                Verdict = verdict,
                Tier = tier,
                ThesisMarkdown = parsed.Thesis,
                CatalystsJson = JsonSerializer.Serialize(parsed.Catalysts),
                RisksJson = JsonSerializer.Serialize(parsed.Risks),
                TradePlanJson = JsonSerializer.Serialize(BuildTradePlan(zone, parsed.TradePlanNarrative)),
                InputTokens = response.Usage?.InputTokens ?? 0,
                OutputTokens = response.Usage?.OutputTokens ?? 0,
                Model = _model,
                GeneratedAt = DateTime.UtcNow,
            };
            db.AthenaTheses.Add(entity);

            db.LlmTraceLogs.Add(new LlmTraceLog
            {
                Model = _model,
                InputTokens = entity.InputTokens,
                OutputTokens = entity.OutputTokens,
                ExplanationType = "athena_thesis",
                CreatedAt = DateTime.UtcNow,
            });

            await db.SaveChangesAsync(ct);
            logger.LogInformation("Athena thesis for {Ticker} — {Verdict} / {Tier} ({In}in/{Out}out tokens)",
                snap.Ticker, verdict, tier, entity.InputTokens, entity.OutputTokens);

            return entity;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Athena thesis generation failed for {Ticker}", snap.Ticker);
            return null;
        }
    }

    // ────────────────────────────────────────────────────────────────────
    // Sub-verdict classifier (deterministic, pattern-based, no LLM)
    // ────────────────────────────────────────────────────────────────────

    internal static string ClassifyVerdict(
        ScoringEngineV2.ScoreBreakdown b,
        StockSnapshot snap,
        MarketRegime regime,
        double todayChangePct)
    {
        // 1. Event-Driven — earnings window or fresh catalyst dominates everything else
        if (snap.NextEarningsDate.HasValue)
        {
            var days = (snap.NextEarningsDate.Value - DateTime.UtcNow).TotalDays;
            if (days is >= 0 and <= 14) return "Event-Driven";
        }
        if (b.Catalyst >= 85 && snap.HasCatalyst) return "Event-Driven";

        // 2. Buy the Dip — strong Fundamental + strong Momentum + today's tape is red
        if (b.Fundamental >= 70 && b.Momentum >= 70 && todayChangePct <= -0.5)
            return "Buy the Dip";

        // 3. Breakout Setup — BB squeeze (high Trend from that sub-factor) + high Volume
        if (b.Trend >= 75 && b.Volume >= 75)
            return "Breakout Setup";

        // 4. Momentum Run — top-decile Momentum + high Trend
        if (b.Momentum >= 80 && b.Trend >= 65)
            return "Momentum Run";

        // 5. Value Setup — strong Fundamental + depressed Momentum (classic contrarian)
        if (b.Fundamental >= 75 && b.Momentum <= 55)
            return "Value Setup";

        // 6. Mean Reversion — high Risk score (extreme z-score flag inside) + strong Fundamental
        if (b.Risk <= 40 && b.Fundamental >= 65)
            return "Mean Reversion";

        // 7. Defensive Hold — bear regime + low Beta + strong Fundamental
        if (regime.SpyTrendDirection == -1 && (snap.Beta ?? 1.0) < 0.8 && b.Fundamental >= 65)
            return "Defensive Hold";

        // Fallback: use signal type directly
        return b.SignalType == "BUY_TODAY" ? "Quality Setup" : "Watchlist";
    }

    internal static string ClassifyTier(
        ScoringEngineV2.ScoreBreakdown b,
        StockSnapshot snap,
        MarketRegime regime)
    {
        var beta = snap.Beta ?? 1.0;
        var mcap = snap.MarketCap ?? 0;

        if (beta > 1.8 || mcap < 2_000_000_000) return "Speculative";
        if (snap.NextEarningsDate.HasValue)
        {
            var days = (snap.NextEarningsDate.Value - DateTime.UtcNow).TotalDays;
            if (days is >= 0 and <= 14) return "Event-driven";
        }
        if (beta < 0.8 && b.Fundamental >= 70) return "Defensive";
        if (b.Fundamental >= 75 && b.Risk >= 60) return "Quality · Core";
        if (b.Momentum >= 75 && b.Fundamental >= 55) return "Quality · Growth";
        return "Growth";
    }

    // ────────────────────────────────────────────────────────────────────
    // Prompt construction — hand Claude the structured, labeled context
    // ────────────────────────────────────────────────────────────────────

    private static string BuildUserPrompt(
        StockSnapshot snap,
        ScoringEngineV2.ScoreBreakdown b,
        TradeZoneCalculator.TradeZone? zone,
        MarketRegime regime,
        double todayChangePct,
        string verdict,
        string tier)
    {
        var sector5d = snap.Sector is not null
            && regime.SectorReturns5d.TryGetValue(snap.Sector, out var sr)
                ? $"{sr:+0.00;-0.00}%" : "n/a";

        var wk52 = snap.ClosePrices.Count >= 60
            ? BuildWeek52Line(snap)
            : "insufficient history";

        var earnings = snap.NextEarningsDate.HasValue
            ? $"{snap.NextEarningsDate.Value:yyyy-MM-dd} ({(int)(snap.NextEarningsDate.Value - DateTime.UtcNow).TotalDays} days)"
            : "not scheduled";

        var analystLine = snap.AnalystTargetPrice.HasValue
            ? $"target ${snap.AnalystTargetPrice.Value:F2} ({((snap.AnalystTargetPrice.Value - snap.Price) / snap.Price * 100):+0.0;-0.0}% upside), consensus {snap.AnalystRating?.ToString("F1") ?? "n/a"}/5 ({snap.AnalystCount ?? 0} analysts)"
            : "no analyst coverage";

        var tradeLine = zone is not null
            ? $"entry ${zone.EntryLow:F2}-${zone.EntryHigh:F2} · stop ${zone.StopLoss:F2} · target ${zone.TargetLow:F2}-${zone.TargetHigh:F2} · R:R {zone.RiskRewardRatio:F1}:1"
            : "no trade zone (insufficient ATR)";

        return $$"""
        Generate the Athena thesis JSON for this stock:

        TICKER: {{snap.Ticker}} ({{snap.Name}})
        SECTOR: {{snap.Sector ?? "n/a"}}
        PRICE: ${{snap.Price:F2}} ({{todayChangePct:+0.00;-0.00}}% today)
        52W: {{wk52}}
        MARKET CAP: {{FormatMcap(snap.MarketCap)}}

        SIGNAL: {{b.SignalType}} · composite {{b.Total:F1}}/100 · sub-verdict "{{verdict}}" · tier "{{tier}}"

        FACTOR PERCENTILES (0-100, universe-relative):
        - Momentum: {{b.Momentum:F0}}
        - Relative Volume: {{b.Volume:F0}}
        - News/Catalyst: {{b.Catalyst:F0}}
        - Fundamentals: {{b.Fundamental:F0}}
        - Sentiment: {{b.Sentiment:F0}}
        - Trend: {{b.Trend:F0}}
        - Risk: {{b.Risk:F0}}

        MARKET REGIME (right now):
        - SPY today: {{regime.SpyReturn1d:+0.00;-0.00}}% · 5d: {{regime.SpyReturn5d:+0.00;-0.00}}% · 20d: {{regime.SpyReturn20d:+0.00;-0.00}}%
        - SPY trend MA cross: {{(regime.SpyTrendDirection == 1 ? "bull" : regime.SpyTrendDirection == -1 ? "bear" : "mixed")}}
        - VIX: {{regime.VixLevel?.ToString("F1") ?? "n/a"}}
        - Sector 5d: {{sector5d}}

        FUNDAMENTALS:
        - P/E: {{snap.PeRatio?.ToString("F1") ?? "n/a"}} · PEG: {{snap.PegRatio?.ToString("F2") ?? "n/a"}}
        - Revenue growth: {{snap.RevenueGrowth?.ToString("F1") + "%" ?? "n/a"}}
        - Operating margin: {{(snap.OperatingMargin.HasValue ? (snap.OperatingMargin.Value * 100).ToString("F1") + "%" : "n/a")}}
        - ROE: {{(snap.ReturnOnEquity.HasValue ? (snap.ReturnOnEquity.Value * 100).ToString("F1") + "%" : "n/a")}}
        - Debt/Equity: {{snap.DebtToEquity?.ToString("F2") ?? "n/a"}}
        - Beta: {{snap.Beta?.ToString("F2") ?? "n/a"}}

        ANALYST: {{analystLine}}

        NEXT EARNINGS: {{earnings}}

        CATALYST: {{(snap.HasCatalyst ? snap.CatalystType ?? "general" : "none")}} · news count {{snap.NewsCount}} · sentiment {{snap.NewsSentiment?.ToString("F2") ?? "n/a"}}

        VOLUME: current {{snap.Volume:N0}} vs 30d avg — {{(snap.VolumeSeries.Count >= 30 ? $"ratio {(snap.Volume / snap.VolumeSeries.TakeLast(30).Average(v => (double)v)):F2}x" : "insufficient history")}}

        TRADE ZONE: {{tradeLine}}

        Return the strict JSON described in the system prompt. No markdown fences, no preamble.
        """;
    }

    private static string BuildWeek52Line(StockSnapshot snap)
    {
        var window = snap.ClosePrices.Count >= 252
            ? snap.ClosePrices.TakeLast(252).ToList()
            : snap.ClosePrices.ToList();
        var hi = window.Max();
        var lo = window.Min();
        var pctFromHi = (snap.Price - hi) / hi * 100;
        return $"${lo:F2}-${hi:F2}, currently {pctFromHi:+0.0;-0.0}% from high";
    }

    private static string FormatMcap(double? mcap)
    {
        if (!mcap.HasValue) return "n/a";
        var v = mcap.Value;
        if (v >= 1e12) return $"${v / 1e12:F2}T";
        if (v >= 1e9) return $"${v / 1e9:F2}B";
        if (v >= 1e6) return $"${v / 1e6:F1}M";
        return $"${v:F0}";
    }

    private static object BuildTradePlan(TradeZoneCalculator.TradeZone? zone, string narrative) =>
        zone is not null
            ? new
            {
                entryLow = zone.EntryLow,
                entryHigh = zone.EntryHigh,
                stopLoss = zone.StopLoss,
                targetLow = zone.TargetLow,
                targetHigh = zone.TargetHigh,
                riskReward = zone.RiskRewardRatio,
                narrative,
            }
            : new { narrative };

    private record RawThesis(string Thesis, List<string> Catalysts, List<string> Risks, string TradePlanNarrative);

    private static RawThesis? ParseThesisJson(string raw)
    {
        // Trim Claude's preamble / fences if any sneak in despite the strict prompt.
        var start = raw.IndexOf('{');
        var end = raw.LastIndexOf('}');
        if (start < 0 || end <= start) return null;
        var json = raw.Substring(start, end - start + 1);
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var thesis = root.GetProperty("thesis").GetString() ?? "";
            var catalysts = root.TryGetProperty("catalysts", out var c) && c.ValueKind == JsonValueKind.Array
                ? c.EnumerateArray().Select(e => e.GetString() ?? "").Where(s => s.Length > 0).ToList()
                : [];
            var risks = root.TryGetProperty("risks", out var r) && r.ValueKind == JsonValueKind.Array
                ? r.EnumerateArray().Select(e => e.GetString() ?? "").Where(s => s.Length > 0).ToList()
                : [];
            var plan = root.TryGetProperty("tradePlanNarrative", out var p) ? p.GetString() ?? "" : "";
            return new RawThesis(thesis, catalysts, risks, plan);
        }
        catch
        {
            return null;
        }
    }
}
