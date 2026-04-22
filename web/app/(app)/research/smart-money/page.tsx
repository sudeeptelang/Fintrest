"use client";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function SmartMoneyHubPage() {
  return (
    <div className="max-w-[1120px] mx-auto">
      <Breadcrumb
        items={[{ label: "Research", href: "/research" }, { label: "Smart money" }]}
      />
      <ComingSoon
        title="Smart money hub"
        subtitle="The 8th factor gets its own destination — insiders, 13F, congress, options, and shorts — with source + staleness on every row. Ships with the EDGAR Form 4 pipeline in MVP-2 along with FMP-derived senate + house aggregation."
        relatedLabel="See today's drop"
        relatedHref="/research"
      />
    </div>
  );
}
