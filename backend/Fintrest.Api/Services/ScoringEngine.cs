namespace Fintrest.Api.Services;

/// <summary>
/// Fintrest 7-Factor Scoring Engine.
/// Each factor returns 0-100, weighted to produce a composite score.
/// </summary>
public static class ScoringEngine
{
    private const double WeightMomentum = 0.25;
    private const double WeightVolume = 0.15;
    private const double WeightCatalyst = 0.15;
    private const double WeightFundamental = 0.15;
    private const double WeightSentiment = 0.10;
    private const double WeightTrend = 0.10;
    private const double WeightRisk = 0.10;

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
            Momentum * WeightMomentum +
            Volume * WeightVolume +
            Catalyst * WeightCatalyst +
            Fundamental * WeightFundamental +
            Sentiment * WeightSentiment +
            Trend * WeightTrend +
            Risk * WeightRisk;

        public string SignalType => Total switch
        {
            >= 80 => "BuyToday",
            >= 60 => "Watch",
            >= 40 => "HighRisk",
            _ => "Avoid"
        };
    }

    public static double ScoreMomentum(double price, double? ma20, double? ma50, double? ma200, double? roc10 = null)
    {
        var score = 50.0;
        if (ma20.HasValue && price > ma20) score += 15;
        if (ma50.HasValue && price > ma50) score += 15;
        if (ma200.HasValue && price > ma200) score += 10;
        if (roc10 is > 5) score += 10;
        else if (roc10 is > 2) score += 5;
        return Math.Clamp(score, 0, 100);
    }

    public static double ScoreVolume(long currentVolume, double? avgVolume30D)
    {
        if (!avgVolume30D.HasValue || avgVolume30D == 0) return 50;
        var ratio = currentVolume / avgVolume30D.Value;
        return ratio switch
        {
            >= 3.0 => 100,
            >= 2.0 => 85,
            >= 1.5 => 70,
            >= 1.0 => 55,
            >= 0.7 => 40,
            _ => 25
        };
    }

    public static double ScoreCatalyst(double? sentimentScore, bool hasCatalyst = false)
    {
        var score = 50.0;
        if (sentimentScore.HasValue) score += sentimentScore.Value * 30;
        if (hasCatalyst) score += 20;
        return Math.Clamp(score, 0, 100);
    }

    public static double ScoreFundamentals(double? revenueGrowth, double? epsSurprise, double? grossMargin)
    {
        var score = 50.0;
        if (revenueGrowth is > 20) score += 20;
        else if (revenueGrowth is > 10) score += 10;
        else if (revenueGrowth < 0) score -= 15;

        if (epsSurprise is > 10) score += 15;
        else if (epsSurprise is > 0) score += 8;
        else if (epsSurprise < -5) score -= 15;

        if (grossMargin is > 50) score += 10;
        return Math.Clamp(score, 0, 100);
    }

    public static double ScoreSentiment(double? socialScore = null, double? analystRating = null, bool insiderBuying = false)
    {
        var score = 50.0;
        if (socialScore.HasValue) score += socialScore.Value * 20;
        if (analystRating is >= 4) score += 15;
        else if (analystRating is >= 3) score += 5;
        if (insiderBuying) score += 15;
        return Math.Clamp(score, 0, 100);
    }

    public static double ScoreTrend(double? adx, int? trendDirection = null)
    {
        var score = 50.0;
        if (adx is > 40) score += 25;
        else if (adx is > 25) score += 15;
        else if (adx < 15) score -= 10;

        if (trendDirection == 1) score += 20;
        else if (trendDirection == -1) score -= 20;
        return Math.Clamp(score, 0, 100);
    }

    public static double ScoreRisk(double? atrPct, double? avgDailyVolume, double? floatShares = null)
    {
        var score = 70.0;
        if (atrPct is > 5) score -= 30;
        else if (atrPct is > 3) score -= 15;
        else if (atrPct < 1.5) score += 10;

        if (avgDailyVolume < 100_000) score -= 25;
        else if (avgDailyVolume < 500_000) score -= 10;
        else if (avgDailyVolume > 5_000_000) score += 10;

        if (floatShares < 10_000_000) score -= 15;
        return Math.Clamp(score, 0, 100);
    }

    public static ScoreBreakdown Compute(
        double price, double? ma20 = null, double? ma50 = null, double? ma200 = null, double? roc10 = null,
        long currentVolume = 0, double? avgVolume30D = null,
        double? sentimentScore = null, bool hasCatalyst = false,
        double? revenueGrowth = null, double? epsSurprise = null, double? grossMargin = null,
        double? socialScore = null, double? analystRating = null, bool insiderBuying = false,
        double? adx = null, int? trendDirection = null,
        double? atrPct = null, double? avgDailyVolume = null, double? floatShares = null)
    {
        return new ScoreBreakdown(
            Momentum: ScoreMomentum(price, ma20, ma50, ma200, roc10),
            Volume: ScoreVolume(currentVolume, avgVolume30D),
            Catalyst: ScoreCatalyst(sentimentScore, hasCatalyst),
            Fundamental: ScoreFundamentals(revenueGrowth, epsSurprise, grossMargin),
            Sentiment: ScoreSentiment(socialScore, analystRating, insiderBuying),
            Trend: ScoreTrend(adx, trendDirection),
            Risk: ScoreRisk(atrPct, avgDailyVolume, floatShares)
        );
    }
}
