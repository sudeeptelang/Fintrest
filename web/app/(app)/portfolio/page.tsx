"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Plus, Upload, TrendingUp, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type PortfolioSummary } from "@/lib/api";

export default function PortfolioListPage() {
  const { data: portfolios, isLoading } = useQuery({
    queryKey: ["portfolios"],
    queryFn: api.portfolios,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">Portfolios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track, analyze, and optimize your stock portfolios with AI.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/portfolio/upload">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Import Portfolio
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading portfolios...</div>
      ) : !portfolios || portfolios.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-[var(--font-heading)] text-lg font-semibold mb-2">No portfolios yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Upload a CSV from your broker or paste your holdings to get AI-powered analysis.
          </p>
          <Link href="/portfolio/upload">
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Upload className="h-4 w-4 mr-2" /> Upload Your First Portfolio
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {portfolios.map((p) => (
            <PortfolioCard key={p.id} portfolio={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioCard({ portfolio: p }: { portfolio: PortfolioSummary }) {
  return (
    <Link href={`/portfolio/${p.id}`}>
      <div className="rounded-2xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-[var(--font-heading)] font-semibold">{p.name}</h3>
              <p className="text-xs text-muted-foreground">{p.holdingsCount} holdings</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="font-[var(--font-mono)] text-lg font-bold">
              ${p.totalValue?.toLocaleString() ?? "0"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Daily Return</p>
            <p className={`font-[var(--font-mono)] text-lg font-bold ${(p.dailyReturnPct ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {(p.dailyReturnPct ?? 0) >= 0 ? "+" : ""}{(p.dailyReturnPct ?? 0).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
