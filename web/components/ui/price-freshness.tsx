"use client";

import { useEffect, useState } from "react";

// Market-status badge that lives below price displays. The "As of"
// timestamp + Open/Closed label is the cheapest way to remove the
// "why is this price 14 hours old" question — it just tells users
// whether they're looking at a delayed quote (during market hours)
// or yesterday's close (after-hours / weekend).
//
// Status is derived purely from the current ET clock — no server
// round-trip needed for the badge itself. The optional asOf prop
// pulls from live_quotes.updated_at (or the latest market_data bar
// when no live overlay) — passed in by the parent so each page
// can use whatever timestamp it has handy.

type MarketStatus = "open" | "pre_market" | "after_hours" | "closed";

function deriveStatus(now: Date): MarketStatus {
  // Convert to ET for hour comparisons. America/New_York handles DST.
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const hh = et.getHours();
  const mm = et.getMinutes();
  const minuteOfDay = hh * 60 + mm;
  if (day === 0 || day === 6) return "closed";
  if (minuteOfDay < 4 * 60) return "closed";          // before 4 AM ET → off
  if (minuteOfDay < 9 * 60 + 30) return "pre_market";  // 4:00 – 9:30 AM ET
  if (minuteOfDay < 16 * 60) return "open";            // 9:30 AM – 4:00 PM ET
  if (minuteOfDay < 20 * 60) return "after_hours";     // 4:00 – 8:00 PM ET
  return "closed";
}

function formatEt(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

const STATUS_LABEL: Record<MarketStatus, string> = {
  open: "Market open",
  pre_market: "Pre-market",
  after_hours: "After-hours",
  closed: "Markets closed",
};

const STATUS_DOT: Record<MarketStatus, string> = {
  open: "bg-up",
  pre_market: "bg-warn",
  after_hours: "bg-warn",
  closed: "bg-ink-400",
};

export function PriceFreshness({
  asOf,
  className,
}: {
  /** ISO timestamp of the underlying price (live_quotes.updated_at or
   *  market_data.ts). When omitted, the badge falls back to the current
   *  client time, with a "delayed" hint added during market hours. */
  asOf?: string | Date | null;
  className?: string;
}) {
  // Re-tick once a minute so the "As of" label stays current and the
  // status flips at 9:30 / 16:00 / etc. without a page refresh.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const status = deriveStatus(now);
  const stamp = asOf ? new Date(asOf) : now;

  return (
    <div
      className={["inline-flex items-center gap-1.5 text-[11px] text-ink-500 font-mono", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
      <span>As of {formatEt(stamp)}</span>
      <span className="text-ink-300">·</span>
      <span>{STATUS_LABEL[status]}</span>
      {status === "open" && <span className="text-ink-300">· delayed ~15 min</span>}
    </div>
  );
}
