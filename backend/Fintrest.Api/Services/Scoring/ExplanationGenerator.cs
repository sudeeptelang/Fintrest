using static Fintrest.Api.Services.ScoringEngine;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Generates plain-English explanations from structured score data.
/// AI is used only as an interpretation layer — not to originate ideas.
/// </summary>
public static class ExplanationGenerator
{
    public static SignalExplanation Generate(
        string ticker,
        string name,
        ScoreBreakdown breakdown,
        StockSnapshot snap,
        TradeZoneCalculator.TradeZone? zone)
    {
        var bullish = new List<string>();
        var bearish = new List<string>();

        // Momentum
        if (breakdown.Momentum >= 80)
            bullish.Add($"Strong momentum — price is trading well above key moving averages with accelerating rate of change.");
        else if (breakdown.Momentum >= 60)
            bullish.Add("Moderate momentum — price is above most moving averages.");
        else if (breakdown.Momentum < 40)
            bearish.Add("Weak momentum — price is below key moving averages, suggesting downward pressure.");

        // Volume
        if (breakdown.Volume >= 80)
            bullish.Add("Volume is significantly above the 30-day average, confirming institutional interest.");
        else if (breakdown.Volume >= 60)
            bullish.Add("Relative volume is above average, showing healthy participation.");
        else if (breakdown.Volume < 40)
            bearish.Add("Volume is below average — low conviction in the current move.");

        // Catalyst
        if (breakdown.Catalyst >= 75)
        {
            var catalystDesc = snap.CatalystType switch
            {
                "earnings" => "a strong earnings catalyst",
                "upgrade" => "a recent analyst upgrade",
                "product" => "a positive product announcement",
                "regulatory" => "favorable regulatory news",
                _ => "a positive news catalyst"
            };
            bullish.Add($"News sentiment is strongly positive with {catalystDesc}.");
        }
        else if (breakdown.Catalyst < 40)
            bearish.Add("No significant positive catalysts detected. News sentiment is neutral or negative.");

        // Fundamentals
        if (breakdown.Fundamental >= 75)
        {
            var parts = new List<string>();
            if (snap.RevenueGrowth is > 20) parts.Add($"revenue growth of {snap.RevenueGrowth:F0}%");
            if (snap.EpsSurprise is > 5) parts.Add($"EPS beat by {snap.EpsSurprise:F0}%");
            if (snap.GrossMargin is > 50) parts.Add($"healthy {snap.GrossMargin:F0}% gross margins");
            bullish.Add($"Solid fundamentals — {(parts.Count > 0 ? string.Join(", ", parts) : "strong overall quality")}.");
        }
        else if (breakdown.Fundamental < 40)
            bearish.Add("Fundamentals are weak — declining growth or missed earnings expectations.");

        // Sentiment
        if (breakdown.Sentiment >= 70)
            bullish.Add("Broad positive sentiment from social, analyst, and/or insider activity.");
        else if (breakdown.Sentiment < 35)
            bearish.Add("Market sentiment is cautious — limited social buzz, neutral analyst views.");

        // Trend
        if (breakdown.Trend >= 75)
            bullish.Add("ADX confirms a strong established trend with clear directional conviction.");
        else if (breakdown.Trend < 35)
            bearish.Add("Trend strength is weak (low ADX). The stock is range-bound or choppy.");

        // Risk
        if (breakdown.Risk >= 70)
            bullish.Add("Favorable risk profile — adequate liquidity and manageable volatility.");
        else if (breakdown.Risk < 40)
            bearish.Add("Elevated risk — high volatility, low liquidity, or small float increases position risk.");

        // Build summary
        var summary = BuildSummary(ticker, name, breakdown, bullish.Count, bearish.Count);

        // Trade zone narrative
        var tradeNarrative = zone is not null
            ? $"Entry near ${zone.Entry:F2} with a stop-loss at ${zone.StopLoss:F2} " +
              $"(ATR-based, {zone.RiskRewardRatio:F1}:1 risk-reward). Target ${zone.Target:F2}."
            : "Trade zone not available — insufficient price history for ATR calculation.";

        return new SignalExplanation
        {
            Summary = summary,
            BullishFactors = bullish,
            BearishFactors = bearish,
            TradeZoneNarrative = tradeNarrative,
        };
    }

    private static string BuildSummary(
        string ticker, string name, ScoreBreakdown breakdown,
        int bullCount, int bearCount)
    {
        var rank = breakdown.Total switch
        {
            >= 90 => "top 3%",
            >= 80 => "top 10%",
            >= 70 => "top 25%",
            >= 60 => "upper half",
            _ => "lower half"
        };

        var signalWord = breakdown.SignalType switch
        {
            "BuyToday" => "a strong buy signal",
            "Watch" => "a watchlist candidate",
            "HighRisk" => "a high-risk setup",
            "Avoid" => "an avoid signal",
            _ => "a signal"
        };

        // Identify the strongest factor
        var factors = new Dictionary<string, double>
        {
            ["momentum"] = breakdown.Momentum,
            ["relative volume"] = breakdown.Volume,
            ["news catalyst"] = breakdown.Catalyst,
            ["fundamentals"] = breakdown.Fundamental,
            ["sentiment"] = breakdown.Sentiment,
            ["trend strength"] = breakdown.Trend,
        };
        var topFactor = factors.MaxBy(f => f.Value).Key;

        return $"{ticker} ({name}) ranks in the {rank} of all scanned stocks today " +
               $"with a composite score of {breakdown.Total:F0}/100 — {signalWord}. " +
               $"The primary driver is {topFactor}. " +
               $"{bullCount} bullish factor{(bullCount != 1 ? "s" : "")} vs " +
               $"{bearCount} bearish.";
    }
}
