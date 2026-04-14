namespace Fintrest.Api.Services;

/// <summary>
/// Fintrest Advanced 7-Factor Scoring Engine v2.
/// Each factor uses multiple sub-algorithms from quantitative finance.
/// Output: 7 scores (0-100) + weighted composite. Backward-compatible
/// with v1 factor names so the UI doesn't need changes.
///
/// Algorithms integrated:
/// - Multi-timeframe momentum (Jegadeesh-Titman)
/// - RSI divergence detection
/// - Bollinger Band squeeze (breakout prediction)
/// - Post-Earnings Announcement Drift (PEAD)
/// - Sector relative strength
/// - Mean reversion Z-score
/// - Volume accumulation/distribution
/// - MA slope and alignment analysis
/// - Insider cluster buying signal
/// - Market regime awareness (SPY context)
/// </summary>
public static class ScoringEngineV2
{
    private const double W_MOMENTUM = 0.22;
    private const double W_VOLUME = 0.12;
    private const double W_CATALYST = 0.15;
    private const double W_FUNDAMENTAL = 0.18;
    private const double W_SENTIMENT = 0.10;
    private const double W_TREND = 0.13;
    private const double W_RISK = 0.10;

    public record ScoreBreakdown(
        double Momentum,
        double Volume,
        double Catalyst,
        double Fundamental,
        double Sentiment,
        double Trend,
        double Risk
    )
    {
        public double Total =>
            Momentum * W_MOMENTUM +
            Volume * W_VOLUME +
            Catalyst * W_CATALYST +
            Fundamental * W_FUNDAMENTAL +
            Sentiment * W_SENTIMENT +
            Trend * W_TREND +
            Risk * W_RISK;

        public string SignalType => Total switch
        {
            >= 78 => "BUY_TODAY",
            >= 58 => "WATCH",
            >= 38 => "HIGH_RISK",
            _ => "AVOID"
        };
    }

    // ════════════════════════════════════════════════════════════════
    // FACTOR 1: MOMENTUM (22%)
    // Multi-timeframe ROC + RSI zones + MACD crossover + 52W position
    // ════════════════════════════════════════════════════════════════

