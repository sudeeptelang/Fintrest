"use client";

import Link from "next/link";
import { Users, Landmark, ExternalLink } from "lucide-react";
import { useInsidersByTicker, useCongressByTicker } from "@/lib/hooks";
import type { InsiderActivity, CongressTradeRow } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Ticker-detail Congress + Insider activity cards — the replacement
 * surface for the retired /insiders and /congress firehose pages.
 * Data is read from the same market_firehose_snapshots cache but
 * filtered per ticker. Empty states are explicit so an empty card
 * doesn't feel broken.
 */

export function InsiderActivityCard({ ticker, className }: { ticker: string; className?: string }) {
  const { data, isLoading } = useInsidersByTicker(ticker, 10);
  const rows = data ?? [];

  return (
    <section
      className={cn(
        "rounded-[12px] border border-ink-200 bg-ink-0 overflow-hidden",
        "relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-teal",
        className,
      )}
    >
      <header className="pl-6 pr-5 py-4 border-b border-ink-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 grid place-items-center rounded-md bg-teal-light text-teal">
            <Users className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="font-[var(--font-heading)] text-[15px] font-semibold text-ink-900 leading-tight">
              Insider activity · {ticker}
            </h3>
            <p className="font-mono text-[11px] text-ink-500 leading-tight mt-0.5">
              Last 10 Form 4 filings · 1–2d disclosure lag
            </p>
          </div>
        </div>
      </header>
      {isLoading ? (
        <div className="px-6 py-6 text-[12px] text-ink-500 font-mono">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="font-[var(--font-sans)] text-[13px] text-ink-600">
            No recent insider filings on record.
          </p>
          <p className="mt-1 font-[var(--font-sans)] text-[11px] text-ink-500 italic">
            Firehose refreshes nightly at 6:15 AM ET.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-ink-100">
          {rows.map((r, i) => (
            <InsiderRow key={i} row={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

function InsiderRow({ row }: { row: InsiderActivity }) {
  const kind = (row.transactionType ?? "").toUpperCase();
  const isBuy = kind.includes("BUY") || kind.includes("PURCHASE") || kind === "P";
  const isSell = kind.includes("SELL") || kind.includes("SALE") || kind === "S";
  const tone = isBuy ? "text-up" : isSell ? "text-down" : "text-ink-600";
  const label = isBuy ? "Buy" : isSell ? "Sell" : (row.transactionType ?? "Filing");

  return (
    <li className="pl-6 pr-5 py-3 flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <div className="font-[var(--font-sans)] text-[13px] text-ink-900 font-medium">
          {row.reportingName || "Undisclosed filer"}
          {row.relationship && (
            <span className="text-ink-500 font-normal"> · {row.relationship}</span>
          )}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-ink-600">
          {fmtDate(row.transactionDate ?? row.filingDate)} · {label}
          {row.sharesTraded != null && ` · ${fmtShares(row.sharesTraded)} sh`}
          {row.price != null && ` @ $${row.price.toFixed(2)}`}
        </div>
      </div>
      <div className={cn("font-mono text-[13px] font-semibold whitespace-nowrap", tone)}>
        {row.totalValue != null ? fmtDollars(row.totalValue, isSell) : "—"}
      </div>
    </li>
  );
}

export function CongressActivityCard({ ticker, className }: { ticker: string; className?: string }) {
  const { data, isLoading } = useCongressByTicker(ticker, 10);
  const rows = data ?? [];

  return (
    <section
      className={cn(
        "rounded-[12px] border border-ink-200 bg-ink-0 overflow-hidden",
        "relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-plum",
        className,
      )}
    >
      <header className="pl-6 pr-5 py-4 border-b border-ink-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 grid place-items-center rounded-md bg-plum-light text-plum">
            <Landmark className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="font-[var(--font-heading)] text-[15px] font-semibold text-ink-900 leading-tight">
              Congressional trades · {ticker}
            </h3>
            <p className="font-mono text-[11px] text-ink-500 leading-tight mt-0.5">
              Senate + House disclosures · up to 45-day STOCK Act lag
            </p>
          </div>
        </div>
      </header>
      {isLoading ? (
        <div className="px-6 py-6 text-[12px] text-ink-500 font-mono">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="font-[var(--font-sans)] text-[13px] text-ink-600">
            No Congressional disclosures on record for this ticker.
          </p>
          <p className="mt-1 font-[var(--font-sans)] text-[11px] text-ink-500 italic">
            Most tickers sit empty — disclosures concentrate in a narrow universe.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-ink-100">
          {rows.map((r, i) => (
            <CongressRow key={i} row={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CongressRow({ row }: { row: CongressTradeRow }) {
  const isBuy = (row.transactionType ?? "").toLowerCase().includes("purchase");
  const tone = isBuy ? "text-up" : row.transactionType ? "text-down" : "text-ink-600";

  return (
    <li className="pl-6 pr-5 py-3 flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <div className="font-[var(--font-sans)] text-[13px] text-ink-900 font-medium flex items-center gap-2">
          <span>{row.representative || "Member"}</span>
          <span className="inline-flex items-center px-1.5 py-[1px] rounded bg-ink-100 text-ink-600 text-[10px] font-mono uppercase tracking-wide">
            {row.chamber}
          </span>
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-ink-600">
          {fmtDate(row.transactionDate ?? row.disclosureDate)} · {row.transactionType ?? "—"}
          {row.amount && ` · ${row.amount}`}
        </div>
      </div>
      {row.sourceUrl ? (
        <Link
          href={row.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "font-mono text-[11px] font-medium whitespace-nowrap inline-flex items-center gap-1 hover:underline",
            tone,
          )}
        >
          Filing <ExternalLink className="h-2.5 w-2.5" strokeWidth={2.2} />
        </Link>
      ) : (
        <span className={cn("font-mono text-[11px] font-semibold whitespace-nowrap", tone)}>
          {row.transactionType ?? "—"}
        </span>
      )}
    </li>
  );
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function fmtShares(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtDollars(v: number, negative = false): string {
  const abs = Math.abs(v);
  const sign = negative ? "−" : "+";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}
