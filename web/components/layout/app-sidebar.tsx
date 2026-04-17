"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  TrendingUp,
  Star,
  BarChart3,
  LineChart,
  Settings,
  LogOut,
  CandlestickChart,
  Briefcase,
  Upload,
  Bell,
  Bot,
  BellDot,
  Users,
  Landmark,
  X,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth";

const sidebarSections = [
  {
    label: "Discover",
    links: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Athena's Picks", href: "/picks", icon: TrendingUp },
    ],
  },
  {
    label: "Portfolio",
    links: [
      { label: "Overview", href: "/portfolio", icon: Briefcase },
      { label: "Upload", href: "/portfolio/upload", icon: Upload },
    ],
  },
  {
    label: "Tools",
    links: [
      { label: "Watchlist", href: "/watchlist", icon: Star },
      { label: "Alerts", href: "/alerts", icon: Bell },
      { label: "Markets", href: "/markets", icon: BarChart3 },
      { label: "Insiders", href: "/insiders", icon: Users },
      { label: "Congress", href: "/congress", icon: Landmark },
      { label: "Performance", href: "/performance", icon: LineChart },
      { label: "Notifications", href: "/notifications", icon: BellDot },
    ],
  },
];

interface AppSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ mobileOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-icon.png" alt="Fintrest" width={32} height={32} className="rounded-lg" />
          <span className="font-[var(--font-heading)] text-lg font-bold tracking-tight">
            Fintrest<span className="text-primary">.ai</span>
          </span>
        </Link>
        <button
          className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {sidebarSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <link.icon className="h-4.5 w-4.5 shrink-0" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="h-4.5 w-4.5" />
          Settings
        </Link>
        <button
          onClick={async () => {
            await signOut();
            window.location.href = "/auth/login";
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4.5 w-4.5" />
          Log out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-full w-64 bg-card border-r border-border flex-col z-40">
        {sidebarContent}
      </aside>

      {/* Mobile overlay + drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed top-0 left-0 h-full w-72 bg-card border-r border-border flex flex-col z-50"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
