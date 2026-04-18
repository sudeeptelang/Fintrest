"use client";

import { useStockThesis } from "@/lib/hooks";
import { Sparkles, Target, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { AthenaSurface } from "@/components/ui/athena-surface";

/**
 * Navy-card Athena thesis block — the editorial narrative for a stock.
 * Design: dark card on the warm page bg (per CLAUDE.md design rule — Athena output
 * is always on navy, never white). Renders verdict badge, tier, thesis paragraphs,
 * catalysts/risks side-by-side, and the trade plan with compliance footer.
 */
export function AthenaThesisCard({ ticker }: { ticker: string }) {
  const { data, isLoading, error } = useStockThesis(ticker);

  if (isLoading) {
    return (
      <AthenaSurface className="min-h-[200px]">
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#00b87c]" />
          <span className="ml-3 text-sm text-white/70">Lens is analyzing {ticker}…</span>
        </div>
      </AthenaSurface>
    );
  }

  if (error || !data) {
    return (
      <AthenaSurface>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-[#00b87c]" />
            <h3 className="font-semibold text-sm">Lens Thesis</h3>
          </div>
          <p className="text-sm text-white/60">
            Thesis not available for {ticker} yet. It generates automatically for the top signals of each scan,
            and on first view for any stock in the universe.
          </p>
        </div>
      </AthenaSurface>
    );
  }

  const verdict = data.verdict;
  const tier = data.tier;
  const verdictColor = getVerdictColor(verdict);

  return (
    <AthenaSurface accent={verdictColor}>
      <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#00b87c]/15 border border-[#00b87c]/30">
            <Sparkles className="h-4 w-4 text-[#00b87c]" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Lens&apos;s Take</p>
            <h3 className="font-semibold text-base">{ticker} — Thesis</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span
            className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `${verdictColor}22`, color: verdictColor, border: `1px solid ${verdictColor}55` }}
          >
            {verdict}
          </span>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white/80 border border-white/15">
            {tier}
          </span>
        </div>
      </div>

      {/* Thesis body */}
      <div className="prose prose-invert prose-sm max-w-none mb-5">
        {data.thesis.split(/\n\n+/).map((para, i) => (
          <p key={i} className="text-sm leading-relaxed text-white/90 mb-3 last:mb-0">
            {para.trim()}
          </p>
        ))}
      </div>

      {/* Catalysts + Risks */}
      <div className="grid md:grid-cols-2 gap-4 mb-5">
        {data.catalysts.length > 0 && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-[#00b87c]" />
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#00b87c]">Catalysts</h4>
            </div>
            <ul className="space-y-1.5">
              {data.catalysts.map((c, i) => (
                <li key={i} className="text-xs text-white/85 leading-snug flex gap-2">
                  <span className="text-[#00b87c] mt-0.5">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.risks.length > 0 && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Risks</h4>
            </div>
            <ul className="space-y-1.5">
              {data.risks.map((r, i) => (
                <li key={i} className="text-xs text-white/85 leading-snug flex gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Trade plan */}
      {(data.tradePlan?.entryLow != null || data.tradePlan?.narrative) && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3.5 w-3.5 text-[#00b87c]" />
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#00b87c]">Trade Plan</h4>
          </div>
          {data.tradePlan.entryLow != null ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
              <PlanStat
                label="Entry"
                value={`$${data.tradePlan.entryLow.toFixed(2)}${data.tradePlan.entryHigh ? `–$${data.tradePlan.entryHigh.toFixed(2)}` : ""}`}
              />
              <PlanStat label="Stop" value={`$${data.tradePlan.stopLoss?.toFixed(2) ?? "—"}`} color="#ff8a73" />
              <PlanStat
                label="Target"
                value={`$${data.tradePlan.targetLow?.toFixed(2) ?? "—"}${data.tradePlan.targetHigh ? `–$${data.tradePlan.targetHigh.toFixed(2)}` : ""}`}
                color="#7fd8b6"
              />
              <PlanStat label="R:R" value={data.tradePlan.riskReward ? `${data.tradePlan.riskReward.toFixed(1)}:1` : "—"} />
            </div>
          ) : null}
          {data.tradePlan.narrative && (
            <p className="text-xs text-white/80 leading-relaxed">{data.tradePlan.narrative}</p>
          )}
        </div>
      )}

      {/* Compliance footer — required on every thesis per CLAUDE.md */}
      <p className="text-[10px] text-white/45 leading-relaxed pt-3 border-t border-white/10">
        Educational content only — not financial advice. Past signal performance does not guarantee future results.
        Generated by Lens · {new Date(data.generatedAt).toLocaleString()}
      </p>
      </div>
    </AthenaSurface>
  );
}

function PlanStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">{label}</p>
      <p
        className="font-[var(--font-mono)] text-sm font-bold mt-0.5"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case "Buy the Dip":     return "#00b87c";
    case "Breakout Setup":  return "#3b6fd4";
    case "Momentum Run":    return "#00b87c";
    case "Value Setup":     return "#7c5fd4";
    case "Event-Driven":    return "#c084fc";
    case "Defensive Hold":  return "#9ca3af";
    case "Mean Reversion":  return "#fbbf24";
    case "Quality Setup":   return "#00b87c";
    default:                return "#9ca3af";
  }
}
