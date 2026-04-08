using Fintrest.Api.Services.Indicators;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Calculates entry, stop-loss, and target prices using ATR-based methods.
/// </summary>
public static class TradeZoneCalculator
{
    public record TradeZone(
        double Entry,
        double StopLoss,
        double Target,
        double RiskRewardRatio
    );

    /// <summary>
    /// Compute trade zone using ATR for stop placement and 2:1+ R:R for target.
    /// </summary>
    public static TradeZone? Calculate(StockSnapshot snap)
    {
        if (snap.ClosePrices.Count < 15 || snap.HighPrices.Count < 15)
            return null;

        var atr = TechnicalIndicators.ATR(snap.HighPrices, snap.LowPrices, snap.ClosePrices);
        if (!atr.HasValue || atr.Value == 0) return null;

        var price = snap.Price;

        // Entry: current price (market order at open)
        var entry = Math.Round(price, 2);

        // Stop-loss: 1.5x ATR below entry (swing-trade standard)
        var stopDistance = atr.Value * 1.5;
        var stopLoss = Math.Round(entry - stopDistance, 2);

        // Target: 2x the risk (minimum 2:1 R:R)
        var targetDistance = stopDistance * 2.0;
        var target = Math.Round(entry + targetDistance, 2);

        // Adjust target up if strong momentum (score > 85)
        // This is a signal-aware adjustment — stronger signals get wider targets
        var riskReward = stopDistance > 0 ? targetDistance / stopDistance : 0;

        return new TradeZone(entry, stopLoss, target, Math.Round(riskReward, 1));
    }

    /// <summary>
    /// Widen target for high-conviction signals.
    /// </summary>
    public static TradeZone? AdjustForConviction(TradeZone? zone, double scoreTotal)
    {
        if (zone is null) return null;

        // High-conviction (90+): extend target to 2.5:1
        // Very high (95+): extend to 3:1
        var multiplier = scoreTotal switch
        {
            >= 95 => 3.0,
            >= 90 => 2.5,
            >= 85 => 2.2,
            _ => 2.0
        };

        var risk = zone.Entry - zone.StopLoss;
        var newTarget = Math.Round(zone.Entry + risk * multiplier, 2);
        var newRR = risk > 0 ? Math.Round((newTarget - zone.Entry) / risk, 1) : 0;

        return zone with { Target = newTarget, RiskRewardRatio = newRR };
    }
}