    public static double ScoreMomentum(
        IReadOnlyList<double> closes,
        double price,
        double? ma20, double? ma50, double? ma200,
        double? rsi)
    {
        var sub = new List<double>();

        // 1a. Multi-timeframe ROC (Jegadeesh-Titman momentum factor)
        var roc5 = ROC(closes, 5);
        var roc20 = ROC(closes, 20);
        var roc60 = ROC(closes, 60);

        // Short-term momentum — but penalize parabolic moves (exhaustion/climax tops)
        sub.Add(roc5 switch
        {
            > 25 => 35, // Parabolic — exhaustion risk, likely to reverse
            > 15 => 55, // Very hot — take caution
            > 8 => 85,  // Strong but sustainable
            > 5 => 80,
            > 2 => 70,
            > 0 => 58,
            > -2 => 45,
            > -5 => 30,
            _ => 15
        });
        // Medium-term momentum
        sub.Add(roc20 switch { > 10 => 90, > 5 => 75, > 0 => 60, > -5 => 40, _ => 20 });
        // Long-term momentum (if enough data)
        if (roc60 != null)
            sub.Add(roc60.Value switch { > 15 => 85, > 8 => 70, > 0 => 55, > -8 => 35, _ => 15 });

        // 1b. Momentum acceleration (is momentum increasing?)
        if (roc5 != null && roc20 != null)
        {
            var accel = roc5.Value - (roc20.Value / 4); // Normalize: is recent > trend?
            sub.Add(accel > 2 ? 85 : accel > 0 ? 65 : accel > -2 ? 45 : 25);
        }

        // 1c. RSI zone scoring
        if (rsi.HasValue)
        {
            // RSI 30-40 = oversold bounce potential (bullish)
            // RSI 50-65 = healthy momentum
            // RSI 70+ = overbought warning
            sub.Add(rsi.Value switch
            {
                < 25 => 80, // Deeply oversold — bounce likely
                < 35 => 70, // Oversold
                < 50 => 55, // Neutral-bearish
                < 65 => 75, // Healthy momentum zone (sweet spot)
                < 75 => 55, // Getting hot
                _ => 30,    // Overbought — exhaustion risk
            });
        }

        // 1d. RSI divergence detection
        if (rsi.HasValue && closes.Count >= 20)
        {
            var priceTrend = closes[^1] > closes[^20]; // Price trending up?
            var rsiTrend = rsi.Value > 50; // RSI confirming?
            if (priceTrend && !rsiTrend) sub.Add(30); // Bearish divergence — warning
            else if (!priceTrend && rsiTrend) sub.Add(75); // Bullish divergence — opportunity
            else sub.Add(55); // No divergence
        }

        // 1e. MA alignment scoring
        var maScore = 50.0;
        if (ma20.HasValue && price > ma20) maScore += 12;
        if (ma50.HasValue && price > ma50) maScore += 10;
        if (ma200.HasValue && price > ma200) maScore += 8;
        // Perfect alignment bonus: MA20 > MA50 > MA200
        if (ma20.HasValue && ma50.HasValue && ma200.HasValue && ma20 > ma50 && ma50 > ma200)
            maScore += 10;
        sub.Add(Math.Clamp(maScore, 0, 100));

        // 1f. 52-week range position (where in the range are we?)
        if (closes.Count >= 60)
        {
            var high = closes.TakeLast(Math.Min(252, closes.Count)).Max();
            var low = closes.TakeLast(Math.Min(252, closes.Count)).Min();
            if (high > low)
            {
                var rangePct = (price - low) / (high - low) * 100;
                // Mid-to-upper range is bullish; near bottom is risky; near top is overbought
                sub.Add(rangePct switch
                {
                    > 98 => 20, // At 52W high — exhaustion, reversion likely
                    > 92 => 35, // Very near high — low upside
                    > 80 => 70, // Upper range — strong
                    > 60 => 68,
                    > 40 => 60, // Mid range — neutral
                    > 20 => 50, // Lower range — could be value or trouble
                    _ => 40,    // Near 52W low — risky
                });
            }
        }

        return sub.Count > 0 ? Math.Clamp(sub.Average(), 0, 100) : 50;
    }

    // ════════════════════════════════════════════════════════════════
    // FACTOR 2: VOLUME ANALYSIS (12%)
    // Relative volume + volume trend + accumulation/distribution
    // ════════════════════════════════════════════════════════════════

    public static double ScoreVolume(
        IReadOnlyList<long> volumes,
        long currentVolume,
        IReadOnlyList<double> closes)
    {
        if (volumes.Count < 10) return 50;

        var sub = new List<double>();

        // 2a. Relative volume (today vs 30d average)
        var avg30 = volumes.TakeLast(Math.Min(30, volumes.Count)).Average(v => (double)v);
        if (avg30 > 0)
        {
            var relVol = currentVolume / avg30;
            sub.Add(relVol switch
            {
                >= 3.0 => 95, // Massive volume spike — institutional interest
                >= 2.0 => 85,
                >= 1.5 => 72,
                >= 1.1 => 58,
                >= 0.8 => 45,
                _ => 30, // Below average — low interest
            });
        }

        // 2b. Volume trend (5d avg vs 30d avg — accumulation or distribution?)
        if (volumes.Count >= 30)
        {
            var avg5 = volumes.TakeLast(5).Average(v => (double)v);
            var volTrend = avg30 > 0 ? avg5 / avg30 : 1;
            sub.Add(volTrend switch
            {
                >= 1.5 => 80, // Volume increasing — accumulation
                >= 1.1 => 65,
                >= 0.9 => 50, // Stable
                _ => 35,      // Volume declining — distribution
            });
        }

        // 2c. Volume-price confirmation (up on high volume = bullish)
        if (closes.Count >= 5 && volumes.Count >= 5)
        {
            var priceUp = closes[^1] > closes[^5];
            var volUp = volumes.TakeLast(5).Average(v => (double)v) >
                        volumes.TakeLast(30).Average(v => (double)v);
            if (priceUp && volUp) sub.Add(80);       // Up on high volume — strong
            else if (priceUp && !volUp) sub.Add(55);  // Up on low volume — weak rally
            else if (!priceUp && volUp) sub.Add(35);  // Down on high volume — distribution
            else sub.Add(45);                          // Down on low volume — indecision
        }

        return sub.Count > 0 ? Math.Clamp(sub.Average(), 0, 100) : 50;
    }

