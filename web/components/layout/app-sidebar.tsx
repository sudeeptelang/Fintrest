"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock3,
  LayoutGrid,
  Briefcase,
  BarChart3,
  ClipboardList,
  Star,
  Bell,
  Users,
  Landmark,
  Upload,
  Settings,
  LogOut,
  X,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { LogoMark } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth";

// v2 IA — 5 primary nav items (Ask Lens removed for MVP; chat deferred).
// URLs point at the current route files until Phase 6 consolidation renames
// /dashboard→/today and /performance→/audit.
const primary = [
  { label: "Today",     href: "/dashboard",   icon: Clock3,         matchPaths: ["/dashboard", "/today", "/picks"] },
  { label: "Boards",    href: "/boards",      icon: LayoutGrid,     matchPaths: ["/boards"] },
  { label: "Portfolio", href: "/portfolio",   icon: Briefcase,      matchPaths: ["/portfolio"] },
  { label: "Markets",   href: "/markets",     icon: BarChart3,      matchPaths: ["/markets", "/heatmap"] },
  { label: "Audit log", href: "/performance", icon: ClipboardList,  matchPaths: ["/performance", "/audit"] },
] as const;

// "More" popover items — demoted from primary in v2. Congress + Insiders
// live here *and* as tabs inside /markets; either path is valid.
const more = [
  { label: "Watchlist",     href: "/watchlist",          icon: Star },
  { label: "Alerts",        href: "/alerts",             icon: Bell },
  { label: "Insiders",      href: "/insiders",           icon: Users },
  { label: "Congress",      href: "/congress",           icon: Landmark },
  { label: "Notifications", href: "/notifications",      icon: Bell },
  { label: "Upload",        href: "/portfolio/upload",   icon: Upload },
] as const;

interface AppSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ mobileOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (paths: readonly string[]) =>
    paths.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const sidebarContent = (
    <>
      {/* Logo — 56px row matches v2 top nav height */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-ink-200">
        <Link href="/dashboard" className="flex items-center gap-2" aria-label="Fintrest home">
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

      {/* Primary nav — v2 forest-light active, 2px forest left border */}
      <nav className="flex-1 px-3 pt-5 pb-4 overflow-y-auto">
        <div className="space-y-0.5">
          {primary.map((item) => {
            const active = isActive(item.matchPaths);
            return (
              <Link
                key={item.href}
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
            );
          })}
        </div>

        {/* More — collapsible secondary */}
        <div className="mt-6">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 hover:text-ink-700 transition-colors"
          >
            More
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", moreOpen && "rotate-180")}
              strokeWidth={2}
            />
          </button>
          <AnimatePresence initial={false}>
            {moreOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-0.5 pt-1">
                  {more.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                          active
                            ? "bg-ink-100 text-ink-900 font-medium"
                            : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                        )}
                      >
                        <item.icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.7} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Bottom — settings + logout */}
      <div className="px-3 py-3 border-t border-ink-200 space-y-0.5">
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
