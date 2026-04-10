"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCurrentUser } from "@/lib/hooks";

interface AppHeaderProps {
  onMenuToggle: () => void;
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data: user } = useCurrentUser();

  const initials = user?.fullName
    ? user.fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const ticker = query.trim().toUpperCase();
    if (ticker) {
      router.push(`/stock/${ticker}`);
      setQuery("");
    }
  }

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

        {/* Search */}
        <form onSubmit={handleSearch} className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ticker (e.g. AAPL, NVDA)..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/50 border border-border text-sm font-[var(--font-mono)] placeholder:font-[var(--font-body)] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
          />
        </form>
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
