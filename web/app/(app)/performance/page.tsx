"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp, Target, AlertTriangle, BarChart3, Info } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { usePerformanceOverview, useAuditLog } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { AuditLogEntry } from "@/lib/api";

// Audit log list per FINTREST_UX_SPEC §12 — the single most important
// trust surface in the product. Every signal ever issued with entry,
// exit, outcome. Wins and losses both. Filter chips for quick slicing.
//
// Route is still /performance for backwards compatibility; canonical
// path /audit rewrites here via next.config.

type Filter = "all" | "win" | "loss" | "open";

export default function AuditLogPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data: perf, isLoading: overviewLoading } = usePerformanceOverview();
  const { data: entries, isLoading } = useAuditLog(filter === "all" ? undefined : filter);

  const rows = entries ?? [];
  const total = perf?.totalSignals ?? 0;
  const hasData = total > 0;

  const counts = useMemo(() => {
    const all = rows.length;
    const win = rows.filter((r) => r.outcome === "target_hit").length;
    const loss = rows.filter((r) => r.outcome === "stop_hit").length;
    const open = rows.filter((r) => r.outcome === "open").length;
    return { all, win, loss, open };
  }, [rows]);

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      <Breadcrumb items={[{ label: "Audit log" }]} />

      <header>
        <h1 className="font-[var(--font-heading)] text-[22px] leading-[28px] font-semibold text-ink-900">
          Audit log
        </h1>
        <p className="mt-1 text-[13px] text-ink-600">
          Every signal Fintrest has ever published — wins, losses, still open.
          Nothing is hidden. This is the trust mechanism.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total signals" value={overviewLoading ? "…" : total} icon={BarChart3} sub="since audit began" />
        <Stat label="Hit rate" value={hasData ? `${perf!.winRate}%` : "—"} icon={TrendingUp} sub={hasData ? "closed signals" : "no closed signals yet"} tone={hasData ? "accent" : undefined} />
        <Stat label="Avg return" value={hasData ? `${perf!.avgReturn}%` : "—"} icon={Target} sub="per closed signal" />
        <Stat label="Avg drawdown" value={hasData ? `${perf!.avgDrawdown}%` : "—"} icon={AlertTriangle} sub="max adverse move" tone="warn" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "win", "loss", "open"] as const).map((f) => {
          const count = f === "all" ? counts.all : f === "win" ? counts.win : f === "loss" ? counts.loss : counts.open;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors",
                filter === f
                  ? "bg-forest-light border-forest text-forest-dark"
                  : "bg-ink-0 border-ink-200 text-ink-600 hover:border-ink-400",
              )}
            >
              {labelFor(f)}
              <span className="font-[var(--font-mono)] text-[10px] text-ink-400">{count}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="rounded-[10px] border border-ink-200 bg-ink-0 py-12 text-center text-[13px] text-ink-500">
          Loading audit log…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[10px] border border-ink-200 bg-ink-0 px-6 py-10 text-center">
          <p className="text-[14px] font-semibold text-ink-900">No signals match yet</p>
          <p className="mt-2 text-[13px] text-ink-600 max-w-[480px] mx-auto">
            Signals close when price hits their target, stop, or the horizon
            expires — typically 5–20 trading days. Come back soon.
          </p>
        </div>
      ) : (
        <section className="rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-ink-50 border-b border-ink-200">
                <tr>
                  <Th>#</Th>
                  <Th>Ticker</Th>
                  <Th>Issued</Th>
                  <Th>Type</Th>
                  <Th align="right">Score</Th>
                  <Th align="right">Entry</Th>
                  <Th align="right">Exit</Th>
                  <Th>Outcome</Th>
                  <Th align="right">Days</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((r) => (
                  <Row key={r.signalId} entry={r} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-[11px] text-ink-400 italic flex items-center gap-1.5">
        <Info className="h-3 w-3" />
        Past performance does not guarantee future results. Educational content only.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof BarChart3;
  sub: string;
  tone?: "accent" | "warn";
}) {
  const toneClass =
    tone === "accent" ? "text-forest" : tone === "warn" ? "text-warn" : "text-ink-900";
  return (
    <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 text-ink-400" strokeWidth={1.7} />
      </div>
      <div className={cn("font-[var(--font-heading)] text-[24px] font-semibold leading-none", toneClass)}>
        {value}
      </div>
      <div className="text-[10px] text-ink-500 mt-1.5">{sub}</div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function Row({ entry }: { entry: AuditLogEntry }) {
  const outcomeTone =
    entry.outcome === "target_hit"
      ? "text-up"
      : entry.outcome === "stop_hit"
      ? "text-down"
      : entry.outcome === "horizon_expired"
      ? "text-ink-500"
      : "text-ink-400";
  const outcomeLabel =
    entry.outcome === "target_hit"
      ? `+${(entry.returnPct ?? 0).toFixed(2)}% · target`
      : entry.outcome === "stop_hit"
      ? `${(entry.returnPct ?? 0).toFixed(2)}% · stopped`
      : entry.outcome === "horizon_expired"
      ? `${(entry.returnPct ?? 0).toFixed(2)}% · horizon`
      : "open";

  return (
    <tr className="hover:bg-ink-50 transition-colors">
      <td className="px-4 py-3 text-ink-500 font-[var(--font-mono)] text-[12px]">{entry.signalId}</td>
      <td className="px-4 py-3">
        <Link href={`/audit/${entry.signalId}`} className="font-[var(--font-mono)] font-semibold text-ink-900 hover:text-forest">
          {entry.ticker}
        </Link>
      </td>
      <td className="px-4 py-3 text-ink-600 text-[12px]">{formatDate(entry.issuedAt)}</td>
      <td className="px-4 py-3 text-ink-600 text-[12px]">{formatType(entry.signalType)}</td>
      <td className="px-4 py-3 text-right font-[var(--font-mono)] font-semibold text-ink-900">
        {Math.round(entry.scoreTotal)}
      </td>
      <td className="px-4 py-3 text-right font-[var(--font-mono)] text-ink-700">
        {entry.entryPrice != null ? `$${entry.entryPrice.toFixed(2)}` : "—"}
      </td>
      <td className="px-4 py-3 text-right font-[var(--font-mono)] text-ink-700">
        {entry.exitPrice != null ? `$${entry.exitPrice.toFixed(2)}` : "—"}
      </td>
      <td className={cn("px-4 py-3 font-[var(--font-mono)] text-[12px] font-semibold", outcomeTone)}>
        {outcomeLabel}
      </td>
      <td className="px-4 py-3 text-right font-[var(--font-mono)] text-ink-600">
        {entry.durationDays ?? "—"}
      </td>
    </tr>
  );
}

function labelFor(f: Filter): string {
  switch (f) {
    case "all": return "All";
    case "win": return "Wins";
    case "loss": return "Losses";
    case "open": return "Open";
  }
}

function formatType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
