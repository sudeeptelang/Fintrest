using System.Text.Json;
using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Portfolio;

/// <summary>
/// Claude-powered financial AI advisor.
/// Takes structured portfolio data + signal scores + market context
/// and generates deep, explainable financial analysis.
///
/// AI is used ONLY as an interpretation layer — never to originate
/// trade ideas or make autonomous decisions.
/// </summary>
public class ClaudeFinancialAdvisor(
    AppDbContext db,
    IConfiguration config,
    ILogger<ClaudeFinancialAdvisor> logger)
{
    private readonly string _apiKey = config["AI:Anthropic:ApiKey"] ?? "";
    private readonly string _model = config["AI:Anthropic:Model"] ?? "claude-sonnet-4-20250514";

    public record FinancialAnalysis(
        double HealthScore,
        string OverallAssessment,
        List<string> KeyStrengths,
        List<string> KeyRisks,
        List<AnalysisRecommendation> Recommendations,
        string DiversificationAnalysis,
        string RiskAssessment,
        string MarketAlignmentSummary,
        string? TaxOptimizationNotes
    );

    public record AnalysisRecommendation(
        string Type,        // REBALANCE, REDUCE, ADD, TAX_LOSS, ALERT
        string Ticker,
        string Action,      // BUY, SELL, HOLD, REDUCE, INCREASE
        string Reasoning,
        double Confidence    // 0-100
    );

    /// <summary>
    /// Run full AI-powered analysis on a portfolio.
    /// Combines structured data with Claude's financial reasoning.
    /// </summary>
    public async Task<FinancialAnalysis> AnalyzePortfolioAsync(long portfolioId, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            logger.LogWarning("Anthropic API key not configured — returning rule-based analysis");
            return GetFallbackAnalysis(portfolioId);
        }

        // 1. Gather all structured data
        var portfolio = await db.Portfolios
            .Include(p => p.Holdings).ThenInclude(h => h.Stock)
            .FirstOrDefaultAsync(p => p.Id == portfolioId, ct)
            ?? throw new InvalidOperationException("Portfolio not found");

        var holdings = portfolio.Holdings.ToList();
        var totalValue = portfolio.CashBalance + holdings.Sum(h => h.CurrentValue);

        // Get signal scores for all holdings
        var holdingData = new List<object>();
        foreach (var h in holdings)
        {
            var latestSignal = await db.Signals
                .Where(s => s.StockId == h.StockId)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync(ct);

            holdingData.Add(new
            {
                h.Stock.Ticker,
                h.Stock.Name,
                Sector = h.Stock.Sector ?? "Unknown",
                h.Quantity,
                h.AvgCost,
                h.CurrentPrice,
                h.CurrentValue,
                h.UnrealizedPnl,
                h.UnrealizedPnlPct,
                PortfolioWeight = totalValue > 0 ? h.CurrentValue / totalValue * 100 : 0,
                SignalScore = latestSignal?.ScoreTotal,
                SignalType = latestSignal?.SignalType.ToString(),
                RiskLevel = latestSignal?.RiskLevel,
            });
        }

        // Sector allocation
        var sectorAlloc = holdings
            .GroupBy(h => h.Stock.Sector ?? "Unknown")
            .Select(g => new { Sector = g.Key, Weight = totalValue > 0 ? g.Sum(h => h.CurrentValue) / totalValue * 100 : 0 })
            .OrderByDescending(s => s.Weight)
            .ToList();

        // Recent snapshots for trend
        var snapshots = await db.PortfolioSnapshots
            .Where(s => s.PortfolioId == portfolioId)
            .OrderByDescending(s => s.Date)
            .Take(30)
            .ToListAsync(ct);

        // 2. Build Claude prompt
        var prompt = BuildAnalysisPrompt(portfolio, holdingData, sectorAlloc, snapshots, totalValue);

        // 3. Call Claude API
        try
        {
            var client = new AnthropicClient(new APIAuthentication(_apiKey));
            var messages = new List<Message>
            {
                new(RoleType.User, prompt)
            };

            var parameters = new MessageParameters
            {
                Model = _model,
                MaxTokens = 2000,
                Temperature = 0.3m,
                Messages = messages,
            };
            parameters.System = new List<SystemMessage> { new(GetSystemPrompt()) };
            var response = await client.Messages.GetClaudeMessageAsync(parameters, ct);

            var responseText = response.Content?.OfType<TextContent>().FirstOrDefault()?.Text ?? "";

            // 4. Parse response
            var analysis = ParseAnalysisResponse(responseText, totalValue, holdings);

            // 5. Persist recommendations
            foreach (var rec in analysis.Recommendations)
            {
                var stock = await db.Stocks
                    .FirstOrDefaultAsync(s => s.Ticker == rec.Ticker, ct);

                db.PortfolioAiRecommendations.Add(new PortfolioAiRecommendation
                {
                    PortfolioId = portfolioId,
                    StockId = stock?.Id,
                    Type = rec.Type,
                    Ticker = rec.Ticker,
                    Action = rec.Action,
                    Reasoning = rec.Reasoning,
                    Confidence = rec.Confidence,
                    Status = "PENDING",
                });
            }

            // Log the LLM trace
            db.LlmTraceLogs.Add(new LlmTraceLog
            {
                SignalId = null,
                ExplanationType = "portfolio_analysis",
                Model = _model,
                PromptHash = ComputeHash(prompt),
                OutputHash = ComputeHash(responseText),
                InputTokens = response.Usage?.InputTokens ?? 0,
                OutputTokens = response.Usage?.OutputTokens ?? 0,
            });

            await db.SaveChangesAsync(ct);

            logger.LogInformation(
                "Claude analysis complete for portfolio {Id}: health={Score}, recommendations={Count}",
                portfolioId, analysis.HealthScore, analysis.Recommendations.Count);

            return analysis;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Claude API call failed for portfolio {Id}", portfolioId);
            return GetFallbackAnalysis(portfolioId);
        }
    }

    private string GetSystemPrompt() => """
        You are Fintrest.ai's financial portfolio advisor. You analyze stock portfolios
        and provide data-driven, explainable recommendations.

        RULES:
        - You are an interpretation layer — you explain data, you do NOT originate trade ideas
        - All recommendations must reference specific data points (scores, allocations, metrics)
        - Use professional but accessible language
        - Always include risk disclaimers
        - Never say "guaranteed" or "will definitely"
        - Focus on risk management, diversification, and signal alignment

        OUTPUT FORMAT (JSON):
        {
            "healthScore": 0-100,
            "overallAssessment": "2-3 sentence summary",
            "keyStrengths": ["strength1", "strength2"],
            "keyRisks": ["risk1", "risk2"],
            "recommendations": [
                {
                    "type": "REBALANCE|REDUCE|ADD|TAX_LOSS|ALERT",
                    "ticker": "AAPL",
                    "action": "BUY|SELL|HOLD|REDUCE|INCREASE",
                    "reasoning": "explanation with data",
                    "confidence": 0-100
                }
            ],
            "diversificationAnalysis": "analysis of sector/stock concentration",
            "riskAssessment": "volatility, drawdown risk, correlation concerns",
            "marketAlignmentSummary": "how holdings align with current signal scores",
            "taxOptimizationNotes": "tax-loss harvesting opportunities if any"
        }

        Return ONLY valid JSON. No markdown, no code blocks, no extra text.
        """;

    private string BuildAnalysisPrompt(
        Models.Portfolio portfolio,
        List<object> holdings,
        object sectorAlloc,
        List<PortfolioSnapshot> snapshots,
        double totalValue)
    {
        var recentReturn = snapshots.Count >= 2
            ? snapshots.First().CumulativeReturnPct
            : 0;

        return $"""
            Analyze this portfolio and provide recommendations:

            PORTFOLIO OVERVIEW:
            - Name: {portfolio.Name}
            - Strategy: {portfolio.Strategy ?? "Not specified"}
            - Total Value: ${totalValue:N2}
            - Cash Balance: ${portfolio.CashBalance:N2} ({(totalValue > 0 ? portfolio.CashBalance / totalValue * 100 : 0):F1}% of portfolio)
            - Number of Holdings: {holdings.Count}
            - Recent Cumulative Return: {recentReturn:F2}%

            HOLDINGS (with Fintrest signal scores):
            {JsonSerializer.Serialize(holdings, new JsonSerializerOptions { WriteIndented = true })}

            SECTOR ALLOCATION:
            {JsonSerializer.Serialize(sectorAlloc, new JsonSerializerOptions { WriteIndented = true })}

            SIGNAL SCORE KEY:
            - 80-100: BUY_TODAY (strong buy signal)
            - 60-79: WATCH (monitor, potential entry)
            - 40-59: HIGH_RISK (caution, elevated risk)
            - 0-39: AVOID (negative signals)

            Provide your analysis as JSON following the system prompt format.
            Focus on:
            1. Is this portfolio well-diversified?
            2. Are holdings aligned with current signal scores?
            3. Any concentration risks (single stock >15%, single sector >30%)?
            4. Tax-loss harvesting opportunities (unrealized losses >5%)?
            5. What should the user do next?
            """;
    }

    private FinancialAnalysis ParseAnalysisResponse(string response, double totalValue, List<PortfolioHolding> holdings)
    {
        try
        {
            // Try to extract JSON from response
            var jsonStart = response.IndexOf('{');
            var jsonEnd = response.LastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var jsonStr = response[jsonStart..(jsonEnd + 1)];
                var parsed = JsonSerializer.Deserialize<JsonElement>(jsonStr);

                return new FinancialAnalysis(
                    HealthScore: parsed.TryGetProperty("healthScore", out var hs) ? hs.GetDouble() : 50,
                    OverallAssessment: parsed.TryGetProperty("overallAssessment", out var oa) ? oa.GetString() ?? "" : "",
                    KeyStrengths: ParseStringArray(parsed, "keyStrengths"),
                    KeyRisks: ParseStringArray(parsed, "keyRisks"),
                    Recommendations: ParseRecommendations(parsed),
                    DiversificationAnalysis: parsed.TryGetProperty("diversificationAnalysis", out var da) ? da.GetString() ?? "" : "",
                    RiskAssessment: parsed.TryGetProperty("riskAssessment", out var ra) ? ra.GetString() ?? "" : "",
                    MarketAlignmentSummary: parsed.TryGetProperty("marketAlignmentSummary", out var ma) ? ma.GetString() ?? "" : "",
                    TaxOptimizationNotes: parsed.TryGetProperty("taxOptimizationNotes", out var tn) ? tn.GetString() : null
                );
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to parse Claude response as JSON");
        }

        // Fallback: return the raw text as assessment
        return new FinancialAnalysis(
            HealthScore: 50,
            OverallAssessment: response.Length > 500 ? response[..500] : response,
            KeyStrengths: [],
            KeyRisks: [],
            Recommendations: [],
            DiversificationAnalysis: "",
            RiskAssessment: "",
            MarketAlignmentSummary: "",
            TaxOptimizationNotes: null
        );
    }

    private static List<string> ParseStringArray(JsonElement el, string prop)
    {
        if (!el.TryGetProperty(prop, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return [];
        return arr.EnumerateArray().Select(x => x.GetString() ?? "").Where(s => s.Length > 0).ToList();
    }

    private static List<AnalysisRecommendation> ParseRecommendations(JsonElement el)
    {
        if (!el.TryGetProperty("recommendations", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return [];

        return arr.EnumerateArray().Select(r => new AnalysisRecommendation(
            Type: r.TryGetProperty("type", out var t) ? t.GetString() ?? "ALERT" : "ALERT",
            Ticker: r.TryGetProperty("ticker", out var tk) ? tk.GetString() ?? "" : "",
            Action: r.TryGetProperty("action", out var a) ? a.GetString() ?? "HOLD" : "HOLD",
            Reasoning: r.TryGetProperty("reasoning", out var re) ? re.GetString() ?? "" : "",
            Confidence: r.TryGetProperty("confidence", out var c) ? c.GetDouble() : 50
        )).ToList();
    }

    private FinancialAnalysis GetFallbackAnalysis(long portfolioId)
    {
        return new FinancialAnalysis(
            HealthScore: 50,
            OverallAssessment: "AI analysis unavailable. Configure your Anthropic API key in appsettings to enable deep portfolio analysis. Rule-based analysis is available via the /advisor endpoint.",
            KeyStrengths: ["Portfolio created and tracked"],
            KeyRisks: ["AI analysis not configured — using rule-based scoring only"],
            Recommendations: [],
            DiversificationAnalysis: "Run /advisor endpoint for rule-based diversification check.",
            RiskAssessment: "Run /analytics endpoint for quantitative risk metrics.",
            MarketAlignmentSummary: "Run /advisor endpoint for signal alignment check.",
            TaxOptimizationNotes: null
        );
    }

    private static string ComputeHash(string input)
    {
        var bytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes)[..16].ToLower();
    }
}
