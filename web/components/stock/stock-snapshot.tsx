"use client";

import type { StockSnapshot as StockSnapshotData } from "@/lib/api";
import { cn } from "@/lib/utils";

// Yahoo Finance-style fundamentals view — adopted because nobody else hits
// that information density without sacrificing scannability. Two surfaces:
//   1. Key statistics strip (Yahoo's Summary tab) — 11-row 2-col grid for
//      the at-a-glance read.
//   2. Statistics tables (Yahoo's Statistics tab) — accounting-domain
//      groups (Valuation Measures, Profitability, Management
//      Effectiveness, Income Statement, Balance Sheet, Stock Price
//      History, Share Statistics) rendered as stacked dense tables.

interface Props {
  snapshot: StockSnapshotData;
}

type Item = { label: string; value: string; valueClass?: string };

function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}
function fmtPrice(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${n.toFixed(2)}`;
}
function fmtMarketCap(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}
function fmtVolume(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n.toFixed(0)}`;
}
function fmtRatio(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(2);
}
// Backend stores margins/growth as decimals (0.42 = 42%); render as percent.
function fmtPercentRaw(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}
function pctToneClass(n: number | null | undefined): string {
  if (n == null) return "";
  return n >= 0 ? "text-up" : "text-down";
}
function density(items: Item[]): number {
  if (items.length === 0) return 0;
  return items.filter((i) => i.value !== "—").length / items.length;
}

function Row({ item }: { item: Item }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-ink-100 last:border-b-0">
      <span className="text-[12px] text-ink-600 shrink-0">{item.label}</span>
      <span
        className={cn(
          "font-[var(--font-mono)] text-[13px] font-medium text-ink-900 text-right tabular-nums",
          item.valueClass,
        )}
      >
        {item.value}
      </span>
    </div>
  );
}

function Table({ title, items }: { title: string; items: Item[] }) {
  // Honest empty-state per QA-P0-3 — hide a table when more than half the
  // cells are em dashes. Avoids shipping cards that look like data but
  // carry no information.
  if (density(items) < 0.5) return null;
  return (
    <div>
      <h3 className="font-[var(--font-sans)] text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-2 pb-2 border-b border-ink-100">
        {title}
      </h3>
      <div>
        {items.map((it) => (
          <Row key={it.label} item={it} />
        ))}
      </div>
    </div>
  );
}

