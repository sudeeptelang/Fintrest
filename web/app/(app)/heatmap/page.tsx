"use client";

import { SectorHeatmap } from "@/components/markets/sector-heatmap";

export default function HeatmapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold text-ink-950">
          Sector Heatmap
        </h1>
        <p className="text-[13px] text-ink-500 mt-1">
          Visual sector performance at a glance. Spot where money is flowing.
        </p>
      </div>
      <SectorHeatmap variant="full" />
    </div>
  );
}
