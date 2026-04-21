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
  const [interval, setInterval] = useState<Interval>("monthly");
  const { data: sub } = useSubscription();

  const currentPlan = (sub?.plan ?? "Free").toLowerCase();
  const isPaid = currentPlan === "pro" || currentPlan === "elite";

  async function handlePlanClick(planName: string, slug: string) {
    setError(null);

    if (planName === "Free") {
      router.push("/auth/signup");
      return;
    }

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
    <section id="pricing" className="relative py-24 sm:py-32 bg-ink-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-block text-xs font-semibold text-forest mb-4 tracking-[0.1em] uppercase">
            Pricing
          </span>
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-bold tracking-[-0.015em] text-ink-950">
            Simple, transparent{" "}
            <span className="gradient-text">pricing</span>
          </h2>
          <p className="mt-4 text-ink-600 text-base leading-relaxed">
            Start free. Upgrade when you want the full research board,
            unlimited Lens, and the full audit log.
          </p>
        </motion.div>

        {/* Monthly / Annual toggle */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="relative inline-flex rounded-full border border-ink-200 bg-ink-0 p-1 shadow-e1">
            <motion.div
              aria-hidden
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-forest"
              animate={{ x: interval === "monthly" ? 0 : "100%" }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              style={{ left: "4px" }}
            />
            {(["monthly", "annual"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setInterval(opt)}
                className={`relative z-10 min-w-[120px] px-6 py-2 text-sm font-semibold rounded-full transition-colors ${
                  interval === opt ? "text-ink-0" : "text-ink-600 hover:text-ink-900"
                }`}
              >
                {opt === "monthly" ? "Monthly" : "Annual"}
              </button>
            ))}
          </div>
          <p className={`text-[11px] font-semibold tracking-wide transition-opacity ${
            interval === "annual" ? "text-forest opacity-100" : "text-ink-500 opacity-80"
          }`}>
            {interval === "annual" ? "Save up to 17% with annual billing" : "Switch to annual and save up to 17%"}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch max-w-5xl mx-auto">
          {PLANS.map((plan, i) => {
            const currentInterval = interval === "annual" ? plan.annual : plan.monthly;
            const showSavings = interval === "annual" && plan.name !== "Free" && plan.annual.savings;
            const thisPlanLower = plan.name.toLowerCase();
            const isCurrentPlan = isPaid && currentPlan === thisPlanLower;

            let ctaLabel: string = plan.cta;
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
                className={`relative flex flex-col rounded-xl p-7 transition-all ${
                  plan.popular
                    ? "border-2 border-forest bg-ink-0 shadow-e2"
                    : "border border-ink-200 bg-ink-0 hover:border-ink-300 hover:shadow-e1"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-rust px-3 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-0">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-[var(--font-heading)] text-lg font-semibold text-ink-950">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-ink-600 mt-1.5 leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-[var(--font-heading)] text-4xl font-bold tracking-[-0.02em] text-ink-950">
                      {currentInterval.price}
                    </span>
                    <span className="text-ink-500 text-sm">
                      {currentInterval.period}
                    </span>
                  </div>
                  {showSavings && (
                    <p className="mt-1.5 text-xs font-semibold text-forest">
                      {plan.annual.savings}
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-forest mt-0.5 shrink-0" strokeWidth={2.25} />
                      <span className="text-sm text-ink-700 leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePlanClick(plan.name, currentInterval.slug)}
                  disabled={pendingPlan !== null || isCurrentPlan}
                  className={`w-full h-11 text-sm font-semibold rounded-md ${
                    plan.popular && !isCurrentPlan
                      ? "bg-forest hover:bg-forest-dark text-ink-0"
                      : "bg-ink-0 text-ink-900 border border-ink-300 hover:border-ink-500 hover:bg-ink-50"
                  }`}
                  variant={plan.popular && !isCurrentPlan ? "default" : "outline"}
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
          <div className="mt-6 mx-auto max-w-md rounded-lg border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/5 px-4 py-3 text-sm text-[color:var(--danger)] text-center">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
