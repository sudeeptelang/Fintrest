"use client";

import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { useFinancialScores } from "@/lib/hooks";
import type { FinancialScoresResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Institutional-grade financial-health scores — Altman Z-score +
 * Piotroski F-score — surfaced as two pill cards inside the
 * Fundamentals deep-dive. These are well-known quant measures we
 * don't compute ourselves; FMP ships them and we display them with
 * interpretation bands (backend-computed) so users can tell at a
 * glance whether a name is fundamentally healthy or distressed.
 */
export function FinancialScoresCard({ ticker, className }: { ticker: string; className?: string }) {
  const { data, isLoading } = useFinancialScores(ticker);

  if (isLoading) {
    return (
      <div className={cn("rounded-[10px] border border-ink-200 bg-ink-0 p-4 font-mono text-[12px] text-ink-500", className)}>
        Loading quant-health scores…
      </div>
    );
  }

  if (!data) return null; // Silent — hide if FMP has no record

  return (
    <div className={cn("rounded-[10px] border border-ink-200 bg-ink-0 p-4 md:p-5", className)}>
      <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600 mb-3">
        Quant-health scores · FMP
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AltmanPill data={data} />
        <PiotroskiPill data={data} />
      </div>
      <p className="mt-3 text-[10px] text-ink-500 leading-tight">
        Altman Z (bankruptcy-risk composite) and Piotroski F-score (9-factor
        fundamentals improvement) are sourced from FMP, not Fintrest-computed.
        Educational reference only — not a forecast.
      </p>
    </div>
  );
}

function AltmanPill({ data }: { data: FinancialScoresResponse }) {
  const z = data.altmanZScore;
  const band = data.altmanBand;
  const { Icon, tone, bg, label, blurb } =
    band === "safe"
      ? { Icon: ShieldCheck, tone: "text-up", bg: "bg-up/10", label: "Safe zone", blurb: "distress risk low" }
      : band === "grey"
      ? { Icon: Shield, tone: "text-warn", bg: "bg-warn/10", label: "Grey zone", blurb: "monitor for deterioration" }
      : band === "distress"
      ? { Icon: ShieldAlert, tone: "text-down", bg: "bg-down/10", label: "Distress zone", blurb: "elevated bankruptcy risk" }
      : { Icon: Shield, tone: "text-ink-500", bg: "bg-ink-50", label: "Unknown", blurb: "FMP has no Z-score on record" };

  return (
    <div className={cn("rounded-[8px] p-3 flex items-start gap-3", bg)}>
      <div className={cn("flex-shrink-0 grid place-items-center w-8 h-8 rounded-md bg-ink-0", tone)}>
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-[var(--font-sans)] text-[11px] font-semibold text-ink-700 uppercase tracking-wide">
            Altman Z
          </span>
          <span className={cn("font-mono text-[16px] font-semibold leading-none", tone)}>
            {z != null ? z.toFixed(2) : "—"}
          </span>
        </div>
        <div className={cn("font-[var(--font-sans)] text-[11px] font-semibold mt-1", tone)}>
          {label}
        </div>
        <div className="font-[var(--font-sans)] text-[11px] text-ink-600 leading-tight mt-0.5">
          {blurb}
        </div>
      </div>
    </div>
  );
}

function PiotroskiPill({ data }: { data: FinancialScoresResponse }) {
  const p = data.piotroskiScore;
  const band = data.piotroskiBand;
  const { Icon, tone, bg, label, blurb } =
    band === "strong"
      ? { Icon: ShieldCheck, tone: "text-up", bg: "bg-up/10", label: "Strong", blurb: "most fundamentals improving y/y" }
      : band === "mid"
      ? { Icon: Shield, tone: "text-amber", bg: "bg-amber/10", label: "Mid", blurb: "mixed fundamental trend" }
      : band === "weak"
      ? { Icon: ShieldAlert, tone: "text-down", bg: "bg-down/10", label: "Weak", blurb: "most fundamentals deteriorating" }
      : { Icon: Shield, tone: "text-ink-500", bg: "bg-ink-50", label: "Unknown", blurb: "FMP has no F-score on record" };

  return (
    <div className={cn("rounded-[8px] p-3 flex items-start gap-3", bg)}>
      <div className={cn("flex-shrink-0 grid place-items-center w-8 h-8 rounded-md bg-ink-0", tone)}>
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-[var(--font-sans)] text-[11px] font-semibold text-ink-700 uppercase tracking-wide">
            Piotroski F
          </span>
          <span className={cn("font-mono text-[16px] font-semibold leading-none", tone)}>
            {p != null ? `${p.toFixed(0)}/9` : "—"}
          </span>
        </div>
        <div className={cn("font-[var(--font-sans)] text-[11px] font-semibold mt-1", tone)}>
          {label}
        </div>
        <div className="font-[var(--font-sans)] text-[11px] text-ink-600 leading-tight mt-0.5">
          {blurb}
        </div>
      </div>
    </div>
  );
}