export function StockSnapshot({ snapshot: s }: Props) {
  const dayRange =
    s.dayLow != null && s.dayHigh != null ? `${fmtPrice(s.dayLow)} – ${fmtPrice(s.dayHigh)}` : "—";
  const week52Range =
    s.week52Low != null && s.week52High != null ? `${fmtPrice(s.week52Low)} – ${fmtPrice(s.week52High)}` : "—";
  const targetUpside =
    s.analystTargetPrice != null && s.price != null && s.price > 0
      ? ((s.analystTargetPrice - s.price) / s.price) * 100
      : null;

  // Key statistics strip — Yahoo Summary-tab style.
  const keyStats: Item[] = [
    { label: "Previous Close", value: fmtPrice(s.prevClose) },
    { label: "Open", value: fmtPrice(s.dayOpen) },
    { label: "Day's Range", value: dayRange },
    { label: "52 Week Range", value: week52Range },
    { label: "Volume", value: fmtVolume(s.volume) },
    { label: "Avg Volume", value: fmtVolume(s.avgVolume) },
    { label: "Market Cap", value: fmtMarketCap(s.marketCap) },
    { label: "Beta (5Y Monthly)", value: fmtRatio(s.beta) },
    { label: "PE Ratio (TTM)", value: fmtRatio(s.peRatio) },
    {
      label: "Earnings Date",
      value: s.nextEarningsDate
        ? new Date(s.nextEarningsDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—",
    },
    {
      label: "1y Target Est",
      value: fmtPrice(s.analystTargetPrice),
      valueClass: targetUpside != null ? (targetUpside > 0 ? "text-up" : "text-down") : undefined,
    },
  ];

  // Statistics tables — accounting-domain groups, Yahoo's exact mental
  // model. Full names ("Return on Equity", not "ROE") so the page reads
  // like a financial report, not a dashboard.
  const valuationMeasures: Item[] = [
    { label: "Market Cap", value: fmtMarketCap(s.marketCap) },
    { label: "Trailing P/E", value: fmtRatio(s.peRatio) },
    { label: "Forward P/E", value: fmtRatio(s.forwardPe) },
    { label: "PEG Ratio (5 yr expected)", value: fmtRatio(s.pegRatio) },
    { label: "Price / Sales (TTM)", value: fmtRatio(s.psRatio) },
    { label: "Price / Book", value: fmtRatio(s.priceToBook) },
  ];

  const profitability: Item[] = [
    { label: "Profit Margin", value: fmtPercentRaw(s.netMargin), valueClass: pctToneClass(s.netMargin) },
    { label: "Operating Margin (TTM)", value: fmtPercentRaw(s.operatingMargin), valueClass: pctToneClass(s.operatingMargin) },
    { label: "Gross Margin", value: fmtPercentRaw(s.grossMargin), valueClass: pctToneClass(s.grossMargin) },
  ];

  const managementEffectiveness: Item[] = [
    { label: "Return on Assets (TTM)", value: fmtPercentRaw(s.returnOnAssets), valueClass: pctToneClass(s.returnOnAssets) },
    { label: "Return on Equity (TTM)", value: fmtPercentRaw(s.returnOnEquity), valueClass: pctToneClass(s.returnOnEquity) },
  ];

  const incomeStatement: Item[] = [
    { label: "Quarterly Revenue Growth (YoY)", value: fmtPercentRaw(s.revenueGrowth), valueClass: pctToneClass(s.revenueGrowth) },
    { label: "Quarterly Earnings Growth (YoY)", value: fmtPercentRaw(s.epsGrowth), valueClass: pctToneClass(s.epsGrowth) },
  ];

  const balanceSheet: Item[] = [
    { label: "Total Debt / Equity", value: fmtRatio(s.debtToEquity) },
  ];

  const stockPriceHistory: Item[] = [
    { label: "Beta (5Y Monthly)", value: fmtRatio(s.beta) },
    { label: "52-Week Change", value: fmtPct(s.perfYear), valueClass: pctToneClass(s.perfYear) },
    { label: "52 Week High", value: fmtPrice(s.week52High) },
    { label: "52 Week Low", value: fmtPrice(s.week52Low) },
    { label: "50-Day Moving Average", value: fmtPrice(s.ma50) },
    { label: "200-Day Moving Average", value: fmtPrice(s.ma200) },
  ];

  const shareStatistics: Item[] = [
    { label: "Avg Vol (3 month)", value: fmtVolume(s.avgVolume) },
    { label: "Float", value: s.floatShares != null ? fmtVolume(s.floatShares) : "—" },
  ];

  const subTables: { title: string; items: Item[] }[] = [
    { title: "Profitability", items: profitability },
    { title: "Management Effectiveness", items: managementEffectiveness },
    { title: "Income Statement", items: incomeStatement },
    { title: "Balance Sheet", items: balanceSheet },
    { title: "Stock Price History", items: stockPriceHistory },
    { title: "Share Statistics", items: shareStatistics },
  ];

  // Bail out entirely if the snapshot is too sparse to render anything
  // useful — avoids a card stack of "—" rows.
  const anyDense =
    density(keyStats) >= 0.5 || density(valuationMeasures) >= 0.5 || subTables.some((t) => density(t.items) >= 0.5);
  if (!anyDense) return null;

  return (
    <div className="space-y-4">
      {/* Key statistics strip — Yahoo Summary-tab style at-a-glance read. */}
      {density(keyStats) >= 0.5 && (
        <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-5">
          <h2 className="font-[var(--font-sans)] text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500 mb-3">
            Key statistics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            {keyStats.map((it) => (
              <Row key={it.label} item={it} />
            ))}
          </div>
        </div>
      )}

      {/* Statistics tables — Yahoo Statistics-tab grouping. Valuation
          Measures rendered full-width (Yahoo puts it on top with the
          most weight); the rest stack into a 2-col responsive grid. */}
      {(density(valuationMeasures) >= 0.5 || subTables.some((t) => density(t.items) >= 0.5)) && (
        <div className="rounded-[10px] border border-ink-200 bg-ink-0 p-5">
          <h2 className="font-[var(--font-sans)] text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500 mb-4">
            Statistics
          </h2>
          <div className="space-y-6">
            {density(valuationMeasures) >= 0.5 && (
              <Table title="Valuation Measures" items={valuationMeasures} />
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
              {subTables.map((t) => (
                <Table key={t.title} title={t.title} items={t.items} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
