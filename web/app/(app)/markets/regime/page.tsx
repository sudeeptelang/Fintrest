"use client";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function MarketsRegimePage() {
  return (
    <div className="max-w-[1120px] mx-auto">
      <Breadcrumb
        items={[{ label: "Markets", href: "/markets" }, { label: "Regime" }]}
      />
      <ComingSoon
        title="Macro regime classifier"
        subtitle="Risk-on / neutral / risk-off classification from FRED + Cboe — VIX, 10Y yield, HY credit spread, DXY. The factor engine reweights itself under each regime; this page shows the current state + 12-month history of regime shifts."
        relatedLabel="Markets overview"
        relatedHref="/markets"
      />
    </div>
  );
}
