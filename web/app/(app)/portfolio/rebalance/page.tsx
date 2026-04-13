"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortfolios, usePortfolioAdvisor, useApplyRecommendation } from "@/lib/hooks";

export default function RebalancePage() {
  const { data: portfolios, isLoading: portfoliosLoading } = usePortfolios();
  const [selectedId, setSelectedId] = useState<number>(0);

  // Auto-select first portfolio
  if (selectedId === 0 && portfolios && portfolios.length > 0) {
    setSelectedId(portfolios[0].id);
  }

  const {
    data: advisor,
    isLoading: advisorLoading,
    refetch,
  } = usePortfolioAdvisor(selectedId);
  const applyRec = useApplyRecommendation();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Portfolios
        </Link>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold mt-2">
          Rebalancing AI
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Athena analyzes your portfolio and suggests adjustments based on
          current signals, risk exposure, and diversification.
        </p>
      </div>

      {/* Portfolio selector */}
      {portfoliosLoading ? (
        <div className="text-sm text-muted-foreground">Loading portfolios...</div>
      ) : !portfolios || portfolios.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No portfolios yet. Import one to get AI rebalancing advice.
          </p>
          <Link href="/portfolio/upload">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
              Import Portfolio
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(parseInt(e.target.value))}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.holdingsCount} holdings)
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={advisorLoading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${advisorLoading ? "animate-spin" : ""}`}
              />
              Re-analyze
            </Button>
          </div>

          {advisorLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
              <span className="text-sm text-muted-foreground">
                Athena is analyzing your portfolio...
              </span>
            </div>
          ) : !advisor ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Select a portfolio and click Re-analyze to get recommendations.
            </div>
          ) : (
            <>
              {/* Health Score */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/20 bg-gradient-to-br from-[#0d1a2e] to-[#172640] p-6 text-white"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-widest">
                      Portfolio Health
                    </p>
                    <p className="font-[var(--font-heading)] text-4xl font-bold mt-1">
                      {advisor.healthScore}
                      <span className="text-lg text-white/40">/100</span>
                    </p>
                  </div>
                  <Brain className="h-10 w-10 text-primary/60" />
                </div>
              </motion.div>

              {/* Alerts */}
              {advisor.alerts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="space-y-2"
                >
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Alerts
                  </h3>
                  {advisor.alerts.map((alert, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground">{alert}</p>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Recommendations */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3"
              >
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Recommendations
                </h3>
                {advisor.recommendations.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                    No recommendations at this time. Your portfolio looks balanced.
                  </div>
                ) : (
                  advisor.recommendations.map((rec, i) => {
                    const actionColor =
                      rec.action.toUpperCase().includes("BUY") ||
                      rec.action.toUpperCase().includes("ADD")
                        ? "border-l-emerald-500 bg-emerald-500/5"
                        : rec.action.toUpperCase().includes("SELL") ||
                            rec.action.toUpperCase().includes("REDUCE")
                          ? "border-l-red-500 bg-red-500/5"
                          : "border-l-amber-500 bg-amber-500/5";

                    return (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.04 }}
                        className={`rounded-xl border border-border border-l-4 ${actionColor} p-5`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-[var(--font-mono)] font-bold text-sm">
                              {rec.ticker}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {rec.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>Confidence:</span>
                            <span className="font-[var(--font-mono)] font-semibold text-foreground">
                              {rec.confidence}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold mb-1">{rec.action}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {rec.reasoning}
                        </p>
                        {rec.status === "PENDING" && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-white text-xs"
                              disabled={applyRec.isPending}
                              onClick={() =>
                                applyRec.mutate({
                                  portfolioId: selectedId,
                                  recommendationId: rec.id,
                                  action: "APPLIED",
                                })
                              }
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Apply
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              disabled={applyRec.isPending}
                              onClick={() =>
                                applyRec.mutate({
                                  portfolioId: selectedId,
                                  recommendationId: rec.id,
                                  action: "DISMISSED",
                                })
                              }
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Dismiss
                            </Button>
                          </div>
                        )}
                        {rec.status !== "PENDING" && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            {rec.status}
                          </p>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            </>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        Educational content only — not financial advice. AI recommendations are
        suggestions, not instructions.
      </p>
    </div>
  );
}
