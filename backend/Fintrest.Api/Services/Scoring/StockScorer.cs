using Fintrest.Api.Services.Indicators;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Scores a single stock from its snapshot using the V2 scoring engine.
/// Pure function: snapshot in, scored signal out. No DB access.
/// </summary>
public static class StockScorer
{
    public static ScoredSignal Score(StockSnapshot snap)
    {
        // 1. Compute technical indicators from price series
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

        // Volume average (30-day)
        var avgVolume30D = snap.VolumeSeries.Count >= 30
            ? snap.VolumeSeries.TakeLast(30).Average(v => (double)v)
            : snap.VolumeSeries.Count > 0
                ? snap.VolumeSeries.Average(v => (double)v)
                : (double?)null;

        // 2. Run V2 scoring engine with all available data
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
            spyTrendDirection: snap.SpyTrendDirection
        );

        // 3. Calculate trade zones (only for actionable signals)
        TradeZoneCalculator.TradeZone? zone = null;
        if (breakdown.SignalType is "BUY_TODAY" or "WATCH")
        {
            zone = TradeZoneCalculator.Calculate(snap);
            zone = TradeZoneCalculator.AdjustForConviction(zone, breakdown.Total);
        }

        // 4. Generate explanation
        var explanation = ExplanationGenerator.Generate(
            snap.Ticker, snap.Name, breakdown, snap, zone);

        // 5. Determine risk level from score
        var riskLevel = breakdown.Risk switch
        {
            >= 70 => "LOW",
            >= 40 => "MEDIUM",
            _ => "HIGH"
        };

        // 6. Build provenance
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
        };

        return new ScoredSignal
        {
            StockId = snap.StockId,
            Ticker = snap.Ticker,
            Name = snap.Name,
            Breakdown = breakdown,
            EntryLow = zone?.EntryLow,
            EntryHigh = zone?.EntryHigh,
            StopLoss = zone?.StopLoss,
            TargetLow = zone?.TargetLow,
            TargetHigh = zone?.TargetHigh,
            RiskRewardRatio = zone?.RiskRewardRatio,
            RiskLevel = riskLevel,
            HorizonDays = DetermineHorizon(breakdown, snap),
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
