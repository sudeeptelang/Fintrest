"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Star, Trash2, Loader2, List, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlists, useCreateWatchlist, useRemoveWatchlistItem, useAddWatchlistItem } from "@/lib/hooks";
import { TickerSearch } from "@/components/stock/ticker-search";
import { StockLogo } from "@/components/stock/stock-logo";
import Link from "next/link";
import type { StockSearchResult, WatchlistItemResponse } from "@/lib/api";

export default function WatchlistPage() {
  const { data: watchlists, isLoading, error } = useWatchlists();
  const createWatchlist = useCreateWatchlist();
  const removeItem = useRemoveWatchlistItem();
  const addItem = useAddWatchlistItem();

  const [activeTab, setActiveTab] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");

  async function handleAddStock(stock: StockSearchResult) {
    if (!activeWatchlist) return;
    setAddError("");
    try {
      await addItem.mutateAsync({ watchlistId: activeWatchlist.id, stockId: stock.id });
    } catch {
      setAddError(`Failed to add ${stock.ticker}. It may already be in this list.`);
    }
  }

  const activeWatchlist = watchlists?.[activeTab];

  function handleCreate() {
    if (!newName.trim()) return;
    createWatchlist.mutate(newName.trim(), {
      onSuccess: () => {
        setNewName("");
        setShowCreate(false);
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Failed to load watchlists. Please try again.</p>
      </div>
    );
  }

  if (!watchlists || watchlists.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Star className="h-8 w-8 text-primary" />
        </div>
        <h2 className="font-[var(--font-heading)] text-xl font-bold">Create your first watchlist</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Track stocks you&apos;re interested in and get signal updates.
        </p>
        <div className="flex items-center gap-2 justify-center">
          <input
            type="text"
            placeholder="Watchlist name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm w-48"
          />
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={handleCreate}
            disabled={createWatchlist.isPending}
          >
            {createWatchlist.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
          </Button>
        </div>
      </div>
    );
  }

  const totalItems = watchlists.reduce((sum, wl) => sum + wl.items.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">Watchlist</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalItems} stocks tracked &middot; {watchlists.length} lists
          </p>
        </div>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New List
        </Button>
      </div>

      {showCreate && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Watchlist name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm flex-1"
            autoFocus
          />
          <Button size="sm" className="bg-primary text-white" onClick={handleCreate} disabled={createWatchlist.isPending}>
            {createWatchlist.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {watchlists.map((wl, idx) => (
          <button
            key={wl.id}
            onClick={() => setActiveTab(idx)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              idx === activeTab
                ? "bg-primary text-white"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {wl.name}
            <span className="ml-1.5 text-xs opacity-70">{wl.items.length}</span>
          </button>
        ))}
      </div>

      {/* Add stock — typeahead resolves tickers AND company names in real time */}
      {activeWatchlist && (
        <div className="space-y-2">
          <TickerSearch onSelect={handleAddStock} />
          {addError && <p className="text-xs text-red-500">{addError}</p>}
        </div>
      )}

      {/* Items */}
      {activeWatchlist && activeWatchlist.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <List className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No stocks in this watchlist yet.</p>
          <p className="text-xs mt-1">Type a ticker above and click Add.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {activeWatchlist?.items.map((item, i) => (
            <WatchlistRow
              key={item.id}
              item={item}
              index={i}
              onRemove={() =>
                removeItem.mutate({ watchlistId: activeWatchlist.id, itemId: item.id })
              }
              removing={removeItem.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Watchlist item row — ticker + price + today's move + signal score/verdict + trade zone. */
function WatchlistRow({
  item,
  index,
  onRemove,
  removing,
}: {
  item: WatchlistItemResponse;
  index: number;
  onRemove: () => void;
  removing: boolean;
}) {
  const hasSignal = item.signalScore !== null;
  const priceColor =
    item.changePct === null ? "text-muted-foreground"
    : item.changePct >= 0 ? "text-emerald-500" : "text-red-500";

  const verdictMeta = item.verdict ? verdictStyle(item.verdict) : null;
  const signalBadge = item.signalType === "BUY_TODAY"
    ? "bg-emerald-500/10 text-emerald-600"
    : item.signalType === "WATCH" ? "bg-amber-500/10 text-amber-600"
    : "bg-muted/40 text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        <Star className="h-4 w-4 fill-primary text-primary flex-shrink-0 mt-1" />

        <Link href={`/stock/${item.ticker}`} className="flex items-center gap-3 flex-1 min-w-0">
          <StockLogo ticker={item.ticker} size={36} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-[var(--font-mono)] text-sm font-bold">{item.ticker}</span>
              {item.signalType && (
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${signalBadge}`}>
                  {item.signalType === "BUY_TODAY" ? "BUY" : item.signalType}
                </span>
              )}
              {verdictMeta && (
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${verdictMeta.color}18`, color: verdictMeta.color }}
                >
                  {item.verdict}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.stockName}</p>
          </div>
        </Link>

        {/* Price + change */}
        <div className="text-right shrink-0">
          <p className="font-[var(--font-mono)] text-sm font-semibold">
            {item.currentPrice !== null ? `$${item.currentPrice.toFixed(2)}` : "—"}
          </p>
          <p className={`font-[var(--font-mono)] text-[11px] font-semibold ${priceColor} flex items-center justify-end gap-1`}>
            {item.changePct !== null && (item.changePct >= 0
              ? <TrendingUp className="h-2.5 w-2.5" />
              : <TrendingDown className="h-2.5 w-2.5" />)}
            {item.changePct !== null ? `${item.changePct >= 0 ? "+" : ""}${item.changePct.toFixed(2)}%` : "—"}
          </p>
        </div>

        {/* Score */}
        <div className="text-right shrink-0 min-w-[36px]">
          <p className="font-[var(--font-heading)] text-lg font-bold leading-none">
            {hasSignal ? Math.round(item.signalScore!) : "—"}
          </p>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5">Score</p>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-red-500 flex-shrink-0"
          onClick={onRemove}
          disabled={removing}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Trade zone row — only when we have a valid signal with stops/targets */}
      {hasSignal && item.entryLow !== null && item.stopLoss !== null && item.targetLow !== null && (
        <div className="mt-2 pt-2 border-t border-border/60 grid grid-cols-4 gap-2 text-[10px]">
          <TradeStat label="Entry" value={`$${item.entryLow.toFixed(2)}-${item.entryHigh?.toFixed(2) ?? ""}`} />
          <TradeStat label="Stop"   value={`$${item.stopLoss.toFixed(2)}`} color="#ef4444" />
          <TradeStat label="Target" value={`$${item.targetHigh?.toFixed(2) ?? item.targetLow.toFixed(2)}`} color="#10b981" />
          <TradeStat label="R:R"    value={item.riskReward !== null ? `${item.riskReward.toFixed(1)}:1` : "—"} />
        </div>
      )}
    </motion.div>
  );
}

function TradeStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-[var(--font-mono)] font-semibold" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

function verdictStyle(v: string): { color: string } {
  switch (v) {
    case "Buy the Dip":     return { color: "#00b87c" };
    case "Breakout Setup":  return { color: "#3b6fd4" };
    case "Momentum Run":    return { color: "#00b87c" };
    case "Value Setup":     return { color: "#7c5fd4" };
    case "Event-Driven":    return { color: "#c084fc" };
    case "Defensive Hold":  return { color: "#64748b" };
    case "Quality Setup":   return { color: "#00b87c" };
    default:                return { color: "#94a3b8" };
  }
}
