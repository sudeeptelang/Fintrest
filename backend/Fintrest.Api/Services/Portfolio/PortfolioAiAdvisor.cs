using Fintrest.Api.Data;
using Fintrest.Api.DTOs.Portfolio;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Scoring;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Fintrest.Api.Services.Portfolio;

/// <summary>
/// AI-powered portfolio advisor: health scoring, diversification analysis,
/// signal alignment checks, and actionable recommendations.
/// </summary>
public class PortfolioAiAdvisor(
    AppDbContext db,
    RiskAnalytics riskAnalytics,
    ILogger<PortfolioAiAdvisor> logger,
    IOptions<ScoringOptions> scoringOptions)
{
    private readonly ScoringOptions _scoring = scoringOptions.Value;

    private const double MaxSinglePositionPct = 15.0;
    private const double MaxSingleSectorPct = 30.0;
    private const double MinCashPct = 5.0;
    private const double MaxCashPct = 50.0;
    private const double TaxLossThreshold = -5.0;
    private const int TaxLossMinDays = 30;

    /// <summary>
    /// Full portfolio analysis: health score + recommendations + alerts.
    /// </summary>
    public async Task<AdvisorResponse> AnalyzePortfolio(long portfolioId)
    {
        var portfolio = await db.Portfolios
            .Include(p => p.Holdings).ThenInclude(h => h.Stock)
            .FirstOrDefaultAsync(p => p.Id == portfolioId)
            ?? throw new InvalidOperationException("Portfolio not found");

        var holdings = portfolio.Holdings.ToList();
        var totalValue = portfolio.CashBalance + holdings.Sum(h => h.CurrentValue);
        var alerts = new List<string>();
        var recommendations = new List<PortfolioAiRecommendation>();

        // --- Health Score Components (0-100 each, weighted average) ---
        var diversificationScore = CalculateDiversificationScore(holdings, totalValue, alerts);
        var signalAlignmentScore = await CalculateSignalAlignmentScore(holdings, recommendations);
        var riskBalanceScore = await CalculateRiskBalanceScore(portfolioId, alerts);
        var cashAllocationScore = CalculateCashAllocationScore(portfolio.CashBalance, totalValue, alerts);

        var healthScore = Math.Round(
            diversificationScore * 0.30 +
            signalAlignmentScore * 0.30 +
            riskBalanceScore * 0.20 +
            cashAllocationScore * 0.20,
            1);

        // --- Generate additional recommendations ---
        await GenerateAddRecommendations(portfolio, holdings, totalValue, recommendations);
        await GenerateTaxLossRecommendations(holdings, recommendations);

        // Persist recommendations
        foreach (var rec in recommendations)
        {
            rec.PortfolioId = portfolioId;
            db.Set<PortfolioAiRecommendation>().Add(rec);
        }
        await db.SaveChangesAsync();

        // --- Athena-layer enhancements: portfolio-level factor profile + verdict mix + regime-aware alerts ---
        var (factorProfile, verdictMix, regimeContext) =
            await ComputeAthenaLayer(holdings, totalValue, alerts, recommendations);

        logger.LogInformation(
            "Portfolio {Id} health={Score} coverage={Cov} regime={Regime}",
            portfolioId, healthScore, factorProfile?.Coverage ?? 0, regimeContext);

        return new AdvisorResponse(
            HealthScore: healthScore,
            Recommendations: recommendations.Select(r => new RecommendationResponse(
                r.Id, r.Type, r.Ticker, r.Action, r.Reasoning, r.Confidence, r.Status, r.CreatedAt
            )).ToList(),
            Alerts: alerts,
            FactorProfile: factorProfile,
            VerdictMix: verdictMix,
            RegimeContext: regimeContext
        );
    }

    /// <summary>
    /// Position-weighted factor profile + verdict mix + regime-aware alerts. Uses the same
    /// <see cref="ScoringEngineV2"/> breakdown that powers the signal engine, so portfolio
    /// analysis speaks the same language as /picks — "your portfolio is 80 Momentum, 40 Risk"
    /// matches the same scale as "NVDA is 85 Momentum". Consistency users can reason about.
    /// </summary>
    private async Task<(PortfolioFactorProfile?, Dictionary<string, int>?, string?)> ComputeAthenaLayer(
        List<PortfolioHolding> holdings,
        double totalValue,
        List<string> alerts,
        List<PortfolioAiRecommendation> recommendations)
    {
        if (holdings.Count == 0 || totalValue <= 0) return (null, null, null);

        // Pull latest active signal + breakdown for every held stock in a single round-trip.
        var stockIds = holdings.Select(h => h.StockId).Distinct().ToList();
        var latestByStock = await (
            from s in db.Signals
            where stockIds.Contains(s.StockId) && s.Status == "ACTIVE"
            orderby s.CreatedAt descending
            select new { s.Id, s.StockId, s.SignalType, s.CreatedAt }
        ).ToListAsync();

        var signalByStock = latestByStock
            .GroupBy(s => s.StockId)
            .ToDictionary(g => g.Key, g => g.First());

        var signalIds = signalByStock.Values.Select(s => s.Id).ToList();
        var breakdowns = await db.SignalBreakdowns
            .Where(b => signalIds.Contains(b.SignalId))
            .ToDictionaryAsync(b => b.SignalId);

        // Weighted factor accumulator.
        double mom = 0, vol = 0, cat = 0, fun = 0, sen = 0, trd = 0, rsk = 0, weightSum = 0;
        int coverage = 0;
        var verdictCounts = new Dictionary<string, int>();

        foreach (var h in holdings)
        {
            var positionWeight = h.CurrentValue / totalValue;
            if (positionWeight <= 0) continue;
            if (!signalByStock.TryGetValue(h.StockId, out var sig)) continue;
            if (!breakdowns.TryGetValue(sig.Id, out var bd)) continue;

            coverage++;
            weightSum += positionWeight;
            mom += bd.MomentumScore * positionWeight;
            vol += bd.RelVolumeScore * positionWeight;
            cat += bd.NewsScore * positionWeight;
            fun += bd.FundamentalsScore * positionWeight;
            sen += bd.SentimentScore * positionWeight;
            trd += bd.TrendScore * positionWeight;
            rsk += bd.RiskScore * positionWeight;

            // Classify each holding's verdict using the same deterministic rules the signal engine uses.
            var verdict = ClassifyHoldingVerdict(h, sig.SignalType, bd);
            verdictCounts[verdict] = verdictCounts.GetValueOrDefault(verdict, 0) + 1;
        }

        // If a chunk of the portfolio isn't scanned (positions in non-universe stocks), surface that.
        if (coverage < holdings.Count)
        {
            alerts.Add(
                $"Coverage: {coverage}/{holdings.Count} holdings have active Fintrest signals. " +
                $"Others are outside the scored universe — factor profile below covers the scored portion only.");
        }

        PortfolioFactorProfile? profile = null;
        if (weightSum > 0)
        {
            profile = new PortfolioFactorProfile(
                Momentum:    Math.Round(mom / weightSum, 1),
                Volume:      Math.Round(vol / weightSum, 1),
                Catalyst:    Math.Round(cat / weightSum, 1),
                Fundamental: Math.Round(fun / weightSum, 1),
                Sentiment:   Math.Round(sen / weightSum, 1),
                Trend:       Math.Round(trd / weightSum, 1),
                Risk:        Math.Round(rsk / weightSum, 1),
                Coverage:    coverage);
        }

        // Load current market regime from the latest scan so recommendations know bull/bear.
        var regimeContext = await LoadRegimeContext();

        // Regime-aware advice: high-beta concentration in a weak tape is a flag worth surfacing.
        if (regimeContext is "bear" or "highvol")
        {
            var highBetaShare = holdings
                .Where(h => (h.Stock?.Beta ?? 1.0) > 1.3)
                .Sum(h => h.CurrentValue) / totalValue * 100;
            if (highBetaShare > 40)
            {
                alerts.Add(
                    $"Regime mismatch: {highBetaShare:F0}% of portfolio in high-beta names (>1.3) while market is {regimeContext}. " +
                    $"Consider rotating toward low-beta / defensive holdings.");
                recommendations.Add(new PortfolioAiRecommendation
                {
                    Type = "REBALANCE",
                    Ticker = null,
                    Action = "REDUCE",
                    Reasoning = $"High-beta concentration in a {regimeContext} regime. Rotate into Defensive Hold candidates or raise cash.",
                    Confidence = 70,
                });
            }
        }

        // Factor-mix advice: tell the user what their portfolio *looks like* on the same 0-100 scale as signals.
        if (profile is not null)
        {
            if (profile.Momentum > 75 && profile.Fundamental < 45)
                alerts.Add($"Momentum-heavy profile (momentum {profile.Momentum:F0}, fundamentals {profile.Fundamental:F0}). " +
                           "Strong in up-tapes, vulnerable to reversals — consider adding quality anchors.");
            if (profile.Risk < 40)
                alerts.Add($"Elevated risk profile (risk score {profile.Risk:F0}). Portfolio is skewed to volatile, drawdown-prone names.");
            if (profile.Catalyst > 70)
                alerts.Add($"High catalyst density ({profile.Catalyst:F0}). Several holdings carry near-term event risk — watch earnings dates.");
        }

        return (profile, verdictCounts.Count > 0 ? verdictCounts : null, regimeContext);
    }

    /// <summary>Reuse the same verdict rules the signal engine uses to keep labels consistent.</summary>
    private static string ClassifyHoldingVerdict(
        PortfolioHolding h, SignalType signalType, SignalBreakdown bd)
    {
        var beta = h.Stock?.Beta ?? 1.0;
        var nextEarnings = h.Stock?.NextEarningsDate;

        if (nextEarnings.HasValue)
        {
            var days = (nextEarnings.Value - DateTime.UtcNow).TotalDays;
            if (days is >= 0 and <= 14) return "Event-Driven";
        }
        if (bd.FundamentalsScore >= 70 && bd.MomentumScore >= 70)
            return "Buy the Dip";
        if (bd.TrendScore >= 75 && bd.RelVolumeScore >= 75)
            return "Breakout Setup";
        if (bd.MomentumScore >= 80 && bd.TrendScore >= 65)
            return "Momentum Run";
        if (bd.FundamentalsScore >= 75 && bd.MomentumScore <= 55)
            return "Value Setup";
        if (beta < 0.8 && bd.FundamentalsScore >= 65)
            return "Defensive Hold";
        return signalType == SignalType.BUY_TODAY ? "Quality Setup" : "Watchlist";
    }

    /// <summary>
    /// Derive today's regime from the most recent scan's run metadata — cheap proxy until
    /// we expose the full MarketRegime through an internal accessor. Matches the labels used
    /// on the dashboard Pulse banner for consistency.
    /// </summary>
    private async Task<string?> LoadRegimeContext()
    {
        var spy = await db.Stocks.FirstOrDefaultAsync(s => s.Ticker == "SPY");
        if (spy is null) return null;

        var bars = await db.MarketData
            .Where(m => m.StockId == spy.Id)
            .OrderByDescending(m => m.Ts)
            .Take(2)
            .Select(m => m.Close)
            .ToListAsync();
        if (bars.Count < 2 || bars[1] <= 0) return "neutral";

        var spy1d = (bars[0] - bars[1]) / bars[1] * 100;

        var vix = await db.Stocks.FirstOrDefaultAsync(
            s => s.Ticker == "VIX" || s.Ticker == "^VIX" || s.Ticker == "VIXY");
        double? vixLevel = null;
        if (vix is not null)
        {
            var vixBars = await db.MarketData
                .Where(m => m.StockId == vix.Id)
                .OrderByDescending(m => m.Ts).Take(1).Select(m => m.Close).ToListAsync();
            if (vixBars.Count > 0) vixLevel = vixBars[0];
        }

        if (vixLevel is > 25) return "highvol";
        if (spy1d < -1.5) return "bear";
        if (spy1d > 1.0) return "bull";
        return "neutral";
    }

    /// <summary>
    /// Diversification score: penalize single position > 15% or single sector > 30%.
    /// </summary>
    private double CalculateDiversificationScore(
        List<PortfolioHolding> holdings, double totalValue, List<string> alerts)
    {
        if (holdings.Count == 0 || totalValue <= 0) return 50; // Neutral if empty

        double score = 100;

        // Position concentration
        foreach (var holding in holdings)
        {
            var positionPct = holding.CurrentValue / totalValue * 100;
            if (positionPct > MaxSinglePositionPct)
            {
                var penalty = (positionPct - MaxSinglePositionPct) * 2;
                score -= penalty;
                alerts.Add($"Concentration warning: {holding.Stock?.Ticker} is {positionPct:F1}% of portfolio (>{MaxSinglePositionPct}% threshold)");
            }
        }

        // Sector concentration
        var sectorAllocation = riskAnalytics.GetSectorAllocation(holdings);
        foreach (var (sector, pct) in sectorAllocation)
        {
            if (pct > MaxSingleSectorPct)
            {
                var penalty = (pct - MaxSingleSectorPct) * 1.5;
                score -= penalty;
                alerts.Add($"Sector concentration: {sector} is {pct:F1}% of portfolio (>{MaxSingleSectorPct}% threshold)");
            }
        }

        // Bonus for having 5+ holdings
        if (holdings.Count >= 5) score = Math.Min(score + 5, 100);

        return Math.Max(score, 0);
    }

    /// <summary>
    /// Signal alignment: reward holdings with BUY_TODAY/WATCH, penalize HIGH_RISK/AVOID.
    /// </summary>
    private async Task<double> CalculateSignalAlignmentScore(
        List<PortfolioHolding> holdings, List<PortfolioAiRecommendation> recommendations)
    {
        if (holdings.Count == 0) return 50;

        double totalScore = 0;
        int scored = 0;

        foreach (var holding in holdings)
        {
            var latestSignal = await db.Signals
                .Where(s => s.StockId == holding.StockId && s.Status == "ACTIVE")
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

            if (latestSignal is null)
            {
                totalScore += 50; // Neutral if no signal
                scored++;
                continue;
            }

            switch (latestSignal.SignalType)
            {
                case SignalType.BUY_TODAY:
                    totalScore += 100;
                    break;
                case SignalType.WATCH:
                    totalScore += 70;
                    break;
                case SignalType.TAKE_PROFIT:
                    totalScore += 50;
                    break;
                case SignalType.HIGH_RISK:
                    totalScore += 20;
                    recommendations.Add(new PortfolioAiRecommendation
                    {
                        StockId = holding.StockId,
                        Type = "REDUCE",
                        Ticker = holding.Stock?.Ticker,
                        Action = "REDUCE",
                        Reasoning = $"{holding.Stock?.Ticker} has a HIGH_RISK signal (score: {latestSignal.ScoreTotal:F0}). Consider reducing position size.",
                        Confidence = 70,
                    });
                    break;
                case SignalType.AVOID:
                    totalScore += 10;
                    recommendations.Add(new PortfolioAiRecommendation
                    {
                        StockId = holding.StockId,
                        Type = "REDUCE",
                        Ticker = holding.Stock?.Ticker,
                        Action = "SELL",
                        Reasoning = $"{holding.Stock?.Ticker} has an AVOID signal (score: {latestSignal.ScoreTotal:F0}). Strongly consider exiting this position.",
                        Confidence = 85,
                    });
                    break;
            }
            scored++;
        }

        return scored > 0 ? totalScore / scored : 50;
    }

    /// <summary>
    /// Risk balance: check Sharpe ratio and beta from latest risk metrics.
    /// </summary>
    private async Task<double> CalculateRiskBalanceScore(long portfolioId, List<string> alerts)
    {
        var latestRisk = await db.Set<PortfolioRiskMetric>()
            .Where(r => r.PortfolioId == portfolioId)
            .OrderByDescending(r => r.Date)
            .FirstOrDefaultAsync();

        if (latestRisk is null) return 50; // No data yet

        double score = 70; // Baseline

        // Sharpe ratio assessment
        if (latestRisk.SharpeRatio.HasValue)
        {
            if (latestRisk.SharpeRatio > 1.5) score += 15;
            else if (latestRisk.SharpeRatio > 1.0) score += 10;
            else if (latestRisk.SharpeRatio > 0.5) score += 0;
            else if (latestRisk.SharpeRatio > 0) score -= 10;
            else
            {
                score -= 20;
                alerts.Add($"Negative Sharpe ratio ({latestRisk.SharpeRatio:F2}): portfolio is underperforming the risk-free rate.");
            }
        }

        // Beta assessment
        if (latestRisk.Beta.HasValue)
        {
            if (latestRisk.Beta > 1.5)
            {
                score -= 15;
                alerts.Add($"High portfolio beta ({latestRisk.Beta:F2}): portfolio is significantly more volatile than the market.");
            }
            else if (latestRisk.Beta is > 0.8 and < 1.2)
            {
                score += 10;
            }
        }

        // Max drawdown assessment
        if (latestRisk.MaxDrawdown.HasValue && latestRisk.MaxDrawdown > 0.20)
        {
            score -= 10;
            alerts.Add($"Large max drawdown ({latestRisk.MaxDrawdown:P1}): portfolio has experienced significant losses.");
        }

        return Math.Clamp(score, 0, 100);
    }

    /// <summary>
    /// Cash allocation score: flag too little (&lt;5%) or too much (&gt;50%) cash.
    /// </summary>
    private double CalculateCashAllocationScore(double cashBalance, double totalValue, List<string> alerts)
    {
        if (totalValue <= 0) return 50;

        var cashPct = cashBalance / totalValue * 100;

        if (cashPct < MinCashPct)
        {
            alerts.Add($"Low cash reserve ({cashPct:F1}%): portfolio is nearly fully invested with limited flexibility.");
            return Math.Max(30 + cashPct * 4, 0);
        }

        if (cashPct > MaxCashPct)
        {
            alerts.Add($"High cash allocation ({cashPct:F1}%): portfolio may be too conservatively positioned.");
            return Math.Max(100 - (cashPct - MaxCashPct) * 2, 0);
        }

        // Ideal range: 5-30%
        if (cashPct is >= 5 and <= 30) return 100;
        return 80; // 30-50% is acceptable
    }

    /// <summary>
    /// Generate ADD recommendations for stocks with BUY_TODAY signals when portfolio has cash.
    /// </summary>
    private async Task GenerateAddRecommendations(
        Models.Portfolio portfolio, List<PortfolioHolding> holdings, double totalValue,
        List<PortfolioAiRecommendation> recommendations)
    {
        if (portfolio.CashBalance <= 0) return;

        var heldStockIds = holdings.Select(h => h.StockId).ToHashSet();

        // Find top BUY_TODAY signals not already held
        var buySignals = await db.Signals
            .Include(s => s.Stock)
            .Where(s => s.Status == "ACTIVE"
                && s.SignalType == SignalType.BUY_TODAY
                && !heldStockIds.Contains(s.StockId))
            .OrderByDescending(s => s.ScoreTotal)
            .Take(3)
            .ToListAsync();

        foreach (var signal in buySignals)
        {
            recommendations.Add(new PortfolioAiRecommendation
            {
                StockId = signal.StockId,
                Type = "ADD",
                Ticker = signal.Stock?.Ticker,
                Action = "BUY",
                Reasoning = $"{signal.Stock?.Ticker} has a strong BUY_TODAY signal (score: {signal.ScoreTotal:F0}). Portfolio has {portfolio.CashBalance:C0} available cash.",
                Confidence = Math.Min(signal.ScoreTotal, 95),
            });
        }

        // Check sector concentration for rebalance suggestions
        var sectorAllocation = riskAnalytics.GetSectorAllocation(holdings);
        foreach (var (sector, pct) in sectorAllocation)
        {
            if (pct > MaxSingleSectorPct)
            {
                recommendations.Add(new PortfolioAiRecommendation
                {
                    Type = "REBALANCE",
                    Ticker = null,
                    Action = "REDUCE",
                    Reasoning = $"{sector} sector is {pct:F1}% of portfolio, exceeding the {MaxSingleSectorPct}% threshold. Consider diversifying into other sectors.",
                    Confidence = 75,
                });
            }
        }
    }

    /// <summary>
    /// Generate TAX_LOSS harvesting recommendations for positions with unrealized loss > 5% held > 30 days.
    /// </summary>
    private async Task GenerateTaxLossRecommendations(
        List<PortfolioHolding> holdings, List<PortfolioAiRecommendation> recommendations)
    {
        foreach (var holding in holdings)
        {
            if (holding.UnrealizedPnlPct > TaxLossThreshold) continue;

            // Check if the first buy transaction was more than 30 days ago
            var firstBuy = await db.Set<PortfolioTransaction>()
                .Where(t => t.PortfolioId == holding.PortfolioId
                    && t.StockId == holding.StockId
                    && t.Type == "BUY")
                .OrderBy(t => t.ExecutedAt)
                .FirstOrDefaultAsync();

            if (firstBuy is null) continue;
            if ((DateTime.UtcNow - firstBuy.ExecutedAt).TotalDays < TaxLossMinDays) continue;

            recommendations.Add(new PortfolioAiRecommendation
            {
                StockId = holding.StockId,
                Type = "TAX_LOSS",
                Ticker = holding.Stock?.Ticker,
                Action = "SELL",
                Reasoning = $"{holding.Stock?.Ticker} has unrealized loss of {holding.UnrealizedPnlPct:F1}% (held {(DateTime.UtcNow - firstBuy.ExecutedAt).TotalDays:F0} days). Consider harvesting tax loss.",
                Confidence = 60,
            });
        }
    }
}
