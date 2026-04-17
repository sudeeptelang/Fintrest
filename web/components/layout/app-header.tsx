"use client";

import { useRouter } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCurrentUser } from "@/lib/hooks";
import { TickerSearch } from "@/components/stock/ticker-search";

interface AppHeaderProps {
  onMenuToggle: () => void;
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const router = useRouter();
  const { data: user } = useCurrentUser();

  const initials = user?.fullName
    ? user.fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 sm:px-6">
      {/* Left */}
      <div className="flex items-center gap-3 flex-1">
        <button
          className="lg:hidden p-2 -ml-2 rounded-md hover:bg-muted transition-colors"
          onClick={onMenuToggle}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search — typeahead over our ingested universe, resolves by ticker OR name */}
        <div className="max-w-md flex-1">
          <TickerSearch
            onSelect={(s) => router.push(`/stock/${s.ticker}`)}
            placeholder="Search ticker or company (AAPL, Apple, Nvidia…)"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="relative" onClick={() => router.push("/alerts")}>
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>
        <button onClick={() => router.push("/settings")} className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">{initials}</span>
        </button>
      </div>
    </header>
  );
}
