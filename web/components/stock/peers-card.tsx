"use client";

import Link from "next/link";
import { usePeers } from "@/lib/hooks";
import type { PeerRow } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StockLogo } from "@/components/ui/stock-logo";
import { ScoreGradeChip } from "@/components/ui/score-grade-chip";

/**
 * Compare Mode — sector peers for the current ticker. FMP's /stock-peers
 * list is enriched with our own signal score + live quote so each
 * peer row renders a letter grade + price + today's change.
 *
 * Clicking any peer navigates to its ticker detail page. Peers we
 * haven't ingested yet show as "not in universe" (ticker only, no
 * price/score) so the list still hints at competitive set even when
 * our coverage is incomplete.
 */
export function PeersCard({ ticker, className }: { ticker: string; className?: string }) {
  const { data } = usePeers(ticker);
  if (!data || data.peers.length === 0) return null;

  // Surface the peers we actually carry first; stragglers go at the
  // bottom so the useful rows read top-of-list.
  const sorted = [...data.peers].sort((a, b) => {
    if (a.inUniverse !== b.inUniverse) return a.inUniverse ? -1 : 1;
    return (b.score ?? -1) - (a.score ?? -1);
  });

  return (
    <div className={cn("rounded-[10px] border border-ink-200 bg-ink-0 p-4 md:p-5", className)}>
      <div className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600 mb-3">
        Sector peers · {data.peerCount} via FMP
      </div>
      <ul className="divide-y divide-ink-100">
        {sorted.slice(0, 8).map((peer) => (
          <PeerLine key={peer.ticker} peer={peer} />
        ))}
      </ul>
      <p className="mt-3 text-[10px] text-ink-500 leading-tight">
        Peers from FMP's /stock-peers — scored with our composite where we carry the
        ticker, grey "not in universe" otherwise. Click any peer to open its detail page.
      </p>
    </div>
  );
}

function PeerLine({ peer }: { peer: PeerRow }) {
  const up = (peer.changePct ?? 0) >= 0;
  const row = (
    <div className={cn("flex items-center gap-3 py-2.5", !peer.inUniverse && "opacity-50")}>
      <StockLogo ticker={peer.ticker} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="font-[var(--font-heading)] text-[13px] font-bold text-ink-900 leading-tight">
          {peer.ticker}
        </div>
        <div className="font-[var(--font-sans)] text-[10px] text-ink-500 leading-tight mt-0.5 truncate">
          {peer.name ?? (peer.inUniverse ? "—" : "Not in our universe yet")}
        </div>
      </div>
      {peer.price != null && (
        <div className="text-right leading-tight flex-shrink-0">
          <div className="font-mono text-[12px] font-medium text-ink-900">
            ${peer.price.toFixed(2)}
          </div>
          {peer.changePct != null && (
            <div className={cn("font-mono text-[10px]", up ? "text-up" : "text-down")}>
              {up ? "+" : ""}{peer.changePct.toFixed(2)}%
            </div>
          )}
        </div>
      )}
      <ScoreGradeChip score={peer.score} size="sm" showDelta={false} showNum={false} />
    </div>
  );

  if (peer.inUniverse) {
    return (
      <li>
        <Link href={`/stock/${peer.ticker}`} className="block hover:bg-ink-50 rounded-md -mx-2 px-2 transition-colors">
          {row}
        </Link>
      </li>
    );
  }
  return <li>{row}</li>;
}
