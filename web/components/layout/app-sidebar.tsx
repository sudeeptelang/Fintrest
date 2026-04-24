"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  BarChart3,
  ClipboardList,
  FlaskConical,
  Bell,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { useState } from "react";
import { LogoMark } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth";

// MVP-1 IA per docs/FINTREST_UX_SPEC.md §02 — four primary pillars.
// Sub-items reveal only when the parent is active. Existing routes
// (/dashboard, /portfolio, /watchlist, /boards, /performance) remain
// live; sidebar uses the spec's canonical paths which will resolve via
// route renames/redirects during the build.
type NavItem = {
  label: string;
  href: string;
  icon: typeof Briefcase;
  matchPaths: readonly string[];
  subItems?: readonly { label: string; href: string }[];
};

const primary: readonly NavItem[] = [
  {
    label: "Markets",
    href: "/markets",
    icon: BarChart3,
    matchPaths: ["/markets", "/heatmap"],
    subItems: [
      { label: "Overview",  href: "/markets" },
      { label: "Screeners", href: "/markets/screeners" },
    ],
  },
  {
    label: "Research",
    href: "/research",
    icon: FlaskConical,
    // /dashboard + /picks + /research/smart-money redirect or live as
    // internal routes; no separate nav items for them — Smart Money is
    // a component inside every ticker, not a browsable surface of its
    // own. The Research landing page owns the discovery surfaces.
    matchPaths: ["/research", "/dashboard", "/picks", "/swing"],
  },
  {
    label: "My stuff",
    href: "/my/portfolio",
    icon: Briefcase,
    matchPaths: ["/my", "/portfolio", "/watchlist", "/boards"],
    subItems: [
      { label: "Portfolio", href: "/my/portfolio" },
      { label: "Watchlist", href: "/my/watchlist" },
      { label: "Boards",    href: "/my/boards" },
    ],
  },
  {
    label: "Audit log",
    href: "/audit",
    icon: ClipboardList,
    matchPaths: ["/audit", "/performance"],
  },
] as const;

interface AppSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ mobileOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname() ?? "";

  const isActive = (paths: readonly string[]) =>
    paths.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const sidebarContent = (
    <>
      {/* Logo — 56px row matches v2 top nav height */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-ink-200">
        <Link href="/markets" className="flex items-center gap-2" aria-label="Fintrest home">
          <LogoMark size={22} />
          <span className="font-[var(--font-heading)] text-base font-bold tracking-tight text-ink-900">
            Fintrest<span className="text-ink-500 font-normal">.ai</span>
          </span>
        </Link>
        <button
          className="lg:hidden p-1 -mr-1 rounded-md hover:bg-ink-100 transition-colors text-ink-700"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Primary nav — 4 pillars per spec §02. Sub-items reveal when active. */}
      <nav className="flex-1 px-3 pt-5 pb-4 overflow-y-auto">
        <div className="space-y-0.5">
          {primary.map((item) => {
            const active = isActive(item.matchPaths);
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                    "-ml-0.5 border-l-2",
                    active
                      ? "bg-forest-light text-forest border-forest font-semibold"
                      : "text-ink-700 border-transparent hover:bg-ink-100 hover:text-ink-900 font-medium"
                  )}
                >
                  <item.icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.7} />
                  {item.label}
                </Link>
                {active && item.subItems && (
                  <AnimatePresence initial={false}>
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.12, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="py-1 space-y-px">
                        {item.subItems.map((sub) => {
                          const subActive = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={onClose}
                              className={cn(
                                "block pl-10 pr-3 py-1.5 text-[13px] rounded-md transition-colors",
                                subActive
                                  ? "text-forest font-medium"
                                  : "text-ink-500 hover:text-ink-800 hover:bg-ink-100",
                              )}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom — Support section. Methodology link removed for phase 1
          (per 2026-04-24 — we don't reveal scoring internals pre-launch).
          Route file is kept alive at /methodology but not linked; can be
          re-surfaced when we're ready to publish the scoring doc. */}
      <div className="px-3 py-3 border-t border-ink-200 space-y-0.5">
        <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          Support
        </div>
        <Link
          href="/inbox"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 text-sm rounded-md font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900 transition-colors"
        >
          <Bell className="h-[15px] w-[15px]" strokeWidth={1.7} />
          Inbox
        </Link>
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 text-sm rounded-md font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900 transition-colors"
        >
          <Settings className="h-[15px] w-[15px]" strokeWidth={1.7} />
          Settings
        </Link>
        <button
          onClick={async () => {
            await signOut();
            window.location.href = "/auth/login";
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900 transition-colors"
        >
          <LogOut className="h-[15px] w-[15px]" strokeWidth={1.7} />
          Log out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop rail — 240px · ink-50 bg · v2 spec */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-full w-60 bg-ink-50 border-r border-ink-200 flex-col z-40">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="lg:hidden fixed top-0 left-0 h-full w-[280px] bg-ink-0 border-r border-ink-200 flex flex-col z-50"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
