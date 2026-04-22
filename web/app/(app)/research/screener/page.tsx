"use client";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function ScreenerPage() {
  return (
    <div className="max-w-[1120px] mx-auto">
      <Breadcrumb
        items={[{ label: "Research", href: "/research" }, { label: "Screener" }]}
      />
      <ComingSoon
        title="Custom screener"
        subtitle="Filter 500+ tickers by factor thresholds, save presets, share as boards. Default view surfaces setups that passed the universal bar but aren't in today's drop — the next-up queue."
        relatedLabel="See today's drop"
        relatedHref="/research"
      />
    </div>
  );
}
