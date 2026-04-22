"use client";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function MarketsScreenersPage() {
  return (
    <div className="max-w-[1120px] mx-auto">
      <Breadcrumb
        items={[{ label: "Markets", href: "/markets" }, { label: "Screeners" }]}
      />
      <ComingSoon
        title="All screeners"
        subtitle="Top gainers, losers, most active, 52-week highs/lows, and unusual volume — expanded beyond the 5-row summary on the Markets overview. Click any row for Lens commentary on the move."
        relatedLabel="Markets overview"
        relatedHref="/markets"
      />
    </div>
  );
}
