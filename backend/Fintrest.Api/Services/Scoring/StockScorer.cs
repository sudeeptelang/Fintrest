using Fintrest.Api.Services.Indicators;
using static Fintrest.Api.Services.ScoringEngine;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Scores a single stock from its snapshot.
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
        var roc10 = TechnicalIndicators.ROC(closes, 10);
        var trendDir = TechnicalIndicators.TrendDirection(snap.Price, ma20, ma50, ma200);

        // Volume average (30-day)
        var avgVolume30D = snap.VolumeSeries.Count >= 30
            ? snap.VolumeSeries.TakeLast(30).Average(v => (double)v)
            : snap.VolumeSeries.Count > 0
                ? snap.VolumeSeries.Average(v => (double)v)
                : (double?)null;

        // 2. Run 7-factor scoring engine
        var breakdown = ScoringEngine.Compute(
            price: snap.Price,
            ma20: ma20,
            ma50: ma50,
            ma200: ma200,
            roc10: roc10,
            currentVolume: snap.Volume,
            avgVolume30D: avgVolume30D,
            sentimentScore: snap.NewsSentiment,
            hasCatalyst: snap.HasCatalyst,
            revenueGrowth: snap.RevenueGrowth,
            epsSurprise: snap.EpsSurprise,
            grossMargin: snap.GrossMargin,
            socialScore: snap.SocialScore,
            analystRating: snap.AnalystRating,
            insiderBuying: snap.InsiderBuying,
            adx: adx,
            trendDirection: trendDir,
            atrPct: atrPct,
            avgDailyVolume: avgVolume30D,
            floatShares: snap.FloatShares
        );

        // 3. Calculate trade zones (only for actionable signals)
        TradeZoneCalculator.TradeZone? zone = null;
        if (breakdown.SignalType is "BuyToday" or "Watch")
        {
            zone = TradeZoneCalculator.Calculate(snap);
            zone = TradeZoneCalculator.AdjustForConviction(zone, breakdown.Total);
        }

        // 4. Generate explanation
        var explanation = ExplanationGenerator.Generate(
            snap.Ticker, snap.Name, breakdown, snap, zone);

        // 5. Build provenance (audit trail of what data was used)
        var provenance = new Dictionary<string, object?>
        {
            ["price"] = snap.Price,
            ["ma20"] = ma20,
            ["ma50"] = ma50,
            ["ma200"] = ma200,
            ["rsi14"] = rsi,
            ["adx14"] = adx,
            ["atr_pct"] = atrPct,
            ["roc10"] = roc10,
            ["volume"] = snap.Volume,
            ["avg_volume_30d"] = avgVolume30D,
            ["trend_direction"] = trendDir,
            ["news_sentiment"] = snap.NewsSentiment,
            ["has_catalyst"] = snap.HasCatalyst,
            ["catalyst_type"] = snap.CatalystType,
            ["revenue_growth"] = snap.RevenueGrowth,
            ["eps_surprise"] = snap.EpsSurprise,
            ["gross_margin"] = snap.GrossMargin,
            ["social_score"] = snap.SocialScore,
            ["analyst_rating"] = snap.AnalystRating,
            ["insider_buying"] = snap.InsiderBuying,
            ["float_shares"] = snap.FloatShares,
            ["close_count"] = snap.ClosePrices.Count,
        };

        return new ScoredSignal
        {
            StockId = snap.StockId,
            Ticker = snap.Ticker,
            Name = snap.Name,
            Breakdown = breakdown,
            EntryPrice = zone?.Entry,
            StopPrice = zone?.StopLoss,
            TargetPrice = zone?.Target,
            RiskRewardRatio = zone?.RiskRewardRatio,
            Explanation = explanation,
            Provenance = provenance,
        };
    }
}
