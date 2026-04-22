"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { ComplianceFooter } from "@/components/layout/compliance-footer";

// v2 shell — 240px left rail + 56px top nav. Content area inherits ink-50 page bg
// so every app route starts on the v2 canvas without a per-page change.
// Ask Lens FAB removed for MVP — chat feature deferred.
// ComplianceFooter is rendered globally so no route can accidentally ship
// without it (rule #6 in CLAUDE.md).
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink-50">
      <AppSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-col min-h-screen lg:ml-60">
        <AppHeader onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
        <ComplianceFooter />
      </div>
    </div>
  );
}
