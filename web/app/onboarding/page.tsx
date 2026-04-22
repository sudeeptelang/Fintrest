"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check } from "lucide-react";

// Onboarding funnel — 4 steps per docs/FINTREST_UX_SPEC §16. Every step
// is skippable; the goal isn't data collection, it's getting the user to
// today's drop in under 90 seconds. Posts to PATCH /auth/me/onboarding
// on step 2, 3, 4; stamps OnboardingCompletedAt on finish so the guard
// in middleware / client redirect stops sending them back here.

const SECTORS = [
  "AI & semis",
  "Cloud / SaaS",
  "Large-cap tech",
  "Biotech",
  "Consumer",
  "Earnings plays",
  "Dividends",
  "Small-caps",
  "Energy",
  "Financials",
  "Shorts",
  "Insider activity",
] as const;

const DURATIONS = [
  { value: "swing", label: "Swing", desc: "5–20 days · most Fintrest signals" },
  { value: "position", label: "Position", desc: "1–3 months" },
  { value: "long_term", label: "Long-term", desc: "6 months and up" },
] as const;

const RISKS = [
  { value: "conservative", label: "Conservative" },
  { value: "balanced", label: "Balanced" },
  { value: "aggressive", label: "Aggressive" },
] as const;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5185/api/v1";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [sectors, setSectors] = useState<string[]>([]);
  const [duration, setDuration] = useState<string>("swing");
  const [risk, setRisk] = useState<string>("balanced");
  const [morningBriefing, setMorningBriefing] = useState(true);
  const [signalAlerts, setSignalAlerts] = useState(true);
  const [weeklyNewsletter, setWeeklyNewsletter] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalSteps = 4;
  const progressPct = (step / totalSteps) * 100;

  async function patchOnboarding(body: Record<string, unknown>) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      await fetch(`${API_BASE}/auth/me/onboarding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      // Silent — onboarding values are nice-to-have; failure should
      // not block the user from reaching /markets.
    }
  }

  async function skip() {
    setSaving(true);
    await patchOnboarding({ skipped: true });
    router.push("/markets");
  }

  async function next() {
    // Each step persists its own slice so a refresh mid-flow doesn't
    // lose work.
    if (step === 2) {
      await patchOnboarding({ preferredSectors: sectors });
    } else if (step === 3) {
      await patchOnboarding({
        experienceLevel: duration,
        riskAppetite: risk,
      });
    } else if (step === 4) {
      setSaving(true);
      await patchOnboarding({
        receiveMorningBriefing: morningBriefing,
        receiveSignalAlerts: signalAlerts,
        receiveWeeklyNewsletter: weeklyNewsletter,
        completed: true,
      });
      router.push("/research");
      return;
    }
    setStep(step + 1);
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <header className="flex items-center justify-between px-5 py-4 border-b border-ink-200 bg-ink-0">
        <button
          onClick={() => step > 1 && setStep(step - 1)}
          disabled={step === 1}
          className={cn(
            "inline-flex items-center gap-1 text-[13px] font-medium",
            step === 1 ? "text-ink-300 cursor-default" : "text-ink-600 hover:text-ink-900",
          )}
        >
          {step > 1 && <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />}
          {step > 1 ? "Back" : ""}
        </button>
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="text-[12px] text-ink-500">Step {step} of {totalSteps}</span>
        </div>
        <button
          onClick={skip}
          disabled={saving}
          className="text-[13px] font-medium text-ink-500 hover:text-ink-900"
        >
          Skip
        </button>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-ink-100">
        <div
          className="h-full bg-forest transition-all duration-200"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-[520px] w-full">
          {step === 1 && <StepWelcome />}
          {step === 2 && <StepInterests sectors={sectors} setSectors={setSectors} />}
          {step === 3 && (
            <StepStyle
              duration={duration}
              setDuration={setDuration}
              risk={risk}
              setRisk={setRisk}
            />
          )}
          {step === 4 && (
            <StepNotifications
              morningBriefing={morningBriefing}
              setMorningBriefing={setMorningBriefing}
              signalAlerts={signalAlerts}
              setSignalAlerts={setSignalAlerts}
              weeklyNewsletter={weeklyNewsletter}
              setWeeklyNewsletter={setWeeklyNewsletter}
            />
          )}
        </div>
      </main>

      <footer className="px-4 pb-8">
        <div className="max-w-[520px] mx-auto">
          <button
            onClick={next}
            disabled={saving || (step === 2 && sectors.length < 2)}
            className={cn(
              "w-full inline-flex items-center justify-center px-6 py-3 rounded-md text-[14px] font-semibold transition-colors",
              saving || (step === 2 && sectors.length < 2)
                ? "bg-ink-200 text-ink-400 cursor-not-allowed"
                : "bg-forest text-ink-0 hover:bg-forest-dark",
            )}
          >
            {step === 1 && "Get started"}
            {step === 2 && (sectors.length < 2 ? `Pick ${2 - sectors.length} more` : `Continue with ${sectors.length} selected`)}
            {step === 3 && "Continue"}
            {step === 4 && "Open today's drop"}
          </button>
          {step === 2 && sectors.length >= 2 && (
            <p className="text-center text-[11px] text-ink-500 mt-2">
              You can change these anytime in Settings.
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}

function StepWelcome() {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-[14px] bg-forest mb-6">
        <span className="font-[var(--font-heading)] text-[28px] font-bold text-ink-0">F</span>
      </div>
      <h1 className="font-[var(--font-heading)] text-[32px] leading-[40px] font-semibold text-ink-950 tracking-[-0.015em]">
        Research you can actually follow.
      </h1>
      <p className="mt-4 text-[15px] leading-[24px] text-ink-600">
        Fintrest publishes one short list of US stocks every morning — passed
        through an 8-factor bar and explained in plain English. Every signal
        has a public audit log, wins and losses.
      </p>
      <div className="mt-6 rounded-[10px] border border-forest-light bg-forest-light px-5 py-4 text-left">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-forest-dark mb-1.5">
          What we are
        </div>
        <p className="font-[var(--font-lens)] text-[14px] leading-[22px] text-ink-800">
          Research, not recommendations. We don&apos;t manage your money or
          tell you what to buy.
        </p>
      </div>
    </div>
  );
}

function StepInterests({
  sectors,
  setSectors,
}: {
  sectors: string[];
  setSectors: (v: string[]) => void;
}) {
  const toggle = (s: string) =>
    setSectors(sectors.includes(s) ? sectors.filter((x) => x !== s) : [...sectors, s]);

  return (
    <div>
      <h2 className="font-[var(--font-heading)] text-[26px] leading-[34px] font-semibold text-ink-950">
        What do you follow?
      </h2>
      <p className="mt-2 text-[14px] text-ink-600">Pick 2 or more. We&apos;ll tune Research to what you care about.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {SECTORS.map((s) => {
          const on = sectors.includes(s);
          return (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium border transition-colors",
                on
                  ? "bg-forest text-ink-0 border-forest"
                  : "bg-ink-0 text-ink-700 border-ink-200 hover:border-ink-400",
              )}
            >
              {s}
              {on && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepStyle({
  duration,
  setDuration,
  risk,
  setRisk,
}: {
  duration: string;
  setDuration: (v: string) => void;
  risk: string;
  setRisk: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="font-[var(--font-heading)] text-[26px] leading-[34px] font-semibold text-ink-950">
        How do you invest?
      </h2>
      <p className="mt-2 text-[14px] text-ink-600">So we can surface the right signal types first.</p>

      <div className="mt-6">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500 mb-2">Hold duration</div>
        <div className="space-y-2">
          {DURATIONS.map((d) => (
            <RadioRow
              key={d.value}
              active={duration === d.value}
              onClick={() => setDuration(d.value)}
              label={d.label}
              desc={d.desc}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500 mb-2">Risk tolerance</div>
        <div className="grid grid-cols-3 gap-2">
          {RISKS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRisk(r.value)}
              className={cn(
                "rounded-md px-4 py-3 text-[13px] font-medium border transition-colors",
                risk === r.value
                  ? "bg-forest-light border-forest text-forest-dark"
                  : "bg-ink-0 border-ink-200 text-ink-700 hover:border-ink-400",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepNotifications({
  morningBriefing,
  setMorningBriefing,
  signalAlerts,
  setSignalAlerts,
  weeklyNewsletter,
  setWeeklyNewsletter,
}: {
  morningBriefing: boolean;
  setMorningBriefing: (v: boolean) => void;
  signalAlerts: boolean;
  setSignalAlerts: (v: boolean) => void;
  weeklyNewsletter: boolean;
  setWeeklyNewsletter: (v: boolean) => void;
}) {
  return (
    <div>
      <h2 className="font-[var(--font-heading)] text-[26px] leading-[34px] font-semibold text-ink-950">
        Stay informed.
      </h2>
      <p className="mt-2 text-[14px] text-ink-600">You can change these anytime in Settings.</p>

      <div className="mt-6 space-y-2">
        <ToggleRow
          active={morningBriefing}
          onClick={() => setMorningBriefing(!morningBriefing)}
          label="Morning drop"
          desc="Daily 6:30 AM ET — top signals + Lens thesis"
        />
        <ToggleRow
          active={signalAlerts}
          onClick={() => setSignalAlerts(!signalAlerts)}
          label="High-conviction signals"
          desc="Push + email when a signal scores ≥ 85"
        />
        <ToggleRow
          active={weeklyNewsletter}
          onClick={() => setWeeklyNewsletter(!weeklyNewsletter)}
          label="Weekly newsletter"
          desc="Friday 4:30 PM ET — week in review"
        />
      </div>
    </div>
  );
}

function RadioRow({
  active,
  onClick,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3 rounded-md border text-left transition-colors",
        active
          ? "bg-forest-light border-forest"
          : "bg-ink-0 border-ink-200 hover:border-ink-400",
      )}
    >
      <div>
        <div className={cn("text-[14px] font-semibold", active ? "text-forest-dark" : "text-ink-900")}>
          {label}
        </div>
        <div className="text-[11px] text-ink-500 mt-0.5">{desc}</div>
      </div>
      <div
        className={cn(
          "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
          active ? "border-forest bg-forest" : "border-ink-300",
        )}
      >
        {active && <div className="h-1.5 w-1.5 rounded-full bg-ink-0" />}
      </div>
    </button>
  );
}

function ToggleRow({
  active,
  onClick,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3 rounded-md border text-left transition-colors",
        active
          ? "bg-forest-light border-forest"
          : "bg-ink-0 border-ink-200 hover:border-ink-400",
      )}
    >
      <div>
        <div className={cn("text-[14px] font-semibold", active ? "text-forest-dark" : "text-ink-900")}>
          {label}
        </div>
        <div className="text-[11px] text-ink-500 mt-0.5">{desc}</div>
      </div>
      <div
        className={cn(
          "h-5 w-9 rounded-full transition-colors shrink-0 relative",
          active ? "bg-forest" : "bg-ink-200",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-ink-0 transition-transform shadow-sm",
            active ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </div>
    </button>
  );
}
