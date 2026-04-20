"use client";

import { Check, X, AlertTriangle } from "lucide-react";
import type { StockSnapshot, Signal } from "@/lib/api";

type Input = {
  snapshot: StockSnapshot;
  signal?: Signal | null;
};

type CheckTone = "good" | "warn" | "bad";
type CheckItem = {
  category: "Valuation" | "Growth" | "Financial Health" | "Momentum" | "Analysts" | "Risk";
  tone: CheckTone;
  finding: string;
};

/**
 * SimplyWall.st-style risk analysis checklist. One row per observation with an
 * icon keyed to its tone: green ✓ (good), amber ! (watch), red ✗ (risk).
 * Grouped by category so the reader sees the structure.
 *
 * All data comes from the existing snapshot + signal — no new fetches.
 */
function computeChecks(s: StockSnapshot, signal?: Signal | null): CheckItem[] {
  const out: CheckItem[] = [];
  const pe = s.peRatio ?? s.forwardPe;

  // ──── Valuation ─────────────────────────────────────────────────────────
  if (pe !== null && pe !== undefined && pe > 0) {
    if (pe < 15)
      out.push({ category: "Valuation", tone: "good",
        finding: `Trading at ${pe.toFixed(1)}× earnings — below broad-market average` });
    else if (pe > 40)
      out.push({ category: "Valuation", tone: "bad",
        finding: `Priced at ${pe.toFixed(0)}× earnings — richly valued` });
  }
  if (s.pegRatio !== null && s.pegRatio > 0) {
    if (s.pegRatio < 1)
      out.push({ category: "Valuation", tone: "good",
        finding: `PEG ${s.pegRatio.toFixed(2)} — growth may be undervalued` });
    else if (s.pegRatio > 2.5)
      out.push({ category: "Valuation", tone: "bad",
        finding: `PEG ${s.pegRatio.toFixed(1)} — growth may not justify the multiple` });
  }
  if (s.analystTargetPrice !== null && s.price !== null) {
    const delta = ((s.analystTargetPrice - s.price) / s.price) * 100;
    if (delta > 10)
      out.push({ category: "Valuation", tone: "good",
        finding: `Analyst target implies ${delta.toFixed(0)}% upside` });
    else if (delta < -5)
      out.push({ category: "Valuation", tone: "bad",
        finding: `Price sits ${Math.abs(delta).toFixed(0)}% above analyst target` });
  }

  // ──── Growth ────────────────────────────────────────────────────────────
  if (s.revenueGrowth !== null) {
    if (s.revenueGrowth > 15)
      out.push({ category: "Growth", tone: "good",
        finding: `Revenue growing ${s.revenueGrowth.toFixed(1)}% — well above peers` });
    else if (s.revenueGrowth < 0)
      out.push({ category: "Growth", tone: "bad",
        finding: `Revenue contracting ${s.revenueGrowth.toFixed(1)}% latest period` });
  }
  if (s.epsGrowth !== null) {
    if (s.epsGrowth > 20)
      out.push({ category: "Growth", tone: "good",
        finding: `Earnings expanding ${s.epsGrowth.toFixed(0)}% year-over-year` });
    else if (s.epsGrowth < 0)
      out.push({ category: "Growth", tone: "bad",
        finding: `Earnings declined ${Math.abs(s.epsGrowth).toFixed(0)}% year-over-year` });
  }

  // ──── Financial Health ──────────────────────────────────────────────────
  if (s.returnOnEquity !== null && s.returnOnEquity > 0.2)
    out.push({ category: "Financial Health", tone: "good",
      finding: `ROE ${(s.returnOnEquity * 100).toFixed(0)}% — efficient capital deployment` });
  if (s.operatingMargin !== null) {
    if (s.operatingMargin > 0.25)
      out.push({ category: "Financial Health", tone: "good",
        finding: `Operating margin ${(s.operatingMargin * 100).toFixed(0)}% — strong pricing power` });
    else if (s.operatingMargin < 0.05)
      out.push({ category: "Financial Health", tone: "bad",
        finding: `Thin operating margin ${(s.operatingMargin * 100).toFixed(1)}% — limited cushion` });
  }
  if (s.debtToEquity !== null) {
    if (s.debtToEquity < 0.5)
      out.push({ category: "Financial Health", tone: "good",
        finding: `Low debt load (D/E ${s.debtToEquity.toFixed(2)}) — resilient balance sheet` });
    else if (s.debtToEquity > 2)
      out.push({ category: "Financial Health", tone: "bad",
        finding: `Elevated leverage (D/E ${s.debtToEquity.toFixed(1)}) — amplifies downside` });
  }

  // ──── Momentum ──────────────────────────────────────────────────────────
  if (s.rsi !== null && s.rsi > 75)
    out.push({ category: "Momentum", tone: "warn",
      finding: `RSI ${s.rsi.toFixed(0)} — overbought conditions` });
  if (s.week52RangePct !== null && s.week52RangePct > 95)
    out.push({ category: "Momentum", tone: "warn",
      finding: `Trading near 52-week high — limited room before pullback` });
  if (s.perfWeek !== null && s.perfWeek > 15)
    out.push({ category: "Momentum", tone: "warn",
      finding: `Up ${s.perfWeek.toFixed(0)}% this week — extension risk elevated` });
  if (s.perfYear !== null && s.perfYear > 25)
    out.push({ category: "Momentum", tone: "good",
      finding: `Up ${s.perfYear.toFixed(0)}% over 1 year — sustained momentum` });

  // ──── Risk ──────────────────────────────────────────────────────────────
  if (s.beta !== null && s.beta > 1.5)
    out.push({ category: "Risk", tone: "warn",
      finding: `Beta ${s.beta.toFixed(2)} — moves more aggressively than the market` });
  if (signal?.riskLevel === "HIGH")
    out.push({ category: "Risk", tone: "bad",
      finding: `Engine flags overall risk as HIGH — size positions accordingly` });

  // ──── Analysts / Signal ─────────────────────────────────────────────────
  if (signal && signal.signalType === "BUY_TODAY" && signal.scoreTotal >= 75)
    out.push({ category: "Analysts", tone: "good",
      finding: `Scoring engine rates this ${Math.round(signal.scoreTotal)}/100 — high conviction` });

  return out;
}

