using Fintrest.Api.Services.Indicators;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Calculates entry, stop-loss, and target prices using ATR-based methods.
/// Returns range-based zones (low/high) for entry and target.
/// </summary>
public static class TradeZoneCalculator
{
    public record TradeZone(
        double EntryLow,
        double EntryHigh,
        double StopLoss,
        double TargetLow,
        double TargetHigh,
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

        // Entry zone: current price +/- 0.25x ATR
        var entryLow = Math.Round(price - atr.Value * 0.25, 2);
        var entryHigh = Math.Round(price + atr.Value * 0.25, 2);
        var entryMid = price;

        // Stop-loss: 1.5x ATR below entry mid
        var stopDistance = atr.Value * 1.5;
        var stopLoss = Math.Round(entryMid - stopDistance, 2);

        // Target zone: 2x the risk (minimum 2:1 R:R), +/- 0.5x ATR
        var targetMid = entryMid + stopDistance * 2.0;
        var targetLow = Math.Round(targetMid - atr.Value * 0.5, 2);
        var targetHigh = Math.Round(targetMid + atr.Value * 0.5, 2);

        var riskReward = stopDistance > 0 ? (targetMid - entryMid) / stopDistance : 0;

        return new TradeZone(entryLow, entryHigh, stopLoss, targetLow, targetHigh, Math.Round(riskReward, 1));
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

        var entryMid = (zone.EntryLow + zone.EntryHigh) / 2.0;
        var risk = entryMid - zone.StopLoss;
        var newTargetMid = entryMid + risk * multiplier;

        // Keep same spread around the new target mid
        var halfSpread = (zone.TargetHigh - zone.TargetLow) / 2.0;
        var newTargetLow = Math.Round(newTargetMid - halfSpread, 2);
        var newTargetHigh = Math.Round(newTargetMid + halfSpread, 2);
        var newRR = risk > 0 ? Math.Round((newTargetMid - entryMid) / risk, 1) : 0;

        return zone with { TargetLow = newTargetLow, TargetHigh = newTargetHigh, RiskRewardRatio = newRR };
    }
}