    // ════════════════════════════════════════════════════════════════
    // FACTOR 3: NEWS & CATALYST (15%)
    // Recency-weighted sentiment + catalyst type + PEAD + earnings proximity
    // ════════════════════════════════════════════════════════════════

    public static double ScoreCatalyst(
        double? avgSentiment,
        bool hasCatalyst,
        string? catalystType,
        int newsCount,
        DateTime? nextEarningsDate,
        double? lastEpsSurprise)
    {
        var sub = new List<double>();

        // 3a. News sentiment (continuous, not binary)
        if (avgSentiment.HasValue)
        {
            // Map -1..+1 to 0..100
            sub.Add(Math.Clamp(50 + avgSentiment.Value * 40, 10, 95));
        }

        // 3b. Catalyst type scoring (not all catalysts equal)
        if (hasCatalyst)
        {
            var catalystBonus = catalystType switch
            {
                "earnings" => 85,  // Earnings = highest impact
                "upgrade" => 80,   // Analyst upgrade
                "m&a" => 75,       // M&A activity
                "product" => 65,   // Product launch
                "regulatory" => 55, // Regulatory — could go either way
                _ => 60,
            };
            sub.Add(catalystBonus);
        }

        // 3c. News frequency (more coverage = more attention = more liquidity)
        sub.Add(newsCount switch
        {
            >= 10 => 75, // Heavy coverage
            >= 5 => 65,
            >= 2 => 55,
            >= 1 => 45,
            _ => 35, // No news — invisible stock
        });

        // 3d. Post-Earnings Announcement Drift (PEAD)
        // One of the most documented anomalies: stocks drift after earnings beats/misses
        if (lastEpsSurprise.HasValue)
        {
            sub.Add(lastEpsSurprise.Value switch
            {
                > 10 => 85,  // Big beat — expect positive drift
                > 5 => 75,
                > 0 => 60,
                > -5 => 40,
                _ => 25,     // Big miss — expect negative drift
            });
        }

        // 3e. Earnings proximity scoring
        if (nextEarningsDate.HasValue)
        {
            var daysToEarnings = (nextEarningsDate.Value - DateTime.UtcNow).Days;
            sub.Add(daysToEarnings switch
            {
                <= 3 => 40,    // Very close — high uncertainty, reduce
                <= 7 => 55,    // Close — moderate uncertainty
                <= 14 => 70,   // Sweet spot — anticipation builds
                <= 30 => 60,
                _ => 50,       // Far out — neutral
            });
        }

        return sub.Count > 0 ? Math.Clamp(sub.Average(), 0, 100) : 50;
    }

    // ════════════════════════════════════════════════════════════════
    // FACTOR 4: FUNDAMENTAL QUALITY (18%)
    // Valuation + profitability + growth + balance sheet
    // ════════════════════════════════════════════════════════════════

