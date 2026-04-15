"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { usePlan, planMeets } from "@/lib/hooks";
import { Button } from "@/components/ui/button";

type Tier = "pro" | "elite";

interface TierCopy {
  title: string;
  tagline: string;
  price: string;
  bullets: string[];
}

const COPY: Record<Tier, TierCopy> = {
  pro: {
    title: "Upgrade to Pro",
    tagline: "Unlock the full signal board + real-time alerts + Athena chat.",
    price: "$19/mo",
    bullets: [
      "All 50+ signals with lens chips (Buy the Dip, Momentum Run, …)",
      "Unlimited Athena thesis + chat",
      "Real-time alerts on watchlist triggers",
      "Congress + Insider trade feeds",
      "Portfolio factor profile + verdict mix",
    ],
  },
  elite: {
    title: "Upgrade to Elite",
    tagline: "Athena tuned to your portfolio — the institutional-grade tier.",
    price: "$45/mo",
    bullets: [
      "Everything in Pro",
      "Athena Personalized — thesis tuned to your holdings",
      "Weekly JPM-style portfolio PDF report",
      "Backtest runner — historical what-if on any lens",
      "Priority Athena with no rate limits",
    ],
  },
};

/**
 * Wrap any gated feature in this. Users on a sufficient tier see {children};
 * lower tiers see an upgrade prompt that links to /pricing. Server-side endpoints
 * must independently enforce with RequiresPlanAttribute — the frontend gate is
 * for UX, not security.
 */
export function PaywallGate({
  tier,
  children,
  fallback,
  compact = false,
}: {
  tier: Tier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  compact?: boolean;
}) {
  const { plan, isLoading } = usePlan();
  if (isLoading) return null;
  if (planMeets(plan, tier)) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;

  const copy = COPY[tier];

  if (compact) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
        <Lock className="h-4 w-4 text-primary mx-auto mb-2" />
        <p className="text-sm font-medium">{copy.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">{copy.tagline}</p>
        <Link href="/pricing">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
            {copy.price} →
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] p-8 text-center">
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/15 mx-auto mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-[var(--font-heading)] text-xl font-bold">{copy.title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{copy.tagline}</p>
      <ul className="mt-5 space-y-1.5 text-sm max-w-md mx-auto text-left inline-block">
        {copy.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link href="/pricing">
          <Button className="bg-primary hover:bg-primary/90 text-white">
            Upgrade for {copy.price}
          </Button>
        </Link>
        <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground">
          Compare plans →
        </Link>
      </div>
    </div>
  );
}

/**
 * Inline "Pro-only" badge you can drop into labels/headers to hint gating before the user clicks.
 */
export function TierBadge({ tier }: { tier: Tier }) {
  const { plan } = usePlan();
  if (planMeets(plan, tier)) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
      <Lock className="h-2.5 w-2.5" /> {tier === "pro" ? "Pro" : "Elite"}
    </span>
  );
}
