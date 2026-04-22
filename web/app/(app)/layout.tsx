"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { ComplianceFooter } from "@/components/layout/compliance-footer";
import { useCurrentUser } from "@/lib/hooks";

// v2 shell — 240px left rail + 56px top nav. Content area inherits ink-50
// page bg so every app route starts on the v2 canvas without a per-page
// change. ComplianceFooter is rendered globally so no route can
// accidentally ship without it (CLAUDE.md rule #6).
//
// Onboarding guard: users who haven't finished or skipped the 4-step
// funnel get bounced to /onboarding on first app load. Runs client-side
// after the user hook resolves — back-end is source of truth.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { data: user } = useCurrentUser();

  useEffect(() => {
    if (!user) return;
    if (!user.onboardingCompleted && !user.onboardingSkipped) {
      router.replace("/onboarding");
    }
  }, [user, router]);

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
