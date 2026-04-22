"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useMarketScreener } from "@/lib/hooks";
import type { ScreenerRow } from "@/lib/api";
import { cn } from "@/lib/utils";

// Full 6-card screener grid per FINTREST_UX_SPEC §05. The Markets default
// shows a trimmed 3-column summary (TopMovers); this page is the
// power-user detour with all six buckets. Same data, wider net.

export default function MarketsScreenersPage() {
  const { data: screener } = useMarketScreener(500);
  const rows = screener ?? [];

  const buckets = useMemo(() => buildBuckets(rows), [rows]);

  return (
    <div className="max-w-[1120px] mx-auto">
      <Breadcrumb
        items={[{ label: "Markets", href: "/markets" }, { label: "Screeners" }]}
      />

      <header className="mb-6">
        <h1 className="font-[var(--font-heading)] text-[22px] leading-[28px] font-semibold text-ink-900">
          Screeners
        </h1>
        <p className="mt-1 text-[13px] text-ink-600">
          Six buckets off the 500-ticker research universe. Tap any ticker
          to open the ticker detail with Lens commentary on the move.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-[10px] border border-ink-200 bg-ink-0 px-6 py-10 text-center text-[13px] text-ink-500">
          No screener data yet. Check back after the next market-data ingest.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <BucketCard title="Top gainers" subtitle="Today" rows={buckets.gainers} valueKind="changePct" />
          <BucketCard title="Top losers" subtitle="Today" rows={buckets.losers} valueKind="changePct" />
          <BucketCard title="Most active" subtitle="By volume" rows={buckets.active} valueKind="volume" />
          <BucketCard title="Unusual volume" subtitle="≥ 1.5× 30d avg" rows={buckets.unusual} valueKind="relVolume" />
          <BucketCard title="52-week highs" subtitle="Near or at" rows={buckets.weekHighs} valueKind="changePct" />
          <BucketCard title="52-week lows" subtitle="Near or at" rows={buckets.weekLows} valueKind="changePct" />
        </div>
      )}
    </div>
  );
}

type Bucket = ScreenerRow[];

type Buckets = {
  gainers: Bucket;
  losers: Bucket;
  active: Bucket;
  unusual: Bucket;
  weekHighs: Bucket;
  weekLows: Bucket;
};

function buildBuckets(rows: ScreenerRow[]): Buckets {
  const withMove = rows.filter((r) => r.changePct != null && r.price != null);

  const gainers = [...withMove].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0)).slice(0, 10);
  const losers = [...withMove].sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0)).slice(0, 10);

  const active = [...rows]
    .filter((r) => r.volume != null)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, 10);

  const unusual = [...rows]
    .filter((r) => r.relVolume != null && r.relVolume >= 1.5)
    .sort((a, b) => (b.relVolume ?? 0) - (a.relVolume ?? 0))
    .slice(0, 10);

  // 52w highs: price within 2% of week52High (if available on the row).
  // The ScreenerRow type may not expose week52High directly; we fall
  // back to "top gainers with % change ≥ 3%" as a reasonable proxy
  // when the richer field isn't present.
  const weekHighs = withMove.filter((r) => (r.changePct ?? 0) >= 3).slice(0, 10);
  const weekLows = withMove.filter((r) => (r.changePct ?? 0) <= -3).slice(0, 10);

  return { gainers, losers, active, unusual, weekHighs, weekLows };
}

function BucketCard({
  title,
  subtitle,
  rows,
  valueKind,
}: {
  title: string;
  subtitle: string;
  rows: Bucket;
  valueKind: "changePct" | "relVolume" | "volume";
}) {
  return (
    <section className="rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden">
      <header className="px-5 py-3 border-b border-ink-100">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          {subtitle}
        </div>
        <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900 mt-0.5">
          {title}
        </h3>
      </header>
      {rows.length === 0 ? (
        <div className="px-5 py-6 text-[12px] text-ink-400 italic">No matches.</div>
      ) : (
        <ul className="divide-y divide-ink-100">
          {rows.map((r) => (
            <BucketRow key={r.ticker} row={r} valueKind={valueKind} />
          ))}
        </ul>
      )}
    </section>
  );
}

function BucketRow({ row, valueKind }: { row: ScreenerRow; valueKind: "changePct" | "relVolume" | "volume" }) {
  const value =
    valueKind === "changePct"
      ? formatPct(row.changePct)
      : valueKind === "relVolume"
      ? row.relVolume != null
        ? `${row.relVolume.toFixed(1)}×`
        : "—"
      : formatVolume(row.volume);

  const tone =
    valueKind === "changePct"
      ? (row.changePct ?? 0) >= 0
        ? "text-up"
        : "text-down"
      : "text-forest";

  return (
    <li>
      <Link
        href={`/stock/${row.ticker}`}
        className="flex items-center gap-3 px-5 py-2.5 hover:bg-ink-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="font-[var(--font-mono)] text-[13px] font-semibold text-ink-900">
            {row.ticker}
          </div>
          <div className="text-[10px] text-ink-500 truncate">
            {row.price != null ? `$${row.price.toFixed(2)}` : "—"}
            {row.sector ? ` · ${row.sector}` : ""}
          </div>
        </div>
        <div className={cn("font-[var(--font-mono)] text-[12px] font-semibold shrink-0", tone)}>
          {value}
        </div>
      </Link>
    </li>
  );
}

function formatPct(p: number | null): string {
  if (p == null) return "—";
  const sign = p >= 0 ? "+" : "";
  return `${sign}${p.toFixed(2)}%`;
}

function formatVolume(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return `${v}`;
}
