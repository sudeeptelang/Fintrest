"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Loader2, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type StockSearchResult } from "@/lib/api";
import { useStock } from "@/lib/hooks";
import { TickerSearch } from "@/components/stock/ticker-search";
import Link from "next/link";

const ALERT_TYPES = ["price", "stop_loss", "target", "volume"] as const;
const ALERT_LABELS: Record<string, string> = {
  price: "Price",
  stop_loss: "Stop Loss",
  target: "Target",
  volume: "Volume",
};

export default function CreateAlertPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <CreateAlertForm />
    </Suspense>
  );
}

function CreateAlertForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const urlTicker = (searchParams.get("ticker") || "").toUpperCase();

  const [ticker, setTicker] = useState(urlTicker);
  const [alertType, setAlertType] = useState<string>("price");
  const [triggerValue, setTriggerValue] = useState("");
  const [channel, setChannel] = useState("email");

  // Keep state in sync when the URL changes mid-session (client-side nav from another page).
  useEffect(() => {
    if (urlTicker && urlTicker !== ticker) setTicker(urlTicker);
  }, [urlTicker]); // eslint-disable-line react-hooks/exhaustive-deps

  // useStock fetches id + name for the resolved ticker — auto-resolves whether ticker came
  // from the URL or from TickerSearch.
  const { data: stock, isLoading: stockLoading } = useStock(ticker);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!stock?.id) {
        // Last-resort resolve in case useStock hasn't settled yet.
        const fallback = await api.stock(ticker.trim().toUpperCase());
        return api.createAlert({
          alertType,
          channel,
          stockId: fallback.id,
          thresholdJson: JSON.stringify({ value: parseFloat(triggerValue) }),
        });
      }
      return api.createAlert({
        alertType,
        channel,
        stockId: stock.id,
        thresholdJson: JSON.stringify({ value: parseFloat(triggerValue) }),
      });
    },
    onSuccess: () => {
      // Refresh the alerts list so the new alert is visible without a hard refresh.
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      router.push("/alerts");
    },
  });

  function handleTickerSelect(s: StockSearchResult) {
    setTicker(s.ticker);
  }

  function handleCreate() {
    if (!ticker.trim() || !triggerValue) return;
    createMutation.mutate();
  }

  const triggerNum = parseFloat(triggerValue) || 0;
  const tickerUnresolved = Boolean(ticker) && !stock && !stockLoading;
  const errorMessage = createMutation.isError
    ? (createMutation.error as Error)?.message || "Failed to create alert. Check the ticker and try again."
    : tickerUnresolved
      ? `Couldn't find "${ticker}" in our universe. Pick one from search.`
      : "";

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/alerts">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">Create Alert</h1>
          <p className="text-sm text-muted-foreground mt-1">Get notified when it matters</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Ticker — typeahead resolves by ticker or company name */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Ticker
          </label>
          {ticker ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card">
              <span className="font-[var(--font-mono)] text-sm font-bold">{ticker}</span>
              {stockLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : stock ? (
                <span className="text-xs text-muted-foreground truncate">{stock.name}</span>
              ) : (
                <span className="text-xs text-red-500">not found</span>
              )}
              <button onClick={() => { setTicker(""); }} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Change</button>
            </div>
          ) : (
            <TickerSearch onSelect={handleTickerSelect} placeholder="Search by ticker or name (AAPL, Apple, Nvidia…)" />
          )}
        </div>

        {/* Alert Type */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Alert Type
          </label>
          <div className="flex gap-2">
            {ALERT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setAlertType(type)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  alertType === type
                    ? "bg-primary text-white"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {ALERT_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Trigger Value */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            {alertType === "volume" ? "Volume %" : "Trigger Price"}
          </label>
          <input
            type="number"
            value={triggerValue}
            onChange={(e) => setTriggerValue(e.target.value)}
            placeholder={alertType === "volume" ? "200" : "$0.00"}
            step="0.01"
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm font-[var(--font-mono)]"
          />
        </div>

        {/* Delivery Channel */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Delivery
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setChannel("email")}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                channel === "email"
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground"
              }`}
            >
              <Mail className="h-4 w-4" /> Email
            </button>
            <button
              onClick={() => setChannel("push")}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                channel === "push"
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground"
              }`}
            >
              <Smartphone className="h-4 w-4" /> Push
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      {ticker && triggerNum > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Alert Preview</p>
          <p className="text-sm leading-relaxed">
            Notify via <strong>{channel}</strong> when <strong>{ticker}</strong>{" "}
            {alertType === "stop_loss" ? "drops to" : alertType === "target" ? "reaches" : "crosses"}{" "}
            <strong>{alertType === "volume" ? `${triggerNum}% avg volume` : `$${triggerNum.toFixed(2)}`}</strong>
          </p>
        </motion.div>
      )}

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      <Button
        className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-base font-bold rounded-xl"
        onClick={handleCreate}
        disabled={createMutation.isPending || !ticker.trim() || !triggerValue || tickerUnresolved}
      >
        {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
        Create Alert
      </Button>
    </div>
  );
}
