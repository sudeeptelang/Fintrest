using Fintrest.Api.Services.Indicators;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Two-pass stock scorer:
///
///   1) <see cref="ScoreFactors"/> — produces a raw ScoreBreakdown (0-100 per factor, no Total)
///      for a single stock. Called for every stock in the universe.
///
///   2) <see cref="Finalize"/> — given a final (percentile-ranked + regime-tilted) breakdown,
///      computes Total via regime-conditional weights, classifies via configured thresholds,
///      and produces trade zones + explanation for publishable signals.
///
/// Splitting the two steps lets <c>ScanOrchestrator</c> percentile-rank factor scores across
/// the whole universe between pass 1 and pass 2 — so a "90 Momentum" means top-decile among
/// today's ~500 names, not an absolute raw ROC value.
/// </summary>
public static class StockScorer
{
    public record FactorResult(
        ScoringEngineV2.ScoreBreakdown Breakdown,
        Dictionary<string, object?> Provenance,
        double? AvgDailyVolume30d);

    /// <summary>Pass 1: compute raw factor scores for a stock.</summary>
    public static FactorResult ScoreFactors(StockSnapshot snap)
    {
        var closes = snap.ClosePrices;
        var highs = snap.HighPrices;
        var lows = snap.LowPrices;

        var ma20 = TechnicalIndicators.SMA(closes, 20);
        var ma50 = TechnicalIndicators.SMA(closes, 50);
        var ma200 = TechnicalIndicators.SMA(closes, 200);
        var rsi = TechnicalIndicators.RSI(closes);
        var adx = TechnicalIndicators.ADX(highs, lows, closes);
        var atrPct = TechnicalIndicators.ATRPercent(highs, lows, closes);
        var trendDir = TechnicalIndicators.TrendDirection(snap.Price, ma20, ma50, ma200);

        var avgVolume30D = snap.VolumeSeries.Count >= 30
            ? snap.VolumeSeries.TakeLast(30).Average(v => (double)v)
            : snap.VolumeSeries.Count > 0
                ? snap.VolumeSeries.Average(v => (double)v)
                : (double?)null;

        var breakdown = ScoringEngineV2.Compute(
            closes: closes,
            highs: highs,
            lows: lows,
            volumes: snap.VolumeSeries,
            price: snap.Price,
            currentVolume: snap.Volume,
            ma20: ma20, ma50: ma50, ma200: ma200,
            rsi: rsi, adx: adx, atrPct: atrPct,
            trendDirection: trendDir,
            avgSentiment: snap.NewsSentiment,
            hasCatalyst: snap.HasCatalyst,
            catalystType: snap.CatalystType,
            newsCount: snap.NewsCount,
            peRatio: snap.PeRatio,
            pegRatio: snap.PegRatio,
            roe: snap.ReturnOnEquity,
            roa: snap.ReturnOnAssets,
            operatingMargin: snap.OperatingMargin,
            grossMargin: snap.GrossMargin,
            debtToEquity: snap.DebtToEquity,
            revenueGrowth: snap.RevenueGrowth,
            epsGrowth: snap.EpsGrowth,
            analystRating: snap.AnalystRating,
            analystCount: snap.AnalystCount,
            analystTargetPrice: snap.AnalystTargetPrice,
            insiderBuying: snap.InsiderBuying,
            insiderBuyCount: snap.InsiderBuyCount,
            insiderSellCount: snap.InsiderSellCount,
            beta: snap.Beta,
            avgDailyVolume: avgVolume30D,
            floatShares: snap.FloatShares,
            nextEarningsDate: snap.NextEarningsDate,
            lastEpsSurprise: snap.LastEpsSurprise,
            spyTrendDirection: snap.SpyTrendDirection,
            // Regime tilt is NOT applied here — it happens post-ranking in the orchestrator
            // so percentile ranks are computed on pure factor scores.
            regime: MarketRegime.Neutral,
            sector: null,
            stockReturn5d: null);

        var provenance = new Dictionary<string, object?>
        {
            ["engine"] = "v2",
            ["price"] = snap.Price,
            ["ma20"] = ma20, ["ma50"] = ma50, ["ma200"] = ma200,
            ["rsi14"] = rsi, ["adx14"] = adx, ["atr_pct"] = atrPct,
            ["trend_direction"] = trendDir,
            ["volume"] = snap.Volume, ["avg_volume_30d"] = avgVolume30D,
            ["news_sentiment"] = snap.NewsSentiment,
            ["has_catalyst"] = snap.HasCatalyst,
            ["catalyst_type"] = snap.CatalystType,
            ["news_count"] = snap.NewsCount,
            ["pe_ratio"] = snap.PeRatio, ["peg_ratio"] = snap.PegRatio,
            ["roe"] = snap.ReturnOnEquity, ["roa"] = snap.ReturnOnAssets,
            ["beta"] = snap.Beta,
            ["analyst_rating"] = snap.AnalystRating,
            ["analyst_count"] = snap.AnalystCount,
            ["insider_buying"] = snap.InsiderBuying,
            ["insider_buy_count"] = snap.InsiderBuyCount,
            ["insider_sell_count"] = snap.InsiderSellCount,
            ["next_earnings"] = snap.NextEarningsDate,
            ["spy_trend"] = snap.SpyTrendDirection,
            ["close_count"] = snap.ClosePrices.Count,
            ["stock_return_5d"] = snap.StockReturn5d,
        };

        return new FactorResult(breakdown, provenance, avgVolume30D);
    }

