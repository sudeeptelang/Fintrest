"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Bell,
  Zap,
  Shield,
  CreditCard,
  BarChart3,
  FileText,
  LogOut,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useSubscription } from "@/lib/hooks";
import { signOut } from "@/lib/auth";
import Link from "next/link";

const planColors: Record<string, string> = {
  Free: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  Starter: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  Pro: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  Premium: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

const settingsRows = [
  { label: "Personal Information", icon: User, href: "#" },
  { label: "Notification Preferences", icon: Bell, href: "#" },
  { label: "Alert Delivery", icon: Zap, href: "#" },
  { label: "Security & Password", icon: Shield, href: "#" },
  { label: "Billing & Plan", icon: CreditCard, href: "/pricing" },
  { label: "Risk Profile", icon: BarChart3, href: "#" },
  { label: "Disclaimers & Legal", icon: FileText, href: "#" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: sub } = useSubscription();

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
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${planColors[plan] || planColors.Free}`}
              >
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

      {/* Settings menu */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {settingsRows.map((row, i) => (
          <motion.div
            key={row.label}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Link
              href={row.href}
              className="flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <row.icon className="h-4.5 w-4.5 text-muted-foreground" />
                <span className="text-sm font-medium">{row.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </motion.div>
        ))}
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
