"use client";

import Link from "next/link";
import { useTopPicks } from "@/lib/hooks";
import type { Signal } from "@/lib/api";

export default function PicksPage() {
  const { data, isLoading } = useTopPicks(50);
  const signals = data?.signals ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold">Top Picks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Today&apos;s highest-ranked signals, scored 0–100.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Stock</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Score</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Signal</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Risk</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Entry Zone</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Stop</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : signals.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No signals yet.</td></tr>
              ) : signals.map((s) => (
                <SignalTableRow key={s.id} signal={s} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SignalTableRow({ signal: s }: { signal: Signal }) {
  const typeColor = s.signalType === "BUY_TODAY"
    ? "bg-emerald-500/10 text-emerald-500"
    : s.signalType === "AVOID" || s.signalType === "HIGH_RISK"
      ? "bg-red-500/10 text-red-500"
      : "bg-amber-500/10 text-amber-500";

  const riskColor = s.riskLevel === "LOW"
    ? "text-emerald-500" : s.riskLevel === "HIGH" ? "text-red-500" : "text-amber-500";

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-5 py-3.5">
        <Link href={`/stock/${s.ticker}`} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="font-[var(--font-mono)] text-[10px] font-bold text-primary">
              {s.ticker.slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-semibold font-[var(--font-mono)]">{s.ticker}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[140px]">{s.stockName}</p>
          </div>
        </Link>
      </td>
      <td className="px-5 py-3.5 text-center">
        <span className="font-[var(--font-mono)] font-bold">{Math.round(s.scoreTotal)}</span>
      </td>
      <td className="px-5 py-3.5 text-center">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeColor}`}>
          {s.signalType.replace("_", " ")}
        </span>
      </td>
      <td className={`px-5 py-3.5 text-center text-xs font-medium ${riskColor}`}>
        {s.riskLevel ?? "—"}
      </td>
      <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-muted-foreground text-xs">
        {s.entryLow && s.entryHigh ? `$${s.entryLow.toFixed(0)}–$${s.entryHigh.toFixed(0)}` : "—"}
      </td>
      <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-red-400 text-xs">
        {s.stopLoss ? `$${s.stopLoss.toFixed(0)}` : "—"}
      </td>
      <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-emerald-400 text-xs">
        {s.targetLow && s.targetHigh ? `$${s.targetLow.toFixed(0)}–$${s.targetHigh.toFixed(0)}` : "—"}
      </td>
    </tr>
  );
}
