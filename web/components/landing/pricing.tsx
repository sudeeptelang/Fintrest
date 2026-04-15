"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/constants";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/lib/hooks";

type Interval = "monthly" | "annual";

export function Pricing() {
  const router = useRouter();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<Interval>("annual");
  const { data: sub } = useSubscription();

  // Paid users get routed to the Billing Portal for plan changes instead of creating a duplicate
  // Stripe checkout. The Portal handles upgrades/downgrades/prorations automatically.
  const currentPlan = (sub?.plan ?? "Free").toLowerCase();
  const isPaid = currentPlan === "pro" || currentPlan === "elite";

  async function handlePlanClick(planName: string, slug: string) {
    setError(null);

    if (planName === "Free") {
      router.push("/auth/signup");
      return;
    }

    // If user is already a paying subscriber, changing plans goes through the Billing Portal
    // (Stripe's hosted UI for proration-aware upgrades/downgrades).
    if (isPaid) {
      setPendingPlan(planName);
      try {
        const { url } = await api.openBillingPortal();
        if (url) window.location.href = url;
        else setError("Billing portal unavailable.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Portal unavailable");
      } finally {
        setPendingPlan(null);
      }
      return;
    }

    // Unauthenticated users go to signup with the chosen plan slug in the query string
    // so we can forward them into Stripe Checkout the moment they're signed in.
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push(`/auth/signup?plan=${slug}`);
      return;
    }

    setPendingPlan(planName);
    try {
      const { url } = await api.createCheckout(slug);
      if (url) {
        window.location.href = url;
      } else {
        setError("Checkout unavailable. Stripe may not be configured yet.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setPendingPlan(null);
    }
  }

  return (
    <section id="pricing" className="relative py-24 sm:py-32 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
            Pricing
          </span>
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-bold tracking-tight">
            Simple, transparent{" "}
            <span className="gradient-text">pricing</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Start free. Upgrade when you&apos;re ready for more signals, earlier
            alerts, and deeper analysis.
          </p>
        </motion.div>

        {/* Monthly / Annual toggle — two buttons with a sliding pill behind them */}
        <div className="flex flex-col items-center gap-2 mb-10">
          <div className="relative inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
            {/* Sliding pill — positioned absolutely, animated via translateX. */}
            <motion.div
              aria-hidden
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-primary shadow-md shadow-primary/25"
              animate={{ x: interval === "monthly" ? 0 : "100%" }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              style={{ left: "4px" }}
            />
            {(["monthly", "annual"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setInterval(opt)}
                className={`relative z-10 min-w-[120px] px-6 py-2 text-sm font-semibold rounded-full transition-colors ${
                  interval === opt ? "text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt === "monthly" ? "Monthly" : "Annual"}
              </button>
            ))}
          </div>
          <p className={`text-[11px] font-semibold transition-opacity ${
            interval === "annual" ? "text-primary opacity-100" : "text-muted-foreground opacity-60"
          }`}>
            {interval === "annual" ? "💰 Save up to 17% with annual billing" : "Switch to annual and save up to 17%"}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
          {PLANS.map((plan, i) => {
            const currentInterval = interval === "annual" ? plan.annual : plan.monthly;
            const showSavings = interval === "annual" && plan.name !== "Free" && plan.annual.savings;
            const thisPlanLower = plan.name.toLowerCase();
            const isCurrentPlan = isPaid && currentPlan === thisPlanLower;

            // CTA label adapts: "Current" if already on this tier, "Upgrade"/"Downgrade" for
            // the other tier, otherwise the default CTA from constants.
            let ctaLabel = plan.cta;
            if (isPaid) {
              if (isCurrentPlan) ctaLabel = "Current Plan";
              else if (thisPlanLower === "free") ctaLabel = "Cancel plan";
              else if (currentPlan === "pro" && thisPlanLower === "elite") ctaLabel = "Upgrade to Elite";
              else if (currentPlan === "elite" && thisPlanLower === "pro") ctaLabel = "Downgrade to Pro";
            }

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.popular
                    ? "border-primary bg-primary/[0.03] shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                    : "border-border/60 bg-card"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-[var(--font-heading)] text-lg font-semibold">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="font-[var(--font-heading)] text-4xl font-extrabold">
                      {currentInterval.price}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {currentInterval.period}
                    </span>
                  </div>
                  {showSavings && (
                    <p className="mt-1 text-xs font-semibold text-primary">
                      {plan.annual.savings}
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePlanClick(plan.name, currentInterval.slug)}
                  disabled={pendingPlan !== null || isCurrentPlan}
                  className={`w-full ${
                    plan.popular && !isCurrentPlan
                      ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                      : ""
                  }`}
                  variant={isCurrentPlan ? "outline" : plan.popular ? "default" : "outline"}
                >
                  {pendingPlan === plan.name && (
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  )}
                  {ctaLabel}
                </Button>
              </motion.div>
            );
          })}
        </div>
        {error && (
          <div className="mt-6 mx-auto max-w-md rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500 text-center">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
