"use client";

import { Fragment, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, X, Sparkles } from "lucide-react";
import { useMarketScreener, useStockThesis } from "@/lib/hooks";
import type { ScreenerRow } from "@/lib/api";
import { StockLogo } from "@/components/stock/stock-logo";
import { AthenaSurface } from "@/components/ui/athena-surface";

// Lens chips filter rows by verdict OR signal type.
// "All" shows everything, lens chips filter to a specific setup.
const LENSES: { key: string; label: string; match: (r: ScreenerRow) => boolean }[] = [
  { key: "all",        label: "All",           match: () => true },
  { key: "buy",        label: "Buy Today",     match: (r) => r.signalType === "BUY_TODAY" },
  { key: "watch",      label: "Watch",         match: (r) => r.signalType === "WATCH" },
  { key: "buythedip",  label: "Buy the Dip",   match: (r) => r.verdict === "Buy the Dip" },
  { key: "breakout",   label: "Breakout",      match: (r) => r.verdict === "Breakout Setup" },
  { key: "momentum",   label: "Momentum Run",  match: (r) => r.verdict === "Momentum Run" },
  { key: "value",      label: "Value Setup",   match: (r) => r.verdict === "Value Setup" },
  { key: "event",      label: "Event-Driven",  match: (r) => r.verdict === "Event-Driven" },
  { key: "defensive",  label: "Defensive",     match: (r) => r.verdict === "Defensive Hold" },
];

type TabKey = "signals" | "performance" | "valuation" | "fundamentals";
type SortDir = "asc" | "desc";

const TABS: { key: TabKey; label: string }[] = [
  { key: "signals",      label: "Signals" },
  { key: "performance",  label: "Performance" },
  { key: "valuation",    label: "Valuation" },
  { key: "fundamentals", label: "Fundamentals" },
];

// Market cap tiers
type McTier = "all" | "mega" | "large" | "mid" | "small";
const MC_TIERS: { key: McTier; label: string; min?: number; max?: number }[] = [
  { key: "all",   label: "All Sizes" },
  { key: "mega",  label: "Mega ($200B+)", min: 200e9 },
  { key: "large", label: "Large ($10B-$200B)", min: 10e9, max: 200e9 },
  { key: "mid",   label: "Mid ($2B-$10B)", min: 2e9, max: 10e9 },
  { key: "small", label: "Small (<$2B)", max: 2e9 },
];

