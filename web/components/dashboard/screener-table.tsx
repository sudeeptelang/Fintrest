"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useMarketScreener } from "@/lib/hooks";
import type { ScreenerRow } from "@/lib/api";
import { StockLogo } from "@/components/stock/stock-logo";

type TabKey = "overview" | "performance" | "valuation" | "fundamentals";
type SortDir = "asc" | "desc";

interface Column {
  key: string;
  label: string;
  sortField?: keyof ScreenerRow;
  align?: "left" | "right" | "center";
  render: (row: ScreenerRow) => React.ReactNode;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "performance", label: "Performance" },
  { key: "valuation", label: "Valuation" },
  { key: "fundamentals", label: "Fundamentals" },
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

// ─── Cells ───
function TickerCell({ row }: { row: ScreenerRow }) {
  return (
    <Link href={`/stock/${row.ticker}`} className="flex items-center gap-2.5 min-w-0">
      <StockLogo ticker={row.ticker} size={28} />
      <div className="min-w-0">
        <p className="font-[var(--font-mono)] text-xs font-bold">{row.ticker}</p>
        <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
          {row.name}
        </p>
      </div>
    </Link>
  );
}

function SignalBadge({ score, type }: { score: number | null; type: string | null }) {
  if (score === null || type === null) return <span className="text-muted-foreground text-xs">—</span>;
  const color =
    type === "BUY_TODAY" ? "bg-emerald-500/10 text-emerald-500"
    : type === "WATCH" ? "bg-amber-500/10 text-amber-500"
    : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
      <span className="font-[var(--font-mono)] font-bold">{Math.round(score)}</span>
      <span>{type.replace("_", " ")}</span>
    </span>
  );
}

// ─── Column definitions ───
function getColumns(tab: TabKey): Column[] {
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
    render: (r) => (
      <div>
        <p className="font-[var(--font-mono)] text-xs font-semibold">{fmtPrice(r.price)}</p>
        {r.changePct !== null && (
          <p className={`font-[var(--font-mono)] text-[10px] ${pctColor(r.changePct)}`}>
            {fmtPct(r.changePct)}
          </p>
        )}
      </div>
    ),
  };

  const signalCol: Column = {
    key: "signal",
    label: "Signal",
    sortField: "signalScore",
    align: "center",
    render: (r) => <SignalBadge score={r.signalScore} type={r.signalType} />,
  };

  if (tab === "overview") {
    return [
      tickerCol,
      priceCol,
      { key: "volume", label: "Volume", sortField: "volume", align: "right",
        render: (r) => <span className="font-[var(--font-mono)] text-xs text-muted-foreground">{fmtVolume(r.volume)}</span> },
      { key: "relvol", label: "Rel Vol", sortField: "relVolume", align: "right",
        render: (r) => (
          <span className={`font-[var(--font-mono)] text-xs ${(r.relVolume ?? 0) >= 1.5 ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
            {r.relVolume !== null ? `${r.relVolume.toFixed(2)}x` : "—"}
          </span>
        ) },
      { key: "mcap", label: "Market Cap", sortField: "marketCap", align: "right",
        render: (r) => <span className="font-[var(--font-mono)] text-xs">{fmtMarketCap(r.marketCap)}</span> },
      { key: "sector", label: "Sector", align: "left",
        render: (r) => <span className="text-xs text-muted-foreground">{r.sector ?? "—"}</span> },
      signalCol,
    ];
  }

  if (tab === "performance") {
    const perfCell = (v: number | null) =>
      <span className={`font-[var(--font-mono)] text-xs font-semibold ${pctColor(v)}`}>{fmtPct(v, 1)}</span>;
    return [
      tickerCol,
      priceCol,
      { key: "1w", label: "1W", sortField: "perfWeek", align: "right", render: (r) => perfCell(r.perfWeek) },
      { key: "1m", label: "1M", sortField: "perfMonth", align: "right", render: (r) => perfCell(r.perfMonth) },
      { key: "3m", label: "3M", sortField: "perfQuarter", align: "right", render: (r) => perfCell(r.perfQuarter) },
      { key: "ytd", label: "YTD", sortField: "perfYtd", align: "right", render: (r) => perfCell(r.perfYtd) },
      { key: "1y", label: "1Y", sortField: "perfYear", align: "right", render: (r) => perfCell(r.perfYear) },
      { key: "52w", label: "52W Range", sortField: "week52RangePct", align: "right",
        render: (r) => (
          <div>
            <p className="font-[var(--font-mono)] text-xs">
              {r.week52Low !== null && r.week52High !== null
                ? `$${r.week52Low.toFixed(0)}–$${r.week52High.toFixed(0)}`
                : "—"}
            </p>
            {r.week52RangePct !== null && (
              <p className="font-[var(--font-mono)] text-[10px] text-muted-foreground">
                {r.week52RangePct.toFixed(0)}%
              </p>
            )}
          </div>
        ) },
      signalCol,
    ];
  }

  if (tab === "valuation") {
    return [
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
      { key: "target", label: "Target", sortField: "analystTargetPrice", align: "right",
        render: (r) => (
          <span className={`font-[var(--font-mono)] text-xs ${r.analystTargetPrice !== null && r.price !== null
            ? (r.analystTargetPrice > r.price ? "text-emerald-500" : "text-red-500") : ""}`}>
            {fmtPrice(r.analystTargetPrice)}
          </span>
        ) },
      signalCol,
    ];
  }

  // fundamentals
  return [
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
    { key: "earnings", label: "Next Earn.", align: "right",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.nextEarningsDate
            ? new Date(r.nextEarningsDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "—"}
        </span>
      ) },
    signalCol,
  ];
}

export function ScreenerTable() {
  const { data, isLoading } = useMarketScreener(50);
  const [tab, setTab] = useState<TabKey>("overview");
  const [sortField, setSortField] = useState<keyof ScreenerRow>("signalScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const columns = getColumns(tab);

  const rows = useMemo(() => {
    const list = data ?? [];
    return [...list].sort((a, b) => {
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
  }, [data, sortField, sortDir]);

  function handleSort(field: keyof ScreenerRow) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
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

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-xs rounded-md font-medium transition-colors ${
              tab === t.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto text-[10px] text-muted-foreground mr-2">
          {rows.length} stocks
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
              <tr><td colSpan={columns.length} className="px-5 py-8 text-center text-xs text-muted-foreground">No signals yet.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.ticker} className="hover:bg-muted/20 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-3 py-2 text-${col.align ?? "left"}`}>
                      {col.render(r)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
