"use client";

import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { useSwingWeek } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import type { Signal } from "@/lib/api";

export default function SwingPage() {
  const { data, isLoading } = useSwingWeek();
  const signals = data?.signals ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">Swing Trade Setups</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Weekly trade ideas with full thesis, entry/stop/target, and AI explanation.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading swing setups...</div>
      ) : signals.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No BUY_TODAY signals this week. Check back after the next scan.
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((s) => (
            <SwingCard key={s.id} signal={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function SwingCard({ signal: s }: { signal: Signal }) {
  let explanation: { Summary?: string; BullishFactors?: string[] } = {};
  if (s.breakdown?.explanationJson) {
    try { explanation = JSON.parse(s.breakdown.explanationJson); } catch { /* */ }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="font-[var(--font-mono)] text-xs font-bold text-primary">
                {s.ticker.slice(0, 2)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-[var(--font-mono)] font-bold">{s.ticker}</p>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                  Score: {Math.round(s.scoreTotal)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{s.stockName}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {explanation.Summary ?? s.breakdown?.whyNowSummary ?? "Analysis pending."}
          </p>
          {(explanation.BullishFactors?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {explanation.BullishFactors?.map((f, i) => (
                <span key={i} className="text-xs font-[var(--font-mono)] bg-muted px-2.5 py-1 rounded-md">
                  + {f.split("—")[0].trim()}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="lg:w-64 shrink-0 rounded-xl bg-muted/50 border border-border p-4 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trade Zone</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price</span>
              <span className="font-[var(--font-mono)] font-bold">
                {s.currentPrice ? `$${s.currentPrice.toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entry</span>
              <span className="font-[var(--font-mono)] font-semibold">
                {s.entryLow ? `$${s.entryLow.toFixed(0)}–$${s.entryHigh?.toFixed(0)}` : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Target</span>
              <span className="font-[var(--font-mono)] font-semibold text-emerald-500">
                {s.targetHigh ? `$${s.targetLow?.toFixed(0)}–$${s.targetHigh.toFixed(0)}` : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stop-Loss</span>
              <span className="font-[var(--font-mono)] font-semibold text-red-500">
                {s.stopLoss ? `$${s.stopLoss.toFixed(0)}` : "—"}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Risk</span>
              <span className="font-[var(--font-mono)] text-xs">{s.riskLevel ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Horizon</span>
              <span className="font-[var(--font-mono)] text-xs">{s.horizonDays ? `${s.horizonDays} days` : "—"}</span>
            </div>
          </div>
          <Link href={`/stock/${s.ticker}`}>
            <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-white mt-2">
              View Full Analysis <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