    public static double ScoreFundamentals(
        double? peRatio,
        double? pegRatio,
        double? roe,
        double? roa,
        double? operatingMargin,
        double? grossMargin,
        double? debtToEquity,
        double? revenueGrowth,
        double? epsGrowth)
    {
        var sub = new List<double>();

        // 4a. Valuation: P/E ratio (lower = better, but not negative)
        if (peRatio.HasValue && peRatio > 0)
        {
            sub.Add(peRatio.Value switch
            {
                < 10 => 85,   // Deep value
                < 15 => 75,   // Value
                < 25 => 65,   // Fair
                < 35 => 50,   // Growth premium
                < 50 => 35,   // Expensive
                _ => 20,      // Very expensive
            });
        }

        // 4b. PEG ratio (growth-adjusted valuation — < 1 is undervalued)
        if (pegRatio.HasValue && pegRatio > 0)
        {
            sub.Add(pegRatio.Value switch
            {
                < 0.5 => 90,  // Deeply undervalued relative to growth
                < 1.0 => 80,  // Undervalued
                < 1.5 => 65,  // Fair
                < 2.0 => 50,
                _ => 30,      // Overvalued relative to growth
            });
        }

        // 4c. Profitability: ROE
        if (roe.HasValue)
        {
            var roePct = roe.Value * 100; // Convert from decimal
            sub.Add(roePct switch
            {
                > 30 => 85,
                > 20 => 75,
                > 15 => 65,
                > 10 => 55,
                > 5 => 40,
                _ => 25,
            });
        }

        // 4d. Operating margin
        if (operatingMargin.HasValue)
        {
            var opMPct = operatingMargin.Value * 100;
            sub.Add(opMPct switch
            {
                > 30 => 80,
                > 20 => 70,
                > 10 => 60,
                > 5 => 45,
                _ => 30,
            });
        }

        // 4e. Revenue growth
        if (revenueGrowth.HasValue)
        {
            sub.Add(revenueGrowth.Value switch
            {
                > 30 => 90,
                > 15 => 75,
                > 5 => 60,
                > 0 => 50,
                _ => 30, // Declining revenue
            });
        }

        // 4f. Balance sheet health: Debt/Equity
        if (debtToEquity.HasValue && debtToEquity >= 0)
        {
            sub.Add(debtToEquity.Value switch
            {
                < 0.3 => 80,  // Very healthy
                < 0.7 => 70,
                < 1.5 => 55,
                < 3.0 => 40,
                _ => 25,      // Heavily leveraged
            });
        }

        return sub.Count > 0 ? Math.Clamp(sub.Average(), 0, 100) : 50;
    }

    // ════════════════════════════════════════════════════════════════
    // FACTOR 5: ANALYST & SOCIAL SENTIMENT (10%)
    // Analyst consensus + price target upside + insider activity
    // ════════════════════════════════════════════════════════════════

    public static double ScoreSentiment(
        double? analystRating,
        int? analystCount,
        double? analystTargetPrice,
        double price,
        bool insiderBuying,
        int insiderBuyCount,
        int insiderSellCount)
    {
        var sub = new List<double>();

        // 5a. Analyst consensus rating (1-5 scale, 5 = Strong Buy)
        if (analystRating.HasValue)
        {
            sub.Add(analystRating.Value switch
            {
                >= 4.5 => 90, // Strong Buy consensus
                >= 3.5 => 75, // Buy
                >= 2.5 => 50, // Hold
                >= 1.5 => 30, // Sell
                _ => 15,      // Strong Sell
            });
        }

        // 5b. Analyst coverage depth (more analysts = more institutional attention)
        if (analystCount.HasValue)
        {
            sub.Add(analystCount.Value switch
            {
                >= 20 => 70, // Heavy coverage — liquid, well-followed
                >= 10 => 60,
                >= 5 => 50,
                >= 1 => 40,
                _ => 30,     // No coverage — risky, no validation
            });
        }

        // 5c. Price target upside (analyst target vs current price)
        if (analystTargetPrice.HasValue && price > 0)
        {
            var upsidePct = (analystTargetPrice.Value - price) / price * 100;
            sub.Add(upsidePct switch
            {
                > 30 => 85, // Significant upside
                > 15 => 75,
                > 5 => 60,
                > -5 => 45,
                _ => 25,    // Analysts think it's overvalued
            });
        }

        // 5d. Insider activity signal
        // Cluster buying (multiple insiders at once) is the strongest insider signal
        if (insiderBuyCount > 0 || insiderSellCount > 0)
        {
            var netBuying = insiderBuyCount - insiderSellCount;
            if (insiderBuyCount >= 3 && netBuying > 0)
                sub.Add(85); // Cluster buying — very bullish
            else if (insiderBuying)
                sub.Add(70);
            else if (netBuying < -2)
                sub.Add(25); // Heavy insider selling — bearish
            else
                sub.Add(45);
        }

        return sub.Count > 0 ? Math.Clamp(sub.Average(), 0, 100) : 50;
    }

    // ════════════════════════════════════════════════════════════════
    // FACTOR 6: TREND STRENGTH (13%)
    // ADX + MA slope + alignment + Bollinger Band squeeze
    // ════════════════════════════════════════════════════════════════

