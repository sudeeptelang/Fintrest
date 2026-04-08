"use client";

import { motion } from "framer-motion";
import { Filter, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const signals = [
  { ticker: "NVDA", name: "NVIDIA Corp", score: 92, type: "BUY TODAY", sector: "Technology", change: "+3.2%", entry: "$892", target: "$945", stop: "$865" },
  { ticker: "AAPL", name: "Apple Inc", score: 87, type: "BUY TODAY", sector: "Technology", change: "+1.8%", entry: "$198", target: "$215", stop: "$190" },
  { ticker: "MSFT", name: "Microsoft Corp", score: 84, type: "WATCH", sector: "Technology", change: "+0.9%", entry: "$425", target: "$450", stop: "$410" },
  { ticker: "AMZN", name: "Amazon.com", score: 81, type: "WATCH", sector: "Consumer", change: "+1.4%", entry: "$186", target: "$200", stop: "$178" },
  { ticker: "TSLA", name: "Tesla Inc", score: 78, type: "WATCH", sector: "Automotive", change: "+2.4%", entry: "$175", target: "$195", stop: "$165" },
  { ticker: "META", name: "Meta Platforms", score: 71, type: "WATCH", sector: "Technology", change: "+1.1%", entry: "$510", target: "$540", stop: "$490" },
  { ticker: "GOOGL", name: "Alphabet Inc", score: 68, type: "WATCH", sector: "Technology", change: "+0.6%", entry: "$155", target: "$168", stop: "$148" },
  { ticker: "JPM", name: "JPMorgan Chase", score: 65, type: "AVOID", sector: "Finance", change: "-0.3%", entry: "—", target: "—", stop: "—" },
];

export default function PicksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">
            Top Picks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Today&apos;s highest-ranked signals, scored 0–100.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            Sort
          </Button>
        </div>
      </div>

      {/* Signal table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Stock</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Sector</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Score</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Signal</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Change</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Entry</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Target</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Stop</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {signals.map((s, i) => (
                <motion.tr
                  key={s.ticker}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="font-[var(--font-mono)] text-[10px] font-bold text-primary">
                          {s.ticker.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold font-[var(--font-mono)]">{s.ticker}</p>
                        <p className="text-xs text-muted-foreground">{s.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{s.sector}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="font-[var(--font-mono)] font-bold">{s.score}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        s.type === "BUY TODAY"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : s.type === "AVOID"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-amber-500/10 text-amber-500"
                      }`}
                    >
                      {s.type}
                    </span>
                  </td>
                  <td className={`px-5 py-3.5 text-right font-[var(--font-mono)] font-medium ${s.change.startsWith("+") ? "text-emerald-500" : "text-red-500"}`}>
                    {s.change}
                  </td>
                  <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-muted-foreground">{s.entry}</td>
                  <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-muted-foreground">{s.target}</td>
                  <td className="px-5 py-3.5 text-right font-[var(--font-mono)] text-muted-foreground">{s.stop}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
