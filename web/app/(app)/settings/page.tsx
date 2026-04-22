"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Shield,
  CreditCard,
  FileText,
  LogOut,
  ChevronRight,
  Loader2,
  Mail,
  Check,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useSubscription, useUpdatePreferences } from "@/lib/hooks";
import { signOut } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";

const planColors: Record<string, string> = {
  Free: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  Starter: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  Pro: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  Premium: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

export default function SettingsPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: sub } = useSubscription();
  const updatePrefs = useUpdatePreferences();

  const [expanded, setExpanded] = useState<"profile" | "security" | "billing" | null>(null);

  const plan = sub?.plan || user?.plan || "Free";
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  async function handleSignOut() {
    await signOut();
    router.push("/auth/login");
    router.refresh();
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-[var(--font-heading)] text-2xl font-bold">Settings</h1>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
            <span className="font-[var(--font-heading)] text-xl font-bold text-primary">
              {initials}
            </span>
          </div>
          <div>
            <p className="font-semibold text-lg">{user?.fullName || "User"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${planColors[plan] || planColors.Free}`}>
                {plan} Plan
              </span>
              {sub?.status === "Active" && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  Active
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Email preferences */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-xl border border-border bg-card p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Email Preferences</h2>
        </div>
        <div className="space-y-3">
          <EmailToggle
            label="Morning Briefing"
            description="Daily email at 6:30 AM ET with top 10 signals"
            checked={user?.receiveMorningBriefing ?? true}
            onChange={(v) => updatePrefs.mutate({ receiveMorningBriefing: v })}
            disabled={updatePrefs.isPending}
          />
          <EmailToggle
            label="Signal Alerts"
            description="Real-time email when a stock in your watchlist triggers"
            checked={user?.receiveSignalAlerts ?? true}
            onChange={(v) => updatePrefs.mutate({ receiveSignalAlerts: v })}
            disabled={updatePrefs.isPending}
          />
          <EmailToggle
            label="Weekly Newsletter"
            description="Friday afternoon market recap with top weekly picks"
            checked={user?.receiveWeeklyNewsletter ?? true}
            onChange={(v) => updatePrefs.mutate({ receiveWeeklyNewsletter: v })}
            disabled={updatePrefs.isPending}
          />
        </div>
      </motion.div>

      {/* Expandable settings rows */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        <SettingsRow
          icon={User}
          label="Personal Information"
          expanded={expanded === "profile"}
          onToggle={() => setExpanded(expanded === "profile" ? null : "profile")}
        >
          <ProfileForm />
        </SettingsRow>

        <SettingsRow
          icon={Shield}
          label="Security & Password"
          expanded={expanded === "security"}
          onToggle={() => setExpanded(expanded === "security" ? null : "security")}
        >
          <PasswordForm />
        </SettingsRow>

        <SettingsRow
          icon={CreditCard}
          label="Billing & Plan"
          expanded={expanded === "billing"}
          onToggle={() => setExpanded(expanded === "billing" ? null : "billing")}
        >
          <BillingPanel />
        </SettingsRow>
        <LinkRow icon={FileText} label="Disclaimers & Legal" href="/terms" external />
      </div>

      {/* Sign out */}
      <Button
        variant="outline"
        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  expanded,
  onToggle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-[18px] w-[18px] text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

function LinkRow({
  icon: Icon,
  label,
  href,
  external,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-[18px] w-[18px] text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function ProfileForm() {
  const { data: user } = useCurrentUser();
  const updatePrefs = useUpdatePreferences();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email] = useState(user?.email ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await updatePrefs.mutateAsync({ fullName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-3 pt-3 border-t border-border">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full mt-1 h-10 px-3 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full mt-1 h-10 px-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground cursor-not-allowed"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Email changes require re-confirmation — contact support for now.
        </p>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Button type="submit" disabled={updatePrefs.isPending} size="sm" className="bg-primary hover:bg-primary/90 text-white">
        {updatePrefs.isPending ? "Saving..." : saved ? <><Check className="h-3 w-3 mr-1" /> Saved</> : "Save changes"}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    // Supabase doesn't require the current password to update, but we verify it
    // by re-signing in — prevents a stolen-session-cookie attacker from rotating the password.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setError("Could not verify current session.");
      setLoading(false);
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signInError) {
      setError("Current password is incorrect.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-border">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Current password</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          className="w-full mt-1 h-10 px-3 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">New password</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={8}
          className="w-full mt-1 h-10 px-3 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confirm new password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          className="w-full mt-1 h-10 px-3 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Button type="submit" disabled={loading} size="sm" className="bg-primary hover:bg-primary/90 text-white">
        {loading ? "Updating..." : saved ? <><Check className="h-3 w-3 mr-1" /> Updated</> : "Change password"}
      </Button>
    </form>
  );
}

/**
 * Billing panel — inline summary of the user's subscription state and direct actions.
 * Free users get an "Upgrade to Pro" call-to-action; paid users get plan badge +
 * renewal date + a "Manage Subscription" button that opens the Stripe Customer Portal
 * (cancel, update payment method, view invoices). No more round-trip through /pricing.
 */
function BillingPanel() {
  const { data: sub, isLoading } = useSubscription();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setError(null);
    setOpening(true);
    try {
      const { url } = await api.openBillingPortal();
      if (url) window.location.href = url;
      else setError("Could not open billing portal.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Portal unavailable");
    } finally {
      setOpening(false);
    }
  }

  if (isLoading) {
    return (
      <div className="pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading subscription…
      </div>
    );
  }

  const plan = (sub?.plan ?? "Free").toLowerCase();
  const isPaid = plan === "pro" || plan === "elite";
  const status = sub?.status ?? "Inactive";
  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  const badgeClass = plan === "elite"
    ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
    : plan === "pro"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  const statusColor = status === "Active" ? "text-emerald-600 dark:text-emerald-400"
    : status === "Trialing" ? "text-blue-600 dark:text-blue-400"
    : status === "PastDue" ? "text-amber-600 dark:text-amber-400"
    : status === "Canceled" ? "text-red-600 dark:text-red-400"
    : "text-muted-foreground";

  return (
    <div className="pt-3 border-t border-border space-y-4">
      {/* Current plan summary */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current Plan
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass}`}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
            <span className={`text-xs font-semibold ${statusColor}`}>{status}</span>
          </div>
          {periodEnd && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {status === "Canceled"
                ? `Access ends ${periodEnd}`
                : `Next billing date: ${periodEnd}`}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isPaid ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium">Upgrade for the full daily drop + Lens thesis on every signal + portfolio research.</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pro is $29/mo ($299 annual) · Elite is $99/mo ($999 annual).
          </p>
          <Link href="/pricing" className="inline-block mt-3">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
              View plans <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={openPortal}
            disabled={opening || !sub?.stripeCustomerId}
          >
            {opening ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <ExternalLink className="h-3 w-3 mr-1.5" />}
            Manage subscription
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Plan changes, payment method updates, and invoices all live in the Stripe portal.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {sub && !sub.stripeConfigured && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400">
          Stripe not configured — billing portal unavailable in this environment.
        </p>
      )}
    </div>
  );
}

function EmailToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          } mt-0.5`}
        />
      </button>
    </div>
  );
}
