"use client";

import { useStockThesis } from "@/lib/hooks";
import { Target, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";

/**
 * Lens thesis card — the v2 signature surface for every piece of Lens-authored
 * research on a ticker. Replaces the old navy-gradient AthenaSurface; renders
 * as a Lens card per design v2: lens-bg canvas, 22×22 forest square "L" mark,
 * body-lg DM Sans at 16/28 and max-width 720px, forest signature rule.
 *
 * Sub-panels (Catalysts, Risks, Trade plan) are bordered ink panels — a minimal
 * secondary surface inside the Lens card so the reader can still see the three
 * structural groupings without breaking the Lens-card gestalt.
 */
export function AthenaThesisCard({ ticker }: { ticker: string }) {
  const { data, isLoading, error } = useStockThesis(ticker);

  if (isLoading) {
    return (
      <LensCardShell minH="160px">
        <div className="h-[140px] flex items-center justify-center text-ink-700">
          <Loader2 className="h-4 w-4 mr-3 animate-spin text-forest" strokeWidth={2} />
          <span className="text-sm">Lens is analyzing {ticker}…</span>
        </div>
      </LensCardShell>
    );
  }

  if (error || !data) {
    return (
      <LensCardShell>
        <div className="text-sm text-ink-700 leading-relaxed">
          Thesis not available for {ticker} yet. Lens generates it automatically
          for the top signals of each scan, and on first view for any stock in
          the universe.
        </div>
      </LensCardShell>
    );
  }

  const verdict = data.verdict;
  const tier = data.tier;

  return (
    <div className="rounded-xl border border-[rgba(15,79,58,0.18)] bg-[color:var(--lens-bg)] p-7 sm:p-8">
      {/* Header — L mark + label + verdict + tier */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-[5px] bg-forest text-ink-0 font-[var(--font-heading)] text-[12px] font-bold">
            L
          </span>
          <div>
            <p className="text-[11px] font-semibold text-forest-dark tracking-[0.14em] uppercase leading-none">
              Lens on {ticker}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-[3px] rounded bg-forest-light text-forest-dark border border-[rgba(15,79,58,0.3)]">
            {verdict}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-[3px] rounded bg-ink-100 text-ink-700 border border-ink-300">
            {tier}
          </span>
        </div>
      </div>

      {/* Thesis body — body-lg (16/28) ink-800, max 720px per Lens spec */}
      <div className="max-w-[720px] mb-6">
        {data.thesis.split(/\n\n+/).map((para, i) => (
          <p key={i} className="text-[16px] leading-[28px] text-ink-800 mb-3 last:mb-0">
            {para.trim()}
          </p>
        ))}
      </div>

      {/* Catalysts + Risks — inline panels inside the Lens card */}
      <div className="grid md:grid-cols-2 gap-3 mb-5">
        {data.catalysts.length > 0 && (
          <div className="rounded-lg border border-[rgba(15,79,58,0.15)] bg-ink-0/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-3.5 w-3.5 text-forest-dark" strokeWidth={2} />
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-forest-dark">Catalysts</h4>
            </div>
            <ul className="space-y-2">
              {data.catalysts.map((c, i) => (
                <li key={i} className="text-[13px] text-ink-800 leading-snug flex gap-2">
                  <span className="text-forest mt-0.5 shrink-0">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.risks.length > 0 && (
          <div className="rounded-lg border border-[rgba(15,79,58,0.15)] bg-ink-0/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-3.5 w-3.5 text-[color:var(--warn)]" strokeWidth={2} />
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--warn)]">Risks</h4>
            </div>
            <ul className="space-y-2">
              {data.risks.map((r, i) => (
                <li key={i} className="text-[13px] text-ink-800 leading-snug flex gap-2">
                  <span className="text-[color:var(--warn)] mt-0.5 shrink-0">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Trade plan — Entry/Stop/Target/R:R grid */}
      {(data.tradePlan?.entryLow != null || data.tradePlan?.narrative) && (
        <div className="rounded-lg border border-[rgba(15,79,58,0.15)] bg-ink-0/60 p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-3.5 w-3.5 text-forest-dark" strokeWidth={2} />
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-forest-dark">Trade Plan</h4>
          </div>
          {data.tradePlan.entryLow != null ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
              <PlanStat
                label="Entry"
                value={`$${data.tradePlan.entryLow.toFixed(2)}${data.tradePlan.entryHigh ? `–$${data.tradePlan.entryHigh.toFixed(2)}` : ""}`}
              />
              <PlanStat
                label="Stop"
                value={`$${data.tradePlan.stopLoss?.toFixed(2) ?? "—"}`}
                tone="down"
              />
              <PlanStat
                label="Target"
                value={`$${data.tradePlan.targetLow?.toFixed(2) ?? "—"}${data.tradePlan.targetHigh ? `–$${data.tradePlan.targetHigh.toFixed(2)}` : ""}`}
                tone="up"
              />
              <PlanStat
                label="R:R"
                value={data.tradePlan.riskReward ? `${data.tradePlan.riskReward.toFixed(1)}:1` : "—"}
              />
            </div>
          ) : null}
          {data.tradePlan.narrative && (
            <p className="text-[13px] text-ink-700 leading-relaxed">{data.tradePlan.narrative}</p>
          )}
        </div>
      )}

      {/* Signature rule + compliance footer — required on every Lens thesis */}
      <div className="flex items-center gap-2 pt-4 border-t border-[rgba(15,79,58,0.15)]">
        <span className="w-6 h-px bg-forest inline-block" aria-hidden />
        <p className="text-[11px] text-ink-600 italic">
          Educational content only — not financial advice. Past signal performance does not guarantee future results.
          Generated by Lens · {new Date(data.generatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function LensCardShell({ children, minH }: { children: React.ReactNode; minH?: string }) {
  return (
    <div
      className="rounded-xl border border-[rgba(15,79,58,0.18)] bg-[color:var(--lens-bg)] p-7 sm:p-8"
      style={minH ? { minHeight: minH } : undefined}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-[5px] bg-forest text-ink-0 font-[var(--font-heading)] text-[12px] font-bold">
          L
        </span>
        <span className="text-[11px] font-semibold text-forest-dark tracking-[0.14em] uppercase">
          Lens thesis
        </span>
      </div>
      {children}
    </div>
  );
}

function PlanStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  const toneClass =
    tone === "up" ? "text-[color:var(--up)]" : tone === "down" ? "text-[color:var(--down)]" : "text-ink-900";
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p className={`font-[var(--font-mono)] text-sm font-medium mt-0.5 ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
