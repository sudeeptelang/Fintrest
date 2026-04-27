"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useMarketSectors } from "@/lib/hooks";
import type { SectorPerformance } from "@/lib/api";
import { cn } from "@/lib/utils";

// Reusable sector heatmap. Two layout variants:
//   - "full"    → /heatmap standalone page; large tiles, sized by stock count
//   - "compact" → /markets inline strip; uniform small tiles in one row
//
// Both consume /market/sectors which now returns 11 GICS sectors with %s
// from FMP /sector-performance-snapshot directly.

export function SectorHeatmap({
  variant = "full",
  className,
}: {
  variant?: "full" | "compact";
  className?: string;
}) {
  const { data: sectors, isLoading } = useMarketSectors();

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center", variant === "compact" ? "h-24" : "h-64", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-ink-400" />
      </div>
    );
  }

  const list: SectorPerformance[] = sectors ?? [];
  if (list.length === 0) {
    return (
      <div className={cn("rounded-[10px] border border-ink-200 bg-ink-0 text-center text-[12px] text-ink-500", variant === "compact" ? "py-6" : "py-8", className)}>
        No sector data yet.
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1.5", className)}>
        {list.map((s) => (
          <SectorTile key={s.sector} sector={s} compact />
        ))}
      </div>
    );
  }

  // Full grid — sized by stock count quartile so dominant sectors look bigger.
  const maxCount = list.reduce((m, s) => Math.max(m, s.stockCount), 0);
  return (
    <div className={cn("grid grid-cols-4 lg:grid-cols-6 gap-2 auto-rows-[120px]", className)}>
      {list.map((s) => (
        <SectorTile key={s.sector} sector={s} sizeClass={getSizeClass(s.stockCount, maxCount)} />
      ))}
    </div>
  );
}

function SectorTile({
  sector,
  compact,
  sizeClass,
}: {
  sector: SectorPerformance;
  compact?: boolean;
  sizeClass?: string;
}) {
  const positive = (sector.changePct ?? 0) >= 0;
  const hasData = sector.changePct != null;

  // v3 tokens — `up` for positive, `down` for negative (warm gray-brown).
  const tone = !hasData
    ? "bg-ink-50 border-ink-200 hover:border-ink-300"
    : positive
    ? "bg-up/10 border-up/20 hover:border-up/40"
    : "bg-down/10 border-down/20 hover:border-down/40";

  const valueClass = !hasData
    ? "text-ink-400"
    : positive
    ? "text-up"
    : "text-down";

  return (
    <Link
      href="/heatmap"
      className={cn(
        "rounded-[8px] border p-3 flex flex-col justify-between transition-colors",
        tone,
        sizeClass,
        compact && "min-h-[64px]",
      )}
    >
      <div>
        <p className={cn("font-[var(--font-sans)] font-semibold truncate", compact ? "text-[11px]" : "text-[13px]")}>
          {sector.sector}
        </p>
        {!compact && (
          <p className="text-[11px] text-ink-500">
            {sector.stockCount} stock{sector.stockCount === 1 ? "" : "s"}
          </p>
        )}
      </div>
      <div>
        <p className={cn("font-[var(--font-mono)] font-bold leading-none", valueClass, compact ? "text-[13px] mt-1" : "text-[18px]")}>
          {hasData ? `${positive ? "+" : ""}${sector.changePct!.toFixed(2)}%` : "—"}
        </p>
        {!compact && sector.signalCount > 0 && (
          <p className="text-[10px] text-ink-500 mt-1">
            {sector.signalCount} signal{sector.signalCount === 1 ? "" : "s"}
          </p>
        )}
      </div>
    </Link>
  );
}

function getSizeClass(stockCount: number, max: number): string {
  const ratio = max > 0 ? stockCount / max : 0;
  if (ratio >= 0.75) return "col-span-2 row-span-2";
  if (ratio >= 0.4) return "col-span-2";
  return "";
}
