"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { api, type StockSearchResult } from "@/lib/api";
import { StockLogo } from "@/components/stock/stock-logo";

/**
 * Typeahead input that resolves stocks by ticker prefix OR company-name substring.
 * Used in Watchlist-add and anywhere else we need "pick a ticker" UX. Debounced
 * at 180ms so we only hit the backend after the user stops typing.
 */
export function TickerSearch({
  onSelect,
  placeholder = "Search by ticker or name (AAPL, Apple, Nvidia…)",
  disabled,
  autoFocus,
}: {
  onSelect: (stock: StockSearchResult) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqSeq = useRef(0);

  // Debounced search
  useEffect(() => {
    if (q.trim().length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const seq = ++reqSeq.current;
    const t = setTimeout(async () => {
      try {
        const rows = await api.searchStocks(q.trim(), 8);
        if (seq === reqSeq.current) {
          setResults(rows);
          setOpen(true);
          setHighlight(0);
        }
      } catch {
        if (seq === reqSeq.current) setResults([]);
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(stock: StockSearchResult) {
    onSelect(stock);
    setQ("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.length >= 1 && setOpen(true)}
        onKeyDown={handleKey}
        disabled={disabled}
        autoFocus={autoFocus}
        className="w-full pl-9 pr-9 py-2 rounded-lg border border-border bg-card text-sm"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
      )}

      {open && (results.length > 0 || (!loading && q.length >= 1)) && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg z-20 max-h-[320px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">
              No matches. Only stocks in Fintrest&apos;s universe are searchable.
            </div>
          ) : (
            results.map((r, idx) => (
              <button
                key={r.id}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => select(r)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  idx === highlight ? "bg-muted/60" : "hover:bg-muted/30"
                }`}
              >
                <StockLogo ticker={r.ticker} size={24} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-[var(--font-mono)] text-sm font-bold">{r.ticker}</span>
                    {r.sector && (
                      <span className="text-[9px] text-muted-foreground truncate">{r.sector}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{r.name}</p>
                </div>
                {r.marketCap && r.marketCap > 0 && (
                  <span className="text-[10px] text-muted-foreground font-[var(--font-mono)] shrink-0">
                    {r.marketCap >= 1e12 ? `$${(r.marketCap / 1e12).toFixed(1)}T` :
                     r.marketCap >= 1e9 ? `$${(r.marketCap / 1e9).toFixed(1)}B` :
                     `$${(r.marketCap / 1e6).toFixed(0)}M`}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
