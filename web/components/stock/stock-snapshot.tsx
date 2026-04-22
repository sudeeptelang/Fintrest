"use client";

import { motion } from "framer-motion";
import type { StockSnapshot } from "@/lib/api";

interface Props {
  snapshot: StockSnapshot;
}

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

function fmtPrice(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `$${n.toFixed(2)}`;
}

function fmtMarketCap(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

function fmtVolume(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n.toFixed(0)}`;
}

function fmtRatio(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(2);
}

function pctClass(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "text-muted-foreground";
  if (n > 0) return "text-emerald-500";
  if (n < 0) return "text-red-500";
  return "text-muted-foreground";
}

interface DataItem {
  label: string;
  value: string;
  valueClass?: string;
}

function Cell({ label, value, valueClass }: DataItem) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border/40 last:border-b-0">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground shrink-0">
        {label}
      </span>
      <span
        className={`font-[var(--font-mono)] text-sm font-semibold text-right truncate ${
          valueClass ?? ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Section({ title, items }: { title: string; items: DataItem[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
        {title}
      </h3>
      <div className="space-y-0">
        {items.map((item) => (
          <Cell key={item.label} {...item} />
        ))}
      </div>
    </div>
  );
}

// Honest empty-state per QA-P0-3: hide a section when more than half the
// cells are `—`. Without this filter we ship cards that look like data but
// carry no information, which is the main complaint from the MSFT review.
function density(items: DataItem[]): number {
  if (items.length === 0) return 0;
  const filled = items.filter((i) => i.value !== "—").length;
  return filled / items.length;
}

export function StockSnapshot({ snapshot: s }: Props) {
  const valuation: DataItem[] = [
    { label: "Market Cap", value: fmtMarketCap(s.marketCap) },
    { label: "Float", value: s.floatShares ? `${(s.floatShares / 1e6).toFixed(0)}M` : "—" },
    { label: "P/E", value: fmtRatio(s.peRatio) },
    { label: "Forward P/E", value: fmtRatio(s.forwardPe) },
    { label: "PEG", value: fmtRatio(s.pegRatio) },
    { label: "P/S", value: fmtRatio(s.psRatio) },
    { label: "P/B", value: fmtRatio(s.priceToBook) },
    { label: "Debt/Eq", value: fmtRatio(s.debtToEquity) },
    { label: "Beta", value: fmtRatio(s.beta) },
  ];

  const margins: DataItem[] = [
    {
      label: "Gross Margin",
      value: s.grossMargin !== null ? `${(s.grossMargin * 100).toFixed(1)}%` : "—",
    },
    {
      label: "Op Margin",
      value: s.operatingMargin !== null ? `${(s.operatingMargin * 100).toFixed(1)}%` : "—",
    },
    {
      label: "Net Margin",
      value: s.netMargin !== null ? `${(s.netMargin * 100).toFixed(1)}%` : "—",
    },
    {
      label: "ROE",
      value: s.returnOnEquity !== null ? `${(s.returnOnEquity * 100).toFixed(1)}%` : "—",
      valueClass: pctClass(s.returnOnEquity),
    },
    {
      label: "ROA",
      value: s.returnOnAssets !== null ? `${(s.returnOnAssets * 100).toFixed(1)}%` : "—",
      valueClass: pctClass(s.returnOnAssets),
    },
    {
      label: "Rev Growth",
      value: fmtPct(s.revenueGrowth !== null ? s.revenueGrowth * 100 : null),
      valueClass: pctClass(s.revenueGrowth),
    },
    {
      label: "EPS Growth",
      value: fmtPct(s.epsGrowth !== null ? s.epsGrowth * 100 : null),
      valueClass: pctClass(s.epsGrowth),
    },
    {
      label: "Analyst Target",
      value: fmtPrice(s.analystTargetPrice),
      valueClass:
        s.analystTargetPrice !== null && s.price !== null
          ? s.analystTargetPrice > s.price
            ? "text-emerald-500"
            : "text-red-500"
          : undefined,
    },
    {
      label: "Next Earnings",
      value: s.nextEarningsDate
        ? new Date(s.nextEarningsDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "—",
    },
  ];

  const performance: DataItem[] = [
    { label: "Perf Week", value: fmtPct(s.perfWeek), valueClass: pctClass(s.perfWeek) },
    { label: "Perf Month", value: fmtPct(s.perfMonth), valueClass: pctClass(s.perfMonth) },
    {
      label: "Perf Quarter",
      value: fmtPct(s.perfQuarter),
      valueClass: pctClass(s.perfQuarter),
    },
    { label: "Perf YTD", value: fmtPct(s.perfYtd), valueClass: pctClass(s.perfYtd) },
    { label: "Perf Year", value: fmtPct(s.perfYear), valueClass: pctClass(s.perfYear) },
    { label: "52W High", value: fmtPrice(s.week52High) },
    { label: "52W Low", value: fmtPrice(s.week52Low) },
    {
      label: "52W Range",
      value: s.week52RangePct !== null ? `${s.week52RangePct.toFixed(0)}%` : "—",
    },
  ];

  const volume: DataItem[] = [
    { label: "Price", value: fmtPrice(s.price) },
    { label: "Prev Close", value: fmtPrice(s.prevClose) },
    {
      label: "Day Change",
      value: s.change !== null && s.changePct !== null
        ? `${s.change >= 0 ? "+" : ""}${s.change.toFixed(2)} (${fmtPct(s.changePct)})`
        : "—",
      valueClass: pctClass(s.changePct),
    },
    { label: "Day Open", value: fmtPrice(s.dayOpen) },
    { label: "Day High", value: fmtPrice(s.dayHigh) },
    { label: "Day Low", value: fmtPrice(s.dayLow) },
    { label: "Volume", value: fmtVolume(s.volume) },
    { label: "Avg Volume", value: fmtVolume(s.avgVolume) },
    {
      label: "Rel Volume",
      value: s.relVolume !== null ? `${s.relVolume.toFixed(2)}x` : "—",
      valueClass:
        s.relVolume !== null && s.relVolume >= 1.5
          ? "text-emerald-500"
          : "text-foreground",
    },
  ];

  const technicals: DataItem[] = [
    {
      label: "RSI (14)",
      value: fmtNum(s.rsi, 1),
      valueClass:
        s.rsi !== null && s.rsi >= 70
          ? "text-red-500"
          : s.rsi !== null && s.rsi <= 30
            ? "text-emerald-500"
            : "text-foreground",
    },
    { label: "ATR", value: fmtNum(s.atr, 2) },
    {
      label: "ATR %",
      value: s.atrPct !== null ? `${s.atrPct.toFixed(2)}%` : "—",
    },
    { label: "SMA 20", value: fmtPrice(s.ma20) },
    {
      label: "vs SMA 20",
      value: fmtPct(s.pctFromMa20),
      valueClass: pctClass(s.pctFromMa20),
    },
    { label: "SMA 50", value: fmtPrice(s.ma50) },
    {
      label: "vs SMA 50",
      value: fmtPct(s.pctFromMa50),
      valueClass: pctClass(s.pctFromMa50),
    },
    { label: "SMA 200", value: fmtPrice(s.ma200) },
    {
      label: "vs SMA 200",
      value: fmtPct(s.pctFromMa200),
      valueClass: pctClass(s.pctFromMa200),
    },
  ];

  const sections: { title: string; items: DataItem[] }[] = [
    { title: "Valuation", items: valuation },
    { title: "Margins · Estimates", items: margins },
    { title: "Performance", items: performance },
    { title: "Quote · Volume", items: volume },
    { title: "Technicals", items: technicals },
  ].filter((s) => density(s.items) >= 0.5);

  if (sections.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <h2 className="font-[var(--font-heading)] text-lg font-semibold">Snapshot</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {sections.map((s) => (
          <Section key={s.title} title={s.title} items={s.items} />
        ))}
      </div>
    </motion.div>
  );
}