    /// <summary>
    /// Pass 2: produce the final ScoredSignal given a ranked + tilted breakdown,
    /// regime-conditional weights, and configured thresholds.
    /// </summary>
    public static ScoredSignal Finalize(
        StockSnapshot snap,
        ScoringEngineV2.ScoreBreakdown finalBreakdown,
        Dictionary<string, object?> provenance,
        ScoringOptions options,
        MarketRegime regime,
        bool hasSmartMoneyData = true)
    {
        var weights = options.RegimeWeights.Pick(regime, options.Weights);
        // When the ticker has no real smart-money sub-signals (no insider
        // transactions on file, no short-interest snapshot), the SmartMoney
        // factor was filled with neutral 50 → percentile-ranked to ~50 →
        // would contribute weight×50 to the composite. That systematically
        // compressed scores for the no-data majority. Solution: drop
        // SmartMoney from the weighted sum AND re-normalize the other 7
        // factors to sum to 100% so the composite stays on the same 0-100
        // scale as tickers that do have data. Tickers WITH real data get
        // the full 8-factor formula unchanged.
        double total;
        if (hasSmartMoneyData)
        {
            total = weights.Apply(finalBreakdown);
        }
        else
        {
            var smContribution = finalBreakdown.SmartMoney * weights.SmartMoney;
            var totalWithSm = weights.Apply(finalBreakdown);
            var remainingWeight = 1.0 - weights.SmartMoney;
            // Guard against degenerate config where SmartMoney = 100% would
            // leave nothing to renormalize against. Falls back to neutral 50.
            total = remainingWeight > 0.01
                ? (totalWithSm - smContribution) / remainingWeight
                : 50.0;
        }
        var signalType = options.Thresholds.Classify(total);

        var classified = finalBreakdown with { Total = total, SignalType = signalType };

        TradeZoneCalculator.TradeZone? zone = null;
        if (signalType is "BUY_TODAY" or "WATCH")
        {
            zone = TradeZoneCalculator.Calculate(snap);
            zone = TradeZoneCalculator.AdjustForConviction(zone, total);
        }

        var explanation = ExplanationGenerator.Generate(
            snap.Ticker, snap.Name, classified, snap, zone);

        var riskLevel = classified.Risk switch
        {
            >= 70 => "LOW",
            >= 40 => "MEDIUM",
            _ => "HIGH"
        };

        provenance["weights_regime"] = regime.SpyTrendDirection switch
        {
            1 => "bull",
            -1 => "bear",
            _ => "neutral"
        };
        provenance["regime_spy_1d"] = regime.SpyReturn1d;
        provenance["regime_spy_5d"] = regime.SpyReturn5d;
        provenance["regime_vix"] = regime.VixLevel;
        provenance["sector_rs_5d"] = snap.Sector is not null
            && regime.SectorReturns5d.TryGetValue(snap.Sector, out var sr)
                ? sr
                : (double?)null;

        return new ScoredSignal
        {
            StockId = snap.StockId,
            Ticker = snap.Ticker,
            Name = snap.Name,
            Breakdown = classified,
            EntryLow = zone?.EntryLow,
            EntryHigh = zone?.EntryHigh,
            StopLoss = zone?.StopLoss,
            TargetLow = zone?.TargetLow,
            TargetHigh = zone?.TargetHigh,
            RiskRewardRatio = zone?.RiskRewardRatio,
            RiskLevel = riskLevel,
            HorizonDays = DetermineHorizon(classified, snap),
            Explanation = explanation,
            Provenance = provenance,
        };
    }

    private static int DetermineHorizon(ScoringEngineV2.ScoreBreakdown breakdown, StockSnapshot snap)
    {
        if (breakdown.Momentum >= 80 && breakdown.Volume >= 70) return 3;
        if (breakdown.Catalyst >= 75 && snap.HasCatalyst) return 5;
        if (breakdown.Momentum >= 60 && breakdown.Trend >= 60) return 10;
        if (breakdown.Fundamental >= 70) return 21;
        if (breakdown.Momentum < 50 && breakdown.Fundamental >= 60) return 45;
        return 7;
    }
}