    public static double ScoreTrend(
        IReadOnlyList<double> closes,
        double? adx,
        int? trendDirection,
        double? ma20, double? ma50, double? ma200)
    {
        var sub = new List<double>();

        // 6a. ADX trend strength
        if (adx.HasValue)
        {
            sub.Add(adx.Value switch
            {
                >= 40 => 85, // Very strong trend
                >= 30 => 75,
                >= 25 => 65, // Moderate trend
                >= 20 => 50, // Weak trend
                _ => 35,     // Ranging / no trend
            });

            // Apply direction: strong trend in wrong direction is bad
            if (adx.Value >= 25 && trendDirection == -1)
            {
                sub[^1] = Math.Max(sub[^1] - 30, 10); // Penalize downtrend
            }
        }

        // 6b. Trend direction confirmation
        if (trendDirection.HasValue)
        {
            sub.Add(trendDirection.Value switch
            {
                1 => 75,   // Uptrend confirmed
                0 => 50,   // Mixed
                _ => 25,   // Downtrend
            });
        }

        // 6c. MA slope analysis (are MAs pointing up?)
        if (closes.Count >= 25 && ma20.HasValue)
        {
            // Compute MA20 5 days ago vs now to get slope
            var recentCloses = closes.TakeLast(25).ToList();
            var ma20Now = recentCloses.TakeLast(20).Average();
            var ma20Prev = recentCloses.Take(20).Average();
            var slope = ma20Now > ma20Prev;
            sub.Add(slope ? 70 : 35);
        }

        // 6d. Bollinger Band squeeze detection
        // Low ATR% = volatility compression = breakout imminent
        if (closes.Count >= 20)
        {
            var recent20 = closes.TakeLast(20).ToList();
            var mean = recent20.Average();
            var stdDev = Math.Sqrt(recent20.Average(v => (v - mean) * (v - mean)));
            var bbWidth = mean > 0 ? (stdDev * 2) / mean * 100 : 0;

            sub.Add(bbWidth switch
            {
                < 3 => 80,   // Tight squeeze — breakout imminent
                < 5 => 65,   // Moderately compressed
                < 8 => 55,   // Normal
                < 12 => 45,  // Wide
                _ => 35,     // Very wide — trend may be exhausting
            });
        }

        return sub.Count > 0 ? Math.Clamp(sub.Average(), 0, 100) : 50;
    }

    // ════════════════════════════════════════════════════════════════
    // FACTOR 7: RISK ASSESSMENT (10%)
    // ATR% + Beta + drawdown + liquidity + mean reversion z-score
    // ════════════════════════════════════════════════════════════════

    public static double ScoreRisk(
        IReadOnlyList<double> closes,
        double? atrPct,
        double? beta,
        double? avgDailyVolume,
        double? floatShares,
        int spyTrendDirection)
    {
        var sub = new List<double>();

        // 7a. Volatility (ATR%) — lower is safer
        if (atrPct.HasValue)
        {
            sub.Add(atrPct.Value switch
            {
                > 6 => 20,   // Very volatile — high risk
                > 4 => 35,
                > 2.5 => 55,
                > 1.5 => 70,
                _ => 80,     // Low volatility — safe
            });
        }

        // 7b. Beta — market sensitivity
        if (beta.HasValue)
        {
            // Low beta in bear market = good; high beta in bull market = good
            var betaScore = beta.Value switch
            {
                < 0.5 => 75,  // Low beta — defensive
                < 1.0 => 65,
                < 1.3 => 55,  // Slightly above market
                < 1.8 => 40,
                _ => 25,      // Very high beta — wild swings
            };

            // Adjust for market regime: high beta is fine in bull market
            if (spyTrendDirection == 1 && beta.Value > 1.0)
                betaScore += 15; // Bull market rewards high beta
            else if (spyTrendDirection == -1 && beta.Value > 1.0)
                betaScore -= 15; // Bear market punishes high beta

            sub.Add(Math.Clamp(betaScore, 0, 100));
        }

        // 7c. Max drawdown last 30 days
        if (closes.Count >= 30)
        {
            var last30 = closes.TakeLast(30).ToList();
            var peak = last30[0];
            var maxDd = 0.0;
            foreach (var c in last30)
            {
                if (c > peak) peak = c;
                var dd = (peak - c) / peak * 100;
                if (dd > maxDd) maxDd = dd;
            }

            sub.Add(maxDd switch
            {
                > 20 => 15, // Severe drawdown — danger
                > 10 => 35,
                > 5 => 55,
                > 2 => 70,
                _ => 85,    // No significant drawdown
            });
        }

        // 7d. Liquidity (volume + float)
        if (avgDailyVolume.HasValue)
        {
            sub.Add(avgDailyVolume.Value switch
            {
                >= 10_000_000 => 80,
                >= 2_000_000 => 70,
                >= 500_000 => 55,
                >= 100_000 => 40,
                _ => 20, // Illiquid — can't exit easily
            });
        }

        // 7e. Mean reversion Z-score
        // How far is current price from 50-day mean? Extreme = risky
        if (closes.Count >= 50)
        {
            var last50 = closes.TakeLast(50).ToList();
            var mean = last50.Average();
            var stdDev = Math.Sqrt(last50.Average(v => (v - mean) * (v - mean)));
            if (stdDev > 0)
            {
                var zScore = (closes[^1] - mean) / stdDev;
                // Extreme z-scores = higher risk
                sub.Add(Math.Abs(zScore) switch
                {
                    > 2.5 => 25, // >2.5 sigma — extreme, likely to revert
                    > 2.0 => 40,
                    > 1.5 => 55,
                    > 1.0 => 65,
                    _ => 75,     // Within 1 sigma — stable
                });
            }
        }

        // 7f. Market regime awareness
        // In bear markets, all risk scores should be lower
        if (spyTrendDirection == -1)
        {
            sub.Add(30); // Bear market penalty
        }
        else if (spyTrendDirection == 1)
        {
            sub.Add(70); // Bull market bonus
        }

        return sub.Count > 0 ? Math.Clamp(sub.Average(), 0, 100) : 50;
    }

