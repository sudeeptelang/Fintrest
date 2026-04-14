"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/constants";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export function Pricing() {
  const router = useRouter();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePlanClick(planName: string) {
    setError(null);

    if (planName === "Free") {
      router.push("/auth/signup");
      return;
    }

    // Check auth state — unauthenticated users go to signup with plan in query
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push(`/auth/signup?plan=${planName.toLowerCase()}`);
      return;
    }

    setPendingPlan(planName);
    try {
      const { url } = await api.createCheckout(planName.toLowerCase());
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {PLANS.map((plan, i) => (
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
                <span className="font-[var(--font-heading)] text-4xl font-extrabold">
                  {plan.price}
                </span>
                <span className="text-muted-foreground text-sm">
                  {plan.period}
                </span>
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
                onClick={() => handlePlanClick(plan.name)}
                disabled={pendingPlan !== null}
                className={`w-full ${
                  plan.popular
                    ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                    : ""
                }`}
                variant={plan.popular ? "default" : "outline"}
              >
                {pendingPlan === plan.name && (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                )}
                {plan.cta}
              </Button>
            </motion.div>
          ))}
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
