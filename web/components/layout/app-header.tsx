"use client";

import { useRouter } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { useCurrentUser, useSubscription } from "@/lib/hooks";
import { TickerSearch } from "@/components/stock/ticker-search";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  onMenuToggle: () => void;
}

// v2 top nav — 56px · ink-0 bg · 1px ink-200 bottom border · no backdrop blur
// Right-side utilities: tier badge · bell · avatar.
export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { data: sub } = useSubscription();

  const initials = user?.fullName
    ? user.fullName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "D";

  const plan = (sub?.plan ?? "Free").toLowerCase();

  const tierStyles =
    plan === "elite"
      ? "bg-ink-800 text-ink-0 border-ink-700"
      : plan === "pro"
      ? "bg-forest-light text-forest-dark border-[rgba(15,79,58,0.2)]"
      : "bg-ink-100 text-ink-600 border-ink-200";

  const tierLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <header className="sticky top-0 z-30 h-14 bg-ink-0 border-b border-ink-200 flex items-center justify-between gap-6 px-4 sm:px-6">
      {/* Left cluster: mobile menu + search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          className="lg:hidden p-1.5 -ml-1 rounded-md hover:bg-ink-100 transition-colors text-ink-700"
          onClick={onMenuToggle}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="max-w-[560px] flex-1">
          <TickerSearch
            onSelect={(s) => router.push(`/stock/${s.ticker}`)}
            placeholder="Search ticker or company (AAPL, Apple, Nvidia…)"
          />
        </div>
      </div>

      {/* Right cluster: tier badge · bell · avatar */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "hidden sm:inline-flex items-center px-2 py-[5px] rounded text-[10px] font-semibold tracking-[0.1em] uppercase border",
            tierStyles
          )}
        >
          {tierLabel}
        </span>
        <button
          type="button"
          onClick={() => router.push("/notifications")}
          className="relative h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-ink-100 transition-colors text-ink-600"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-forest" />
        </button>
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="h-8 w-8 rounded-full bg-forest flex items-center justify-center text-ink-0 text-[13px] font-semibold ml-1 hover:bg-forest-dark transition-colors"
          aria-label="Account menu"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
