using Fintrest.Api.Models;

namespace Fintrest.Api.Services.Portfolio;

/// <summary>
/// Portfolio risk calculations: Sharpe, Sortino, drawdown, beta, VaR, volatility, sector allocation.
/// </summary>
public class RiskAnalytics
{
    private const double DefaultRiskFreeRate = 0.05;
    private const double TradingDaysPerYear = 252.0;

    /// <summary>Annualized Sharpe ratio from daily returns.</summary>
    public double? CalculateSharpeRatio(List<double> returns, double riskFreeRate = DefaultRiskFreeRate)
    {
        if (returns.Count < 2) return null;

        var dailyRf = riskFreeRate / TradingDaysPerYear;
        var excessReturns = returns.Select(r => r - dailyRf).ToList();
        var mean = excessReturns.Average();
        var stdDev = StandardDeviation(excessReturns);

        if (stdDev == 0) return null;
        return (mean / stdDev) * Math.Sqrt(TradingDaysPerYear);
    }

    /// <summary>Annualized Sortino ratio (penalizes only downside volatility).</summary>
    public double? CalculateSortinoRatio(List<double> returns, double riskFreeRate = DefaultRiskFreeRate)
    {
        if (returns.Count < 2) return null;

        var dailyRf = riskFreeRate / TradingDaysPerYear;
        var excessReturns = returns.Select(r => r - dailyRf).ToList();
        var mean = excessReturns.Average();

        var downsideReturns = excessReturns.Where(r => r < 0).ToList();
        if (downsideReturns.Count == 0) return null;

        var downsideDev = Math.Sqrt(downsideReturns.Average(r => r * r));
        if (downsideDev == 0) return null;

        return (mean / downsideDev) * Math.Sqrt(TradingDaysPerYear);
    }

    /// <summary>Maximum drawdown from a series of portfolio values.</summary>
    public double? CalculateMaxDrawdown(List<double> values)
    {
        if (values.Count < 2) return null;

        double maxDrawdown = 0;
        double peak = values[0];

        foreach (var value in values)
        {
            if (value > peak) peak = value;
            var drawdown = (peak - value) / peak;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        return maxDrawdown;
    }

    /// <summary>Portfolio beta relative to market returns.</summary>
    public double? CalculateBeta(List<double> portfolioReturns, List<double> marketReturns)
    {
        var count = Math.Min(portfolioReturns.Count, marketReturns.Count);
        if (count < 2) return null;

        var pReturns = portfolioReturns.Take(count).ToList();
        var mReturns = marketReturns.Take(count).ToList();

        var pMean = pReturns.Average();
        var mMean = mReturns.Average();

        double covariance = 0, marketVariance = 0;
        for (int i = 0; i < count; i++)
        {
            var pDiff = pReturns[i] - pMean;
            var mDiff = mReturns[i] - mMean;
            covariance += pDiff * mDiff;
            marketVariance += mDiff * mDiff;
        }

        if (marketVariance == 0) return null;
        return covariance / marketVariance;
    }

    /// <summary>Value at Risk at 95% confidence (parametric, normal distribution assumption).</summary>
    public double? CalculateVar95(List<double> returns)
    {
        if (returns.Count < 2) return null;

        var mean = returns.Average();
        var stdDev = StandardDeviation(returns);

        // 1.645 = z-score for 95% one-tailed
        return mean - 1.645 * stdDev;
    }

    /// <summary>Annualized volatility from daily returns.</summary>
    public double? CalculateVolatility(List<double> returns, bool annualize = true)
    {
        if (returns.Count < 2) return null;

        var stdDev = StandardDeviation(returns);
        return annualize ? stdDev * Math.Sqrt(TradingDaysPerYear) : stdDev;
    }

    /// <summary>Sector allocation as percentage of total invested value.</summary>
    public Dictionary<string, double> GetSectorAllocation(List<PortfolioHolding> holdings)
    {
        var totalValue = holdings.Sum(h => h.CurrentValue);
        if (totalValue == 0) return new Dictionary<string, double>();

        return holdings
            .GroupBy(h => h.Stock?.Sector ?? "Unknown")
            .ToDictionary(
                g => g.Key,
                g => Math.Round(g.Sum(h => h.CurrentValue) / totalValue * 100, 2)
            );
    }

    private static double StandardDeviation(List<double> values)
    {
        if (values.Count < 2) return 0;
        var mean = values.Average();
        var sumSquares = values.Sum(v => (v - mean) * (v - mean));
        return Math.Sqrt(sumSquares / (values.Count - 1));
    }
}
