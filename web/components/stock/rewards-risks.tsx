"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { StockSnapshot, Signal } from "@/lib/api";

type Input = {
  snapshot: StockSnapshot;
  signal?: Signal | null;
};

// Simply Wall St-style plain-English reward/risk bullets derived from snapshot data.
// Thresholds tuned to surface things a retail investor would actually care about.
function deriveRewards(s: StockSnapshot, signal?: Signal | null): string[] {
  const out: string[] = [];

  const pe = s.peRatio ?? s.forwardPe;
  if (pe !== null && pe !== undefined && pe < 15 && pe > 0) {
    out.push(`Trading at ${pe.toFixed(1)}× earnings — below the broad market average`);
  }
  if (s.pegRatio !== null && s.pegRatio < 1 && s.pegRatio > 0) {
    out.push(`PEG ratio of ${s.pegRatio.toFixed(2)} suggests growth may be undervalued`);
  }
  if (s.revenueGrowth !== null && s.revenueGrowth > 15) {
    out.push(`Revenue growing at ${s.revenueGrowth.toFixed(1)}% — well above peers`);
  }
  if (s.epsGrowth !== null && s.epsGrowth > 20) {
    out.push(`Earnings expanding at ${s.epsGrowth.toFixed(0)}% year-over-year`);
  }
  if (s.returnOnEquity !== null && s.returnOnEquity > 0.2) {
    out.push(`ROE of ${(s.returnOnEquity * 100).toFixed(0)}% indicates efficient capital deployment`);
  }
  if (s.operatingMargin !== null && s.operatingMargin > 0.25) {
    out.push(`Operating margin of ${(s.operatingMargin * 100).toFixed(0)}% signals strong pricing power`);
  }
  if (s.debtToEquity !== null && s.debtToEquity < 0.5) {
    out.push(`Low debt load (D/E ${s.debtToEquity.toFixed(2)}) — balance sheet is resilient`);
  }
  if (s.analystTargetPrice !== null && s.price !== null && s.analystTargetPrice > s.price) {
    const upside = ((s.analystTargetPrice - s.price) / s.price) * 100;
    if (upside > 10) {
      out.push(`Analyst consensus target implies ${upside.toFixed(0)}% upside from current price`);
    }
  }
  if (s.perfYear !== null && s.perfYear > 25) {
    out.push(`Up ${s.perfYear.toFixed(0)}% over the past year — sustained momentum`);
  }
  if (signal && signal.signalType === "BUY_TODAY" && signal.scoreTotal >= 75) {
    out.push(`Athena's scoring engine rates this a ${Math.round(signal.scoreTotal)}/100 high-conviction BUY`);
  }

  return out.slice(0, 6);
}

function deriveRisks(s: StockSnapshot, signal?: Signal | null): string[] {
  const out: string[] = [];

  const pe = s.peRatio ?? s.forwardPe;
  if (pe !== null && pe !== undefined && pe > 40) {
    out.push(`Priced at ${pe.toFixed(0)}× earnings — richly valued vs history`);
  }
  if (s.pegRatio !== null && s.pegRatio > 2.5) {
    out.push(`PEG of ${s.pegRatio.toFixed(1)} — growth may not justify current multiple`);
  }
  if (s.revenueGrowth !== null && s.revenueGrowth < 0) {
    out.push(`Revenue contracting (${s.revenueGrowth.toFixed(1)}%) over the latest period`);
  }
  if (s.epsGrowth !== null && s.epsGrowth < 0) {
    out.push(`Earnings declined ${Math.abs(s.epsGrowth).toFixed(0)}% year-over-year`);
  }
  if (s.debtToEquity !== null && s.debtToEquity > 2) {
    out.push(`Elevated leverage (D/E ${s.debtToEquity.toFixed(1)}) amplifies downside risk`);
  }
  if (s.operatingMargin !== null && s.operatingMargin < 0.05) {
    out.push(`Thin operating margin (${(s.operatingMargin * 100).toFixed(1)}%) — limited cushion for shocks`);
  }
  if (s.week52RangePct !== null && s.week52RangePct > 95) {
    out.push(`Trading near 52-week high — limited upside room before pullback`);
  }
  if (s.rsi !== null && s.rsi > 75) {
    out.push(`RSI of ${s.rsi.toFixed(0)} signals overbought conditions`);
  }
  if (s.beta !== null && s.beta > 1.5) {
    out.push(`Beta of ${s.beta.toFixed(2)} — moves more aggressively than the market`);
  }
  if (s.analystTargetPrice !== null && s.price !== null && s.analystTargetPrice < s.price) {
    const downside = ((s.price - s.analystTargetPrice) / s.price) * 100;
    out.push(`Price sits ${downside.toFixed(0)}% above analyst consensus target`);
  }
  if (s.perfWeek !== null && s.perfWeek > 15) {
    out.push(`Up ${s.perfWeek.toFixed(0)}% in the past week — extension risk elevated`);
  }
  if (signal?.riskLevel === "HIGH") {
    out.push(`Athena flags overall risk as HIGH — size positions accordingly`);
  }

  return out.slice(0, 6);
}

export function RewardsRisks({ snapshot, signal }: Input) {
  const rewards = deriveRewards(snapshot, signal);
  const risks = deriveRisks(snapshot, signal);

  if (rewards.length === 0 && risks.length === 0) return null;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <h3 className="font-[var(--font-heading)] text-sm font-bold uppercase tracking-wider text-emerald-700">
            Rewards
          </h3>
          <span className="text-[10px] text-emerald-600/70 ml-auto">
            {rewards.length} signal{rewards.length === 1 ? "" : "s"}
          </span>
        </div>
        {rewards.length > 0 ? (
          <ul className="space-y-2">
            {rewards.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-snug">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No notable rewards flagged right now.</p>
        )}
      </div>

      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <h3 className="font-[var(--font-heading)] text-sm font-bold uppercase tracking-wider text-red-700">
            Risks
          </h3>
          <span className="text-[10px] text-red-600/70 ml-auto">
            {risks.length} signal{risks.length === 1 ? "" : "s"}
          </span>
        </div>
        {risks.length > 0 ? (
          <ul className="space-y-2">
            {risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-snug">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No material risks flagged right now.</p>
        )}
      </div>
    </div>
  );
}
