namespace Fintrest.Api.Services.Indicators;

/// <summary>
/// Pure math functions for technical indicators.
/// All methods are stateless — pass in the data, get back the number.
/// </summary>
public static class TechnicalIndicators
{
    /// <summary>Simple Moving Average over the last N closing prices.</summary>
    public static double? SMA(IReadOnlyList<double> closes, int period)
    {
        if (closes.Count < period) return null;
        var sum = 0.0;
        for (var i = closes.Count - period; i < closes.Count; i++)
            sum += closes[i];
        return sum / period;
    }

    /// <summary>Exponential Moving Average.</summary>
    public static double? EMA(IReadOnlyList<double> closes, int period)
    {
        if (closes.Count < period) return null;
        var multiplier = 2.0 / (period + 1);
        var ema = SMA(closes.Take(period).ToList(), period)!.Value;
        for (var i = period; i < closes.Count; i++)
            ema = (closes[i] - ema) * multiplier + ema;
        return ema;
    }

    /// <summary>RSI (Relative Strength Index) — 14-period default.</summary>
    public static double? RSI(IReadOnlyList<double> closes, int period = 14)
    {
        if (closes.Count < period + 1) return null;

        var gains = 0.0;
        var losses = 0.0;

        // Initial average
        for (var i = 1; i <= period; i++)
        {
            var change = closes[i] - closes[i - 1];
            if (change > 0) gains += change;
            else losses -= change;
        }

        var avgGain = gains / period;
        var avgLoss = losses / period;

        // Smoothed
        for (var i = period + 1; i < closes.Count; i++)
        {
            var change = closes[i] - closes[i - 1];
            avgGain = (avgGain * (period - 1) + Math.Max(change, 0)) / period;
            avgLoss = (avgLoss * (period - 1) + Math.Max(-change, 0)) / period;
        }

        if (avgLoss == 0) return 100;
        var rs = avgGain / avgLoss;
        return 100 - 100 / (1 + rs);
    }

    /// <summary>ADX (Average Directional Index) — measures trend strength.</summary>
    public static double? ADX(
        IReadOnlyList<double> highs,
        IReadOnlyList<double> lows,
        IReadOnlyList<double> closes,
        int period = 14)
    {
        var len = highs.Count;
        if (len < period * 2 + 1) return null;

        var trList = new List<double>();
        var plusDmList = new List<double>();
        var minusDmList = new List<double>();

        for (var i = 1; i < len; i++)
        {
            var highDiff = highs[i] - highs[i - 1];
            var lowDiff = lows[i - 1] - lows[i];

            var plusDm = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
            var minusDm = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;

            var tr = Math.Max(highs[i] - lows[i],
                Math.Max(Math.Abs(highs[i] - closes[i - 1]),
                    Math.Abs(lows[i] - closes[i - 1])));

            trList.Add(tr);
            plusDmList.Add(plusDm);
            minusDmList.Add(minusDm);
        }

        // Smoothed sums
        var smoothTr = trList.Take(period).Sum();
        var smoothPlusDm = plusDmList.Take(period).Sum();
        var smoothMinusDm = minusDmList.Take(period).Sum();

        var dxList = new List<double>();

        for (var i = period; i < trList.Count; i++)
        {
            if (i > period)
            {
                smoothTr = smoothTr - smoothTr / period + trList[i];
                smoothPlusDm = smoothPlusDm - smoothPlusDm / period + plusDmList[i];
                smoothMinusDm = smoothMinusDm - smoothMinusDm / period + minusDmList[i];
            }

            var plusDi = smoothTr > 0 ? 100 * smoothPlusDm / smoothTr : 0;
            var minusDi = smoothTr > 0 ? 100 * smoothMinusDm / smoothTr : 0;
            var diSum = plusDi + minusDi;
            var dx = diSum > 0 ? 100 * Math.Abs(plusDi - minusDi) / diSum : 0;
            dxList.Add(dx);
        }

        if (dxList.Count < period) return null;
        return dxList.TakeLast(period).Average();
    }

    /// <summary>ATR (Average True Range) — volatility measure.</summary>
    public static double? ATR(
        IReadOnlyList<double> highs,
        IReadOnlyList<double> lows,
        IReadOnlyList<double> closes,
        int period = 14)
    {
        if (highs.Count < period + 1) return null;

        var trList = new List<double>();
        for (var i = 1; i < highs.Count; i++)
        {
            var tr = Math.Max(highs[i] - lows[i],
                Math.Max(Math.Abs(highs[i] - closes[i - 1]),
                    Math.Abs(lows[i] - closes[i - 1])));
            trList.Add(tr);
        }

        // Initial ATR = simple average
        var atr = trList.Take(period).Average();

        // Smoothed
        for (var i = period; i < trList.Count; i++)
            atr = (atr * (period - 1) + trList[i]) / period;

        return atr;
    }

    /// <summary>ATR as a percentage of current price.</summary>
    public static double? ATRPercent(
        IReadOnlyList<double> highs,
        IReadOnlyList<double> lows,
        IReadOnlyList<double> closes,
        int period = 14)
    {
        var atr = ATR(highs, lows, closes, period);
        if (!atr.HasValue || closes.Count == 0) return null;
        var lastClose = closes[^1];
        return lastClose > 0 ? atr.Value / lastClose * 100 : null;
    }

    /// <summary>Rate of Change over N periods (percentage).</summary>
    public static double? ROC(IReadOnlyList<double> closes, int period = 10)
    {
        if (closes.Count < period + 1) return null;
        var prev = closes[^(period + 1)];
        return prev > 0 ? (closes[^1] - prev) / prev * 100 : null;
    }

    /// <summary>Determine trend direction from MA alignment: 1=up, -1=down, 0=mixed.</summary>
    public static int TrendDirection(double price, double? ma20, double? ma50, double? ma200)
    {
        var above = 0;
        var total = 0;
        if (ma20.HasValue) { total++; if (price > ma20) above++; }
        if (ma50.HasValue) { total++; if (price > ma50) above++; }
        if (ma200.HasValue) { total++; if (price > ma200) above++; }

        if (total == 0) return 0;
        var ratio = (double)above / total;
        return ratio >= 0.67 ? 1 : ratio <= 0.33 ? -1 : 0;
    }
}
