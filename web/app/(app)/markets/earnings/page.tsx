"use client";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function MarketsEarningsPage() {
  return (
    <div className="max-w-[1120px] mx-auto">
      <Breadcrumb
        items={[{ label: "Markets", href: "/markets" }, { label: "Earnings" }]}
      />
      <ComingSoon
        title="Earnings calendar"
        subtitle="Full two-week earnings window with consensus EPS, implied move, before/after-market indicators, and Lens context per report. The Markets overview shows this week; the calendar expands to full forward view."
        relatedLabel="Markets overview"
        relatedHref="/markets"
      />
    </div>
  );
}
