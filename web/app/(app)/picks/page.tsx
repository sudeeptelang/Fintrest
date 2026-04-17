"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { AthenaBoard } from "@/components/dashboard/athena-board";
import { usePlan, planMeets } from "@/lib/hooks";
import { Button } from "@/components/ui/button";

/**
 * Unified picks page — covers both "Top Picks" and "Swing Trades" in one table.
 * Free tier sees only the top 3 signals and an upgrade prompt; Pro+ gets the full board
 * with lens filters. Lens chips let Pro users filter by setup type (Buy the Dip / Breakout /
 * Momentum Run / Value / Event-Driven / Defensive).
 *
 * AthenaBoard uses useSearchParams() → needs a <Suspense> boundary for static prerender.
 */
export default function PicksPage() {
  const { plan } = usePlan();
  const isPro = planMeets(plan, "pro");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold">Athena&apos;s Picks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isPro
            ? "Every signal from today's scan, ranked by composite score. Filter by setup type with the lens chips."
            : "Free preview of today's top 3 signals. Upgrade to Pro for the full board, lens filters, and Athena's thesis on every pick."}
        </p>
      </div>

      {!isPro && (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] p-8 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/15 mx-auto mb-4">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-[var(--font-heading)] text-xl font-bold">See every signal with Pro</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            You&apos;re seeing a free preview of the top 3 picks. Upgrade to unlock the full scan output,
            Athena&apos;s thesis on every pick, lens filters, and real-time alerts.
          </p>
          <ul className="mt-5 space-y-1.5 text-sm max-w-md mx-auto text-left inline-block">
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span><span>All 50+ signals, not just 3</span></li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span><span>Buy the Dip · Breakout · Momentum lens filters</span></li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span><span>Athena AI thesis on every pick</span></li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span><span>Congress + Insider trade feeds</span></li>
          </ul>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/pricing">
              <Button className="bg-primary hover:bg-primary/90 text-white">Upgrade for $19/mo</Button>
            </Link>
            <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground">
              Compare plans →
            </Link>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        <AthenaBoard
          limit={isPro ? 100 : 3}
          defaultLens="all"
          title={isPro ? "All Signals" : "Top 3 (Free Preview)"}
          syncUrl={isPro}
        />
      </Suspense>
    </div>
  );
}