// ─── Formatters ───
const fmtPrice = (n: number | null) => (n === null ? "—" : `$${n.toFixed(2)}`);
const fmtPct = (n: number | null, digits = 2) => {
  if (n === null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
};
const fmtMarketCap = (n: number | null) => {
  if (n === null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
};
const fmtVolume = (n: number | null) => {
  if (n === null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};
const fmtRatio = (n: number | null) => (n === null ? "—" : n.toFixed(2));
const pctColor = (n: number | null) => {
  if (n === null) return "text-muted-foreground";
  return n >= 0 ? "text-emerald-500" : "text-red-500";
};

// Verdict badge styling — color-coded by setup character
function verdictStyle(v: string | null): { bg: string; text: string } {
  switch (v) {
    case "Buy the Dip":     return { bg: "bg-emerald-500/10",  text: "text-emerald-600" };
    case "Breakout Setup":  return { bg: "bg-blue-500/10",     text: "text-blue-600" };
    case "Momentum Run":    return { bg: "bg-primary/10",      text: "text-primary" };
    case "Value Setup":     return { bg: "bg-indigo-500/10",   text: "text-indigo-600" };
    case "Event-Driven":    return { bg: "bg-purple-500/10",   text: "text-purple-600" };
    case "Defensive Hold":  return { bg: "bg-slate-500/10",    text: "text-slate-600" };
    case "Mean Reversion":  return { bg: "bg-amber-500/10",    text: "text-amber-600" };
    case "Quality Setup":   return { bg: "bg-emerald-500/10",  text: "text-emerald-600" };
    default:                return { bg: "bg-muted/40",        text: "text-muted-foreground" };
  }
}

// ─── Primary Signal Cell — the product ───
function SignalCell({ row }: { row: ScreenerRow }) {
  const score = row.signalScore === null ? null : Math.round(row.signalScore);
  const barColor =
    score === null ? "bg-muted"
    : score >= 75 ? "bg-emerald-500"
    : score >= 60 ? "bg-emerald-400"
    : score >= 45 ? "bg-amber-400"
    : "bg-red-400";
  const v = verdictStyle(row.verdict);

  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <div className="flex items-center gap-2">
        <span className="font-[var(--font-heading)] text-lg font-bold leading-none">
          {score ?? "—"}
        </span>
        {row.verdict && (
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${v.bg} ${v.text}`}>
            {row.verdict}
          </span>
        )}
      </div>
      <div className="h-1 rounded-full bg-muted/40 overflow-hidden max-w-[120px]">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${score ?? 0}%` }}
        />
      </div>
    </div>
  );
}

function TickerCell({ row }: { row: ScreenerRow }) {
  return (
    <Link href={`/stock/${row.ticker}`} className="flex items-center gap-2.5 min-w-0">
      <StockLogo ticker={row.ticker} size={28} />
      <div className="min-w-0">
        <p className="font-[var(--font-mono)] text-xs font-bold">{row.ticker}</p>
        <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
          {row.name}
        </p>
      </div>
    </Link>
  );
}

function PriceCell({ row }: { row: ScreenerRow }) {
  return (
    <div>
      <p className="font-[var(--font-mono)] text-xs font-semibold">{fmtPrice(row.price)}</p>
      {row.changePct !== null && (
        <p className={`font-[var(--font-mono)] text-[10px] ${pctColor(row.changePct)}`}>
          {fmtPct(row.changePct)}
        </p>
      )}
    </div>
  );
}

/** Compact Entry · Stop · Target with a one-line R:R readout. */
function TradeZoneCell({ row }: { row: ScreenerRow }) {
  if (row.entryLow === null || row.stopLoss === null || row.targetLow === null)
    return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="text-[10px] font-[var(--font-mono)] leading-tight">
      <p>
        <span className="text-muted-foreground">Entry </span>
        <span className="font-semibold">${row.entryLow.toFixed(2)}–${row.entryHigh?.toFixed(2) ?? "—"}</span>
      </p>
      <p>
        <span className="text-muted-foreground">Stop </span>
        <span className="text-red-500 font-semibold">${row.stopLoss.toFixed(2)}</span>
        <span className="text-muted-foreground"> · Target </span>
        <span className="text-emerald-500 font-semibold">${row.targetHigh?.toFixed(2) ?? row.targetLow.toFixed(2)}</span>
      </p>
    </div>
  );
}

type Column = {
  key: string;
  label: string;
  sortField?: keyof ScreenerRow;
  align?: "left" | "right" | "center";
  render: (row: ScreenerRow) => React.ReactNode;
};

function getColumns(tab: TabKey): Column[] {
  const signalCol: Column = {
    key: "signal",
    label: "Signal",
    sortField: "signalScore",
    align: "left",
    render: (r) => <SignalCell row={r} />,
  };
  const tickerCol: Column = {
    key: "ticker",
    label: "Symbol",
    sortField: "ticker",
    align: "left",
    render: (r) => <TickerCell row={r} />,
  };
  const priceCol: Column = {
    key: "price",
    label: "Price",
    sortField: "price",
    align: "right",
    render: (r) => <PriceCell row={r} />,
  };

  // SIGNAL ALWAYS FIRST — per the product thesis (Athena's call is the headline, not an afterthought).
  if (tab === "signals") {
    return [
      signalCol,
      tickerCol,
      priceCol,
      {
        key: "tradezone",
        label: "Entry · Stop · Target",
        align: "left",
        render: (r) => <TradeZoneCell row={r} />,
      },
      {
        key: "rr",
        label: "R:R",
        sortField: "riskReward",
        align: "right",
        render: (r) => (
          <span className={`font-[var(--font-mono)] text-xs ${
            r.riskReward !== null && r.riskReward >= 2 ? "text-emerald-500 font-semibold" :
            r.riskReward !== null && r.riskReward >= 1.5 ? "text-emerald-400" : "text-muted-foreground"
          }`}>
            {r.riskReward !== null ? `${r.riskReward.toFixed(1)}:1` : "—"}
          </span>
        ),
      },
      {
        key: "horizon",
        label: "Horizon",
        sortField: "horizonDays",
        align: "right",
        render: (r) => (
          <span className="font-[var(--font-mono)] text-xs text-muted-foreground">
            {r.horizonDays !== null ? `${r.horizonDays}d` : "—"}
          </span>
        ),
      },
      {
        key: "relvol",
        label: "Rel Vol",
        sortField: "relVolume",
        align: "right",
        render: (r) => (
          <span className={`font-[var(--font-mono)] text-xs ${
            (r.relVolume ?? 0) >= 1.5 ? "text-emerald-500 font-semibold" : "text-muted-foreground"
          }`}>
            {r.relVolume !== null ? `${r.relVolume.toFixed(2)}x` : "—"}
          </span>
        ),
      },
      {
        key: "earn",
        label: "Next Earn.",
        sortField: "nextEarningsDate",
        align: "right",
        render: (r) => {
          if (!r.nextEarningsDate) return <span className="text-xs text-muted-foreground">—</span>;
          const days = Math.round((new Date(r.nextEarningsDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return (
            <span className={`text-xs ${days >= 0 && days <= 14 ? "text-purple-600 font-semibold" : "text-muted-foreground"}`}>
              {days < 0 ? "past" : `${days}d`}
            </span>
          );
        },
      },
    ];
  }

  if (tab === "performance") {
    const perfCell = (v: number | null) =>
      <span className={`font-[var(--font-mono)] text-xs font-semibold ${pctColor(v)}`}>{fmtPct(v, 1)}</span>;
    return [
      signalCol,
      tickerCol,
      priceCol,
      { key: "1w", label: "1W", sortField: "perfWeek", align: "right", render: (r) => perfCell(r.perfWeek) },
      { key: "1m", label: "1M", sortField: "perfMonth", align: "right", render: (r) => perfCell(r.perfMonth) },
      { key: "3m", label: "3M", sortField: "perfQuarter", align: "right", render: (r) => perfCell(r.perfQuarter) },
      { key: "ytd", label: "YTD", sortField: "perfYtd", align: "right", render: (r) => perfCell(r.perfYtd) },
      { key: "1y", label: "1Y", sortField: "perfYear", align: "right", render: (r) => perfCell(r.perfYear) },
      { key: "52w", label: "52W Pos", sortField: "week52RangePct", align: "right",
        render: (r) => (
          <span className={`font-[var(--font-mono)] text-xs ${
            (r.week52RangePct ?? 0) >= 85 ? "text-emerald-500 font-semibold" :
            (r.week52RangePct ?? 0) <= 20 ? "text-red-500" : "text-muted-foreground"
          }`}>
            {r.week52RangePct !== null ? `${r.week52RangePct.toFixed(0)}%` : "—"}
          </span>
        ) },
    ];
  }

  if (tab === "valuation") {
    return [
      signalCol,
      tickerCol,
      priceCol,
      { key: "mcap", label: "Market Cap", sortField: "marketCap", align: "right",
        render: (r) => <span className="font-[var(--font-mono)] text-xs">{fmtMarketCap(r.marketCap)}</span> },
      { key: "pe", label: "P/E", sortField: "peRatio", align: "right",
        render: (r) => <span className="font-[var(--font-mono)] text-xs">{fmtRatio(r.peRatio)}</span> },
      { key: "fwdpe", label: "Fwd P/E", sortField: "forwardPe", align: "right",
        render: (r) => <span className="font-[var(--font-mono)] text-xs">{fmtRatio(r.forwardPe)}</span> },
      { key: "peg", label: "PEG", sortField: "pegRatio", align: "right",
        render: (r) => <span className={`font-[var(--font-mono)] text-xs ${r.pegRatio !== null && r.pegRatio < 1 ? "text-emerald-500 font-semibold" : ""}`}>{fmtRatio(r.pegRatio)}</span> },
      { key: "pb", label: "P/B", sortField: "priceToBook", align: "right",
        render: (r) => <span className="font-[var(--font-mono)] text-xs">{fmtRatio(r.priceToBook)}</span> },
      { key: "beta", label: "Beta", sortField: "beta", align: "right",
        render: (r) => <span className="font-[var(--font-mono)] text-xs">{fmtRatio(r.beta)}</span> },
      { key: "target", label: "Analyst PT", sortField: "analystTargetPrice", align: "right",
        render: (r) => (
          <div>
            <p className={`font-[var(--font-mono)] text-xs ${r.analystTargetPrice !== null && r.price !== null
              ? (r.analystTargetPrice > r.price ? "text-emerald-500" : "text-red-500") : ""}`}>
              {fmtPrice(r.analystTargetPrice)}
            </p>
            {r.analystTargetPrice !== null && r.price !== null && (
              <p className={`font-[var(--font-mono)] text-[10px] ${r.analystTargetPrice > r.price ? "text-emerald-500" : "text-red-500"}`}>
                {((r.analystTargetPrice - r.price) / r.price * 100 >= 0 ? "+" : "")}{((r.analystTargetPrice - r.price) / r.price * 100).toFixed(1)}%
              </p>
            )}
          </div>
        ) },
    ];
  }

  // fundamentals
  return [
    signalCol,
    tickerCol,
    priceCol,
    { key: "roe", label: "ROE", sortField: "returnOnEquity", align: "right",
      render: (r) => <span className="font-[var(--font-mono)] text-xs">{r.returnOnEquity !== null ? `${(r.returnOnEquity * 100).toFixed(1)}%` : "—"}</span> },
    { key: "opmargin", label: "Op Margin", sortField: "operatingMargin", align: "right",
      render: (r) => <span className="font-[var(--font-mono)] text-xs">{r.operatingMargin !== null ? `${(r.operatingMargin * 100).toFixed(1)}%` : "—"}</span> },
    { key: "revg", label: "Rev Growth", sortField: "revenueGrowth", align: "right",
      render: (r) => <span className={`font-[var(--font-mono)] text-xs ${pctColor(r.revenueGrowth)}`}>{fmtPct(r.revenueGrowth, 1)}</span> },
    { key: "epsg", label: "EPS Growth", sortField: "epsGrowth", align: "right",
      render: (r) => <span className={`font-[var(--font-mono)] text-xs ${pctColor(r.epsGrowth)}`}>{fmtPct(r.epsGrowth, 1)}</span> },
    { key: "earn", label: "Next Earn.", align: "right",
      render: (r) => {
        if (!r.nextEarningsDate) return <span className="text-xs text-muted-foreground">—</span>;
        const days = Math.round((new Date(r.nextEarningsDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return (
          <span className={`text-xs ${days >= 0 && days <= 14 ? "text-purple-600 font-semibold" : "text-muted-foreground"}`}>
            {new Date(r.nextEarningsDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        );
      },
    },
  ];
}

// CSV export (signal-focused columns)
function exportCsv(rows: ScreenerRow[]) {
  const headers = [
    "Ticker", "Name", "Signal Score", "Verdict", "Signal Type",
    "Price", "Change %", "Entry Low", "Entry High", "Stop", "Target Low", "Target High",
    "R:R", "Horizon", "Rel Vol", "Next Earnings",
  ];
  const rowFor = (r: ScreenerRow) => [
    r.ticker, r.name, r.signalScore ?? "", r.verdict ?? "", r.signalType ?? "",
    r.price ?? "", r.changePct ?? "",
    r.entryLow ?? "", r.entryHigh ?? "", r.stopLoss ?? "", r.targetLow ?? "", r.targetHigh ?? "",
    r.riskReward ?? "", r.horizonDays ?? "", r.relVolume ?? "", r.nextEarningsDate ?? "",
  ];
  const csv = [
    headers.join(","),
    ...rows.map((r) => rowFor(r).map((v) => (typeof v === "string" && v.includes(",") ? `"${v}"` : v)).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fintrest-signals-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AthenaBoard({
  defaultLens = "all",
  limit = 50,
  title = "Athena's Board",
  syncUrl = false,
}: {
  defaultLens?: string;
  limit?: number;
  title?: string;
  /** When true, the selected lens is read from/written to the ?lens= URL param. */
  syncUrl?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlLens = syncUrl ? searchParams.get("lens") : null;
  const initialLens =
    urlLens && LENSES.some((l) => l.key === urlLens) ? urlLens : defaultLens;

  const { data, isLoading } = useMarketScreener(limit);
  const [tab, setTab] = useState<TabKey>("signals");
  const [lens, setLens] = useState<string>(initialLens);
  const [sortField, setSortField] = useState<keyof ScreenerRow>("signalScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [mcTierFilter, setMcTierFilter] = useState<McTier>("all");
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  // URL → state: when the ?lens= param changes (back/forward nav, deep-link, redirect),
  // adopt the new lens. Runs on mount too, so /picks?lens=momentum lands pre-filtered
  // even if the URL param wasn't available during initial SSR render.
  useEffect(() => {
    if (!syncUrl) return;
    const fromUrl = searchParams.get("lens");
    const resolved = fromUrl && LENSES.some((l) => l.key === fromUrl) ? fromUrl : "all";
    setLens((prev) => (prev === resolved ? prev : resolved));
  }, [syncUrl, searchParams]);

  // state → URL: user clicks a chip, push the new value to the URL without a scroll jump.
  function selectLens(next: string) {
    setLens(next);
    if (!syncUrl) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("lens");
    else params.set("lens", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const columns = getColumns(tab);
  const currentLens = LENSES.find((l) => l.key === lens) ?? LENSES[0];

  const rows = useMemo(() => {
    const list = data ?? [];
    const mcTier = MC_TIERS.find((t) => t.key === mcTierFilter);
    const filtered = list.filter((r) => {
      if (!currentLens.match(r)) return false;
      if (mcTier && (mcTier.min !== undefined || mcTier.max !== undefined)) {
        const mc = r.marketCap ?? 0;
        if (mcTier.min !== undefined && mc < mcTier.min) return false;
        if (mcTier.max !== undefined && mc >= mcTier.max) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const diff = Number(av) - Number(bv);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [data, sortField, sortDir, currentLens, mcTierFilter]);

  function handleSort(field: keyof ScreenerRow) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir(typeof data?.[0]?.[field] === "string" ? "asc" : "desc");
    }
  }

  function SortIcon({ field }: { field: keyof ScreenerRow }) {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40 inline ml-0.5" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-primary inline ml-0.5" />
      : <ChevronDown className="h-3 w-3 text-primary inline ml-0.5" />;
  }

  const hasLensFilter = lens !== "all" || mcTierFilter !== "all";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header + title */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-[var(--font-heading)] text-base font-semibold">{title}</h2>
        <span className="text-[10px] text-muted-foreground">
          {rows.length} {rows.length === 1 ? "stock" : "stocks"}
        </span>
      </div>

      {/* Lens chips — filter by verdict/setup */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border flex-wrap">
        {LENSES.map((l) => (
          <button
            key={l.key}
            onClick={() => selectLens(l.key)}
            className={`px-3 py-1 text-[11px] rounded-full font-medium transition-colors ${
              lens === l.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Data-view tabs + utilities */}
      <div className="flex items-center gap-1 p-2 border-b border-border flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              tab === t.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <select
            value={mcTierFilter}
            onChange={(e) => setMcTierFilter(e.target.value as McTier)}
            className="text-[11px] bg-muted/30 border border-border rounded-md px-2 py-1 outline-none focus:border-primary/50"
          >
            {MC_TIERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          {hasLensFilter && (
            <button
              onClick={() => { selectLens("all"); setMcTierFilter("all"); }}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          <button
            onClick={() => exportCsv(rows)}
            disabled={rows.length === 0}
            className="text-[11px] font-medium flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortField ? () => handleSort(col.sortField!) : undefined}
                  className={`px-3 py-2.5 font-medium text-[10px] uppercase tracking-wider text-muted-foreground text-${col.align ?? "left"} ${
                    col.sortField ? "cursor-pointer select-none hover:text-foreground transition-colors" : ""
                  }`}
                >
                  {col.label}
                  {col.sortField && <SortIcon field={col.sortField} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr><td colSpan={columns.length} className="px-5 py-8 text-center text-xs text-muted-foreground">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-5 py-8 text-center text-xs text-muted-foreground">No signals match this lens.</td></tr>
            ) : (
              rows.map((r) => {
                const isExpanded = expandedTicker === r.ticker;
                return (
                  <Fragment key={r.ticker}>
                    <tr
                      onClick={() =>
                        setExpandedTicker((curr) => (curr === r.ticker ? null : r.ticker))
                      }
                      className={`cursor-pointer hover:bg-muted/20 transition-colors ${
                        isExpanded ? "bg-muted/30" : ""
                      }`}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={`px-3 py-2 text-${col.align ?? "left"}`}>
                          {col.render(r)}
                        </td>
                      ))}
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={columns.length} className="p-0">
                          <ThesisRowInline ticker={r.ticker} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Thesis preview rendered as an expanded row beneath any AthenaBoard row.
 * Lazily calls the thesis endpoint so rows only pay for LLM output when clicked.
 */
function ThesisRowInline({ ticker }: { ticker: string }) {
  const { data, isLoading, error } = useStockThesis(ticker);

  if (isLoading) {
    return (
      <AthenaSurface rounded="">
        <div className="px-4 py-3 text-white/80 text-xs flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-[#00b87c] animate-pulse" />
          Athena is preparing the thesis for {ticker}…
        </div>
      </AthenaSurface>
    );
  }
  if (error || !data) {
    return (
      <AthenaSurface rounded="">
        <div className="px-4 py-3 text-white/60 text-xs flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-white/40" />
          No thesis cached for {ticker} yet. Click the ticker to open the full stock page — the
          thesis will generate on first visit.
        </div>
      </AthenaSurface>
    );
  }

  return (
    <AthenaSurface rounded="">
      <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-3.5 w-3.5 text-[#00b87c]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
            Athena Says
          </span>
          {data.verdict && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00b87c]">
              {data.verdict}
            </span>
          )}
          {data.tier && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              {data.tier}
            </span>
          )}
        </div>
        <Link
          href={`/stock/${ticker}`}
          className="text-[10px] text-[#00b87c] hover:underline shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          Open full analysis →
        </Link>
      </div>
      <p className="text-xs leading-relaxed text-white/90 line-clamp-4">
        {data.thesis}
      </p>
      {(data.catalysts.length > 0 || data.risks.length > 0) && (
        <div className="grid md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/10">
          {data.catalysts.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#00b87c] mb-1">
                Catalysts
              </p>
              <ul className="space-y-0.5">
                {data.catalysts.slice(0, 3).map((c, i) => (
                  <li key={i} className="text-[11px] text-white/80 leading-snug">
                    • {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.risks.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400 mb-1">
                Risks
              </p>
              <ul className="space-y-0.5">
                {data.risks.slice(0, 3).map((r, i) => (
                  <li key={i} className="text-[11px] text-white/80 leading-snug">
                    • {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      </div>
    </AthenaSurface>
  );
}
