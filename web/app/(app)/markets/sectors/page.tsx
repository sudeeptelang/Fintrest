"use client";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function MarketsSectorsPage() {
  return (
    <div className="max-w-[1120px] mx-auto">
      <Breadcrumb
        items={[{ label: "Markets", href: "/markets" }, { label: "Sectors" }]}
      />
      <ComingSoon
        title="Sector drill-down"
        subtitle="Tap any of the 11 GICS sectors to see today's leaders, laggards, and signal concentration. The Markets overview heatmap is the entry point; this page gives you the constituent stocks sorted by Lens score."
        relatedLabel="Markets overview"
        relatedHref="/markets"
      />
    </div>
  );
}
