"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useTopPicks } from "@/lib/hooks";
import type { Signal } from "@/lib/api";

type SortKey = "score" | "ticker" | "signal" | "risk" | "price" | "entry" | "stop" | "target";
type SortDir = "asc" | "desc";

const RISK_ORDER: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const SIGNAL_ORDER: Record<string, number> = { BUY_TODAY: 0, WATCH: 1, HIGH_RISK: 2, AVOID: 3 };

function compare(a: Signal, b: Signal, key: SortKey, dir: SortDir): number {
  let diff = 0;
  switch (key) {
    case "score":
      diff = a.scoreTotal - b.scoreTotal;
      break;
    case "ticker":
      diff = a.ticker.localeCompare(b.ticker);
      break;
    case "signal":
      diff = (SIGNAL_ORDER[a.signalType] ?? 9) - (SIGNAL_ORDER[b.signalType] ?? 9);
      break;
    case "risk":
      diff = (RISK_ORDER[a.riskLevel ?? ""] ?? 9) - (RISK_ORDER[b.riskLevel ?? ""] ?? 9);
      break;
    case "price":
      diff = (a.currentPrice ?? 0) - (b.currentPrice ?? 0);
      break;
    case "entry":
      diff = (a.entryLow ?? 0) - (b.entryLow ?? 0);
      break;
    case "stop":
      diff = (a.stopLoss ?? 0) - (b.stopLoss ?? 0);
      break;
    case "target":
      diff = (a.targetHigh ?? 0) - (b.targetHigh ?? 0);
      break;
  }
  return dir === "asc" ? diff : -diff;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40" />;
  return dir === "asc" ? (
    <ChevronUp className="h-3 w-3 text-primary" />
  ) : (
    <ChevronDown className="h-3 w-3 text-primary" />
  );
}

export default function PicksPage() {
  const { data, isLoading } = useTopPicks(50);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [horizonFilter, setHorizonFilter] = useState<"all" | "short" | "mid" | "long">("all");

  const signals = useMemo(() => {
    let list = data?.signals ?? [];
    // Filter by horizon
    if (horizonFilter !== "all") {
      list = list.filter((s) => {
        const days = s.horizonDays ?? 7;
        if (horizonFilter === "short") return days <= 5;
        if (horizonFilter === "mid") return days > 5 && days <= 20;
        return days > 20;
      });
    }
    return [...list].sort((a, b) => compare(a, b, sortKey, sortDir));
  }, [data, sortKey, sortDir, horizonFilter]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "ticker" ? "asc" : "desc");
    }
  }

  function Th({
    label,
    sortKeyVal,
    align = "center",
  }: {
    label: string;
    sortKeyVal: SortKey;
    align?: "left" | "center" | "right";
  }) {
    const textAlign =
      align === "left"
        ? "text-left"
        : align === "right"
          ? "text-right"
          : "text-center";
    return (
      <th
        className={`${textAlign} px-5 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors`}
        onClick={() => handleSort(sortKeyVal)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <SortIcon active={sortKey === sortKeyVal} dir={sortDir} />
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold">Top Picks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Today&apos;s highest-ranked signals, scored 0–100. Click any column to
          sort.
        </p>
      </div>

      {/* Horizon filter tabs */}
      <div className="flex gap-2">
        {(
          [
            { key: "all", label: "All Signals" },
            { key: "short", label: "Short Term (1-5d)" },
            { key: "mid", label: "Mid Term (6-20d)" },
            { key: "long", label: "Long Term (21d+)" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setHorizonFilter(tab.key)}
            className={`px-4 py-2 text-xs rounded-full font-medium transition-colors ${
              horizonFilter === tab.key
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] opacity-60">
              {(data?.signals ?? []).filter((s) => {
                const days = s.horizonDays ?? 7;
                if (tab.key === "all") return true;
                if (tab.key === "short") return days <= 5;
                if (tab.key === "mid") return days > 5 && days <= 20;
                return days > 20;
              }).length}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <Th label="Stock" sortKeyVal="ticker" align="left" />
                <Th label="Score" sortKeyVal="score" />
                <Th label="Signal" sortKeyVal="signal" />
                <Th label="Risk" sortKeyVal="risk" />
                <Th label="Price" sortKeyVal="price" align="right" />
                <Th label="Entry Zone" sortKeyVal="entry" align="right" />
                <Th label="Stop" sortKeyVal="stop" align="right" />
                <Th label="Target" sortKeyVal="target" align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-8 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : signals.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-8 text-center text-muted-foreground"
                  >
                    No signals yet.
                  </td>
                </tr>
              ) : (
                signals.map((s) => <SignalTableRow key={s.id} signal={s} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SignalTableRow({ signal: s }: { signal: Signal }) {
  const typeColor =
    s.signalType === "BUY_TODAY"
      ? "bg-emerald-500/10 text-emerald-500"
      : s.signalType === "AVOID" || s.signalType === "HIGH_RISK"
        ? "bg-red-500/10 text-red-500"
        : "bg-amber-500/10 text-amber-500";

  const riskColor =
    s.riskLevel === "LOW"
      ? "text-emerald-500"
      : s.riskLevel === "HIGH"
        ? "text-red-500"
        : "text-amber-500";

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
            <p className="text-xs text-muted-foreground truncate max-w-[140px]">
              {s.stockName}
            </p>
          </div>
        </Link>
      </td>
      <td className="px-5 py-3.5 text-center">
        <span className="font-[var(--font-mono)] font-bold">
          {Math.round(s.scoreTotal)}
        </span>
      </td>
      <td className="px-5 py-3.5 text-center">
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeColor}`}
        >
          {s.signalType.replace("_", " ")}
        </span>
      </td>
      <td className={`px-5 py-3.5 text-center text-xs font-medium ${riskColor}`}>
        {s.riskLevel ?? "—"}
      </td>
      <td className="px-5 py-3.5 text-right font-[var(--font-mono)] font-semibold text-xs">
        {s.currentPrice ? `$${s.currentPrice.toFixed(2)}` : "—"}
      </td>
      <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-muted-foreground text-xs">
        {s.entryLow && s.entryHigh
          ? `$${s.entryLow.toFixed(0)}–$${s.entryHigh.toFixed(0)}`
          : "—"}
      </td>
      <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-red-400 text-xs">
        {s.stopLoss ? `$${s.stopLoss.toFixed(0)}` : "—"}
      </td>
      <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-emerald-400 text-xs">
        {s.targetLow && s.targetHigh
          ? `$${s.targetLow.toFixed(0)}–$${s.targetHigh.toFixed(0)}`
          : "—"}
      </td>
    </tr>
  );
}
