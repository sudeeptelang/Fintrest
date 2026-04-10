"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Star, Trash2, Loader2, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlists, useCreateWatchlist, useRemoveWatchlistItem, useAddWatchlistItem } from "@/lib/hooks";
import { api } from "@/lib/api";
import Link from "next/link";

export default function WatchlistPage() {
  const { data: watchlists, isLoading, error } = useWatchlists();
  const createWatchlist = useCreateWatchlist();
  const removeItem = useRemoveWatchlistItem();
  const addItem = useAddWatchlistItem();

  const [activeTab, setActiveTab] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [tickerInput, setTickerInput] = useState("");
  const [addingStock, setAddingStock] = useState(false);
  const [addError, setAddError] = useState("");

  async function handleAddStock() {
    if (!tickerInput.trim() || !activeWatchlist) return;
    setAddingStock(true);
    setAddError("");
    try {
      const stock = await api.stock(tickerInput.trim().toUpperCase());
      await addItem.mutateAsync({ watchlistId: activeWatchlist.id, stockId: stock.id });
      setTickerInput("");
    } catch {
      setAddError(`"${tickerInput.toUpperCase()}" not found in our stock universe.`);
    } finally {
      setAddingStock(false);
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

      {/* Add stock */}
      {activeWatchlist && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Add ticker (e.g. AAPL, NVDA)..."
                value={tickerInput}
                onChange={(e) => { setTickerInput(e.target.value); setAddError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAddStock()}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm font-[var(--font-mono)]"
              />
            </div>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleAddStock}
              disabled={addingStock || !tickerInput.trim()}
            >
              {addingStock ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5 mr-1" />Add</>}
            </Button>
          </div>
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
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/20 transition-colors"
            >
              <Link href={`/stock/${item.ticker}`} className="flex items-center gap-4 flex-1 min-w-0">
                <Star className="h-4 w-4 fill-primary text-primary flex-shrink-0" />
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="font-[var(--font-mono)] text-xs font-bold text-primary">
                    {item.ticker.slice(0, 2)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-[var(--font-mono)] font-semibold text-sm">{item.ticker}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.stockName}</p>
                </div>
              </Link>

              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-red-500 flex-shrink-0"
                onClick={() =>
                  removeItem.mutate({ watchlistId: activeWatchlist.id, itemId: item.id })
                }
                disabled={removeItem.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