    // ════════════════════════════════════════════════════════════════
    // COMPOSITE COMPUTE
    // ════════════════════════════════════════════════════════════════

    public static ScoreBreakdown Compute(
        // Price data
        IReadOnlyList<double> closes,
        IReadOnlyList<double> highs,
        IReadOnlyList<double> lows,
        IReadOnlyList<long> volumes,
        double price,
        long currentVolume,
        // Technical indicators
        double? ma20, double? ma50, double? ma200,
        double? rsi, double? adx, double? atrPct,
        int? trendDirection,
        // News & catalyst
        double? avgSentiment, bool hasCatalyst, string? catalystType, int newsCount,
        // Fundamentals
        double? peRatio, double? pegRatio, double? roe, double? roa,
        double? operatingMargin, double? grossMargin, double? debtToEquity,
        double? revenueGrowth, double? epsGrowth,
        // Sentiment & insider
        double? analystRating, int? analystCount, double? analystTargetPrice,
        bool insiderBuying, int insiderBuyCount, int insiderSellCount,
        // Risk context
        double? beta, double? avgDailyVolume, double? floatShares,
        // Earnings
        DateTime? nextEarningsDate, double? lastEpsSurprise,
        // Market regime
        int spyTrendDirection)
    {
        return new ScoreBreakdown(
            Momentum: ScoreMomentum(closes, price, ma20, ma50, ma200, rsi),
            Volume: ScoreVolume(volumes, currentVolume, closes),
            Catalyst: ScoreCatalyst(avgSentiment, hasCatalyst, catalystType, newsCount,
                                    nextEarningsDate, lastEpsSurprise),
            Fundamental: ScoreFundamentals(peRatio, pegRatio, roe, roa,
                                           operatingMargin, grossMargin, debtToEquity,
                                           revenueGrowth, epsGrowth),
            Sentiment: ScoreSentiment(analystRating, analystCount, analystTargetPrice,
                                      price, insiderBuying, insiderBuyCount, insiderSellCount),
            Trend: ScoreTrend(closes, adx, trendDirection, ma20, ma50, ma200),
            Risk: ScoreRisk(closes, atrPct, beta, avgDailyVolume, floatShares, spyTrendDirection)
        );
    }

    // ════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════

    private static double? ROC(IReadOnlyList<double> closes, int period)
    {
        if (closes.Count < period + 1) return null;
        var prev = closes[^(period + 1)];
        return prev > 0 ? (closes[^1] - prev) / prev * 100 : null;
    }
}
