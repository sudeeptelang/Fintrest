"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Play,
  History,
  HeartPulse,
  ScrollText,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Run Scan", href: "/admin/scan", icon: Play },
  { label: "Scan History", href: "/admin/scans", icon: History },
  { label: "Provider Health", href: "/admin/providers", icon: HeartPulse },
  { label: "Audit Logs", href: "/admin/audit", icon: ScrollText },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Admin sidebar */}
      <aside className="fixed top-0 left-0 h-full w-56 bg-card border-r border-border flex flex-col z-40">
        <div className="h-16 flex items-center px-5 border-b border-border">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Admin Panel
          </p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {adminLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 ml-56 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center px-6">
          <h1 className="font-[var(--font-heading)] text-sm font-semibold text-muted-foreground">
            Fintrest.ai Admin
          </h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
