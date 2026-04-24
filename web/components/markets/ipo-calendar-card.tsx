"use client";

import { useMarketIposCalendar } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { IpoCalendarItem } from "@/lib/api";

/**
 * IPO calendar — upcoming / recently-priced public offerings. FMP feed
 * returns ~30d forward + a few days back with no filter params. We
 * render the top 10 with status pills: "Expected" (upcoming), "Priced"
 * (already debuted), "Withdrawn" (pulled before pricing).
 *
 * Market cap + share count + price range are often null from FMP —
 * gracefully hide those fields per row instead of showing "—" noise.
 */
export function IpoCalendarCard() {
  const { data, isLoading } = useMarketIposCalendar(10);

  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <section className="rounded-[10px] border border-ink-200 bg-ink-0 overflow-hidden">
      <header className="px-6 py-3.5 border-b border-ink-200 flex items-center justify-between">
        <div>
          <h3 className="font-[var(--font-heading)] text-[14px] font-semibold text-ink-900">
            IPO calendar
          </h3>
          <p className="text-[11px] text-ink-500 mt-0.5">
            {data.length} {data.length === 1 ? "offering" : "offerings"} · next ~30 days
          </p>
        </div>
      </header>
      <ul className="divide-y divide-ink-100">
        {data.slice(0, 10).map((ipo) => (
          <IpoRow key={`${ipo.ticker}-${ipo.date}`} ipo={ipo} />
        ))}
      </ul>
    </section>
  );
}

function IpoRow({ ipo }: { ipo: IpoCalendarItem }) {
  return (
    <li className="px-6 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-[var(--font-mono)] text-[13px] font-semibold text-ink-900">
            {ipo.ticker}
          </span>
          {ipo.exchange && (
            <span className="font-[var(--font-mono)] text-[10px] text-ink-500">
              {ipo.exchange}
            </span>
          )}
          <StatusPill status={ipo.status} />
        </div>
        <p className="text-[12px] text-ink-600 truncate mt-0.5">{ipo.company}</p>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-ink-500 font-[var(--font-mono)]">
          {ipo.shares && <span>{formatShares(ipo.shares)} shares</span>}
          {ipo.priceRange && <span>{ipo.priceRange}</span>}
          {ipo.marketCap && <span>{formatMcap(ipo.marketCap)} cap</span>}
        </div>
      </div>
      <div className="text-[11px] text-ink-500 shrink-0 font-[var(--font-mono)] whitespace-nowrap">
        {new Date(ipo.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  const cfg =
    status === "Priced"
      ? "bg-forest-light text-forest-dark border-forest"
      : status === "Withdrawn"
      ? "bg-ink-100 text-ink-500 border-ink-300"
      : "bg-ink-50 text-ink-700 border-ink-200";
  return (
    <span className={cn("inline-flex items-center px-1.5 py-[1px] rounded text-[9px] font-semibold uppercase tracking-[0.08em] border", cfg)}>
      {status}
    </span>
  );
}

function formatShares(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

function formatMcap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n}`;
}
