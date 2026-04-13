"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePortfolios, useAddTransaction } from "@/lib/hooks";

export default function AddHoldingPage() {
  const router = useRouter();
  const { data: portfolios, isLoading: portfoliosLoading } = usePortfolios();
  const addTransaction = useAddTransaction();

  const [portfolioId, setPortfolioId] = useState<number>(0);
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Auto-select first portfolio once loaded
  if (portfolioId === 0 && portfolios && portfolios.length > 0) {
    setPortfolioId(portfolios[0].id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!ticker.trim()) return setError("Enter a ticker symbol");
    if (!quantity || parseFloat(quantity) <= 0) return setError("Enter a valid quantity");
    if (!price || parseFloat(price) <= 0) return setError("Enter a valid price");
    if (portfolioId === 0) return setError("Select a portfolio first");

    try {
      await addTransaction.mutateAsync({
        portfolioId,
        stockTicker: ticker.toUpperCase().trim(),
        type: "BUY",
        quantity: parseFloat(quantity),
        price: parseFloat(price),
      });
      router.push(`/portfolio/${portfolioId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add holding");
    }
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Portfolios
        </Link>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold mt-2">
          Add Holding
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record a buy transaction to add a stock to your portfolio.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Portfolio selector */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Portfolio
          </label>
          {portfoliosLoading ? (
            <div className="text-sm text-muted-foreground">Loading portfolios...</div>
          ) : !portfolios || portfolios.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              No portfolios yet.{" "}
              <Link href="/portfolio/upload" className="text-primary hover:underline">
                Import one first
              </Link>
              .
            </div>
          ) : (
            <select
              value={portfolioId}
              onChange={(e) => setPortfolioId(parseInt(e.target.value))}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.holdingsCount} holdings)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Ticker */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Ticker Symbol
          </label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="e.g. AAPL"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 font-[var(--font-mono)] text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
            maxLength={10}
          />
        </div>

        {/* Quantity + Price side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Shares
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="100"
              step="any"
              min="0"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 font-[var(--font-mono)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Avg Cost / Share
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="150.00"
              step="any"
              min="0"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 font-[var(--font-mono)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={addTransaction.isPending || portfolioId === 0}
          className="w-full bg-primary hover:bg-primary/90 text-white py-3"
        >
          {addTransaction.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add Holding
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center">
        This records a BUY transaction. Current market price will be fetched
        automatically for P&L tracking.
      </p>
    </div>
  );
}
