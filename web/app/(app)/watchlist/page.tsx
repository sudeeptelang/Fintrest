"use client";

import { motion } from "framer-motion";
import { Plus, Star, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const watchlistItems = [
  { ticker: "NVDA", name: "NVIDIA Corp", score: 92, price: "$892.40", change: "+3.2%", alert: true },
  { ticker: "AAPL", name: "Apple Inc", score: 87, price: "$198.20", change: "+1.8%", alert: true },
  { ticker: "TSLA", name: "Tesla Inc", score: 78, price: "$175.60", change: "+2.4%", alert: false },
  { ticker: "AMZN", name: "Amazon.com", score: 81, price: "$186.40", change: "+1.4%", alert: true },
  { ticker: "AMD", name: "AMD Inc", score: 74, price: "$162.80", change: "+1.9%", alert: false },
];

export default function WatchlistPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">
            Watchlist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {watchlistItems.length} stocks tracked &middot;{" "}
            {watchlistItems.filter((i) => i.alert).length} with alerts
          </p>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Stock
        </Button>
      </div>

      <div className="grid gap-3">
        {watchlistItems.map((item, i) => (
          <motion.div
            key={item.ticker}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/20 transition-colors"
          >
            <div className="flex items-center gap-4">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="font-[var(--font-mono)] text-xs font-bold text-primary">
                  {item.ticker.slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="font-[var(--font-mono)] font-semibold text-sm">
                  {item.ticker}
                </p>
                <p className="text-xs text-muted-foreground">{item.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="font-[var(--font-mono)] text-sm font-semibold">
                  {item.price}
                </p>
                <p className="text-xs text-emerald-500 font-medium">
                  {item.change}
                </p>
              </div>

              <div className="text-center">
                <p className="font-[var(--font-mono)] text-sm font-bold">
                  {item.score}
                </p>
                <p className="text-[10px] text-muted-foreground">Score</p>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={item.alert ? "text-primary" : "text-muted-foreground"}
                >
                  <Bell className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