const toneStyles: Record<CheckTone, { icon: typeof Check; chip: string; text: string }> = {
  good: {
    icon: Check,
    chip: "bg-emerald-500/15 border-emerald-500/40 text-emerald-500",
    text: "text-foreground",
  },
  warn: {
    icon: AlertTriangle,
    chip: "bg-amber-500/15 border-amber-500/40 text-amber-500",
    text: "text-foreground",
  },
  bad: {
    icon: X,
    chip: "bg-red-500/15 border-red-500/40 text-red-500",
    text: "text-foreground",
  },
};

export function RewardsRisks({ snapshot, signal }: Input) {
  const checks = computeChecks(snapshot, signal);
  if (checks.length === 0) return null;

  // Group by category in the order encountered (not alphabetical) so
  // Valuation shows before Growth, etc.
  const order: CheckItem["category"][] = [
    "Valuation", "Growth", "Financial Health", "Momentum", "Risk", "Analysts",
  ];
  const byCategory = new Map<CheckItem["category"], CheckItem[]>();
  for (const c of order) byCategory.set(c, []);
  for (const c of checks) byCategory.get(c.category)!.push(c);

  const goodCount = checks.filter(c => c.tone === "good").length;
  const warnCount = checks.filter(c => c.tone === "warn").length;
  const badCount  = checks.filter(c => c.tone === "bad").length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="font-[var(--font-heading)] text-base font-semibold">Risk analysis</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Plain-English findings from the current snapshot and signal
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-500 font-semibold">
            <Check className="h-3 w-3" /> {goodCount}
          </span>
          {warnCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-500 font-semibold">
              <AlertTriangle className="h-3 w-3" /> {warnCount}
            </span>
          )}
          {badCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-red-500 font-semibold">
              <X className="h-3 w-3" /> {badCount}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {order.map((cat) => {
          const items = byCategory.get(cat)!;
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                {cat}
              </p>
              <ul className="space-y-1.5">
                {items.map((c, i) => {
                  const style = toneStyles[c.tone];
                  const Icon = style.icon;
                  return (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full border flex-shrink-0 mt-0.5 ${style.chip}`}>
                        <Icon className="h-3 w-3" />
                      </span>
                      <span className={`text-sm leading-snug ${style.text}`}>{c.finding}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
