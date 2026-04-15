"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export function useMarketSummary() {
  return useQuery({ queryKey: ["market-summary"], queryFn: api.marketSummary });
}

export function useMarketSectors() {
  return useQuery({ queryKey: ["market-sectors"], queryFn: api.marketSectors });
}

export function useMarketIndices() {
  return useQuery({ queryKey: ["market-indices"], queryFn: api.marketIndices });
}

export function useMarketTrending(limit = 10) {
  return useQuery({ queryKey: ["market-trending", limit], queryFn: () => api.marketTrending(limit) });
}

export function useMarketMostActive(limit = 10) {
  return useQuery({ queryKey: ["market-most-active", limit], queryFn: () => api.marketMostActive(limit) });
}

export function useMarketEarningsCalendar(days = 14) {
  return useQuery({ queryKey: ["market-earnings-calendar", days], queryFn: () => api.marketEarningsCalendar(days) });
}

export function useMarketNews(limit = 10) {
  return useQuery({ queryKey: ["market-news", limit], queryFn: () => api.marketNews(limit) });
}

export function useMarketScreener(limit = 50) {
  return useQuery({ queryKey: ["market-screener", limit], queryFn: () => api.marketScreener(limit) });
}

export function useTopPicks(limit = 12) {
  return useQuery({ queryKey: ["top-picks", limit], queryFn: () => api.topPicks(limit) });
}

export function useSwingWeek() {
  return useQuery({ queryKey: ["swing-week"], queryFn: api.swingWeek });
}

export function useStock(ticker: string) {
  return useQuery({ queryKey: ["stock", ticker], queryFn: () => api.stock(ticker), enabled: !!ticker });
}

export function useStockChart(ticker: string, range = "3m") {
  return useQuery({ queryKey: ["stock-chart", ticker, range], queryFn: () => api.stockChart(ticker, range), enabled: !!ticker });
}

export function useStockSignals(ticker: string) {
  return useQuery({ queryKey: ["stock-signals", ticker], queryFn: () => api.stockSignals(ticker), enabled: !!ticker });
}

export function useStockNews(ticker: string) {
  return useQuery({ queryKey: ["stock-news", ticker], queryFn: () => api.stockNews(ticker), enabled: !!ticker });
}

export function useStockSnapshot(ticker: string) {
  return useQuery({ queryKey: ["stock-snapshot", ticker], queryFn: () => api.stockSnapshot(ticker), enabled: !!ticker });
}

export function useStockAnalyst(ticker: string) {
  return useQuery({ queryKey: ["stock-analyst", ticker], queryFn: () => api.stockAnalyst(ticker), enabled: !!ticker });
}

export function useStockEarnings(ticker: string) {
  return useQuery({ queryKey: ["stock-earnings", ticker], queryFn: () => api.stockEarnings(ticker), enabled: !!ticker });
}

export function useStockOwnership(ticker: string) {
  return useQuery({ queryKey: ["stock-ownership", ticker], queryFn: () => api.stockOwnership(ticker), enabled: !!ticker });
}

/**
 * Current user's plan. Returns "free" when unauthenticated or loading so callers can
 * treat "unknown" as "free" safely (they'll see the paywall prompt instead of paid content).
 */
export function usePlan(): { plan: "free" | "pro" | "elite"; isLoading: boolean } {
  const { data, isLoading } = useCurrentUser();
  const raw = (data?.plan ?? "free").toLowerCase();
  const plan = raw === "pro" ? "pro" : raw === "elite" ? "elite" : "free";
  return { plan, isLoading };
}

/** Ranked plan tiers so "requires Pro" means "Pro or higher". */
const PLAN_RANK: Record<"free" | "pro" | "elite", number> = { free: 0, pro: 1, elite: 2 };
export function planMeets(current: "free" | "pro" | "elite", required: "free" | "pro" | "elite"): boolean {
  return PLAN_RANK[current] >= PLAN_RANK[required];
}

export function useMarketPulse() {
  return useQuery({ queryKey: ["market-pulse"], queryFn: api.marketPulse, staleTime: 1000 * 60 });
}

export function useStockThesis(ticker: string) {
  return useQuery({
    queryKey: ["stock-thesis", ticker],
    queryFn: () => api.stockThesis(ticker),
    enabled: !!ticker,
    // Theses are expensive to regenerate — keep fresh for a while.
    staleTime: 1000 * 60 * 30, // 30 min
    retry: 1,
  });
}

export function useInsidersLatest(limit = 100) {
  return useQuery({ queryKey: ["market-insiders", limit], queryFn: () => api.marketInsidersLatest(limit) });
}

export function useCongressLatest(limit = 100) {
  return useQuery({ queryKey: ["market-congress", limit], queryFn: () => api.marketCongressLatest(limit) });
}

export function usePerformanceOverview() {
  return useQuery({ queryKey: ["performance"], queryFn: api.performanceOverview });
}

// --- Authenticated hooks ---

export function useCurrentUser() {
  return useQuery({ queryKey: ["current-user"], queryFn: api.me });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updatePreferences,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["current-user"] }),
  });
}

export function useSubscription() {
  return useQuery({ queryKey: ["subscription"], queryFn: api.subscription });
}

export function useWatchlists() {
  return useQuery({ queryKey: ["watchlists"], queryFn: api.watchlists });
}

export function useCreateWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createWatchlist(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}

export function useAddWatchlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ watchlistId, stockId }: { watchlistId: number; stockId: number }) =>
      api.addWatchlistItem(watchlistId, stockId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}

export function useRemoveWatchlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ watchlistId, itemId }: { watchlistId: number; itemId: number }) =>
      api.removeWatchlistItem(watchlistId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}

export function useAlerts() {
  return useQuery({ queryKey: ["alerts"], queryFn: api.alerts });
}

export function usePortfolios() {
  return useQuery({ queryKey: ["portfolios"], queryFn: api.portfolios });
}

export function usePortfolioAdvisor(portfolioId: number) {
  return useQuery({
    queryKey: ["portfolio-advisor", portfolioId],
    queryFn: () => api.portfolioAdvisor(portfolioId),
    enabled: portfolioId > 0,
  });
}

export function useAddTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ portfolioId, ...req }: { portfolioId: number; stockTicker: string; type: string; quantity: number; price: number; fees?: number }) =>
      api.addTransaction(portfolioId, req),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["portfolio-holdings", vars.portfolioId] });
      qc.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });
}

export function useApplyRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ portfolioId, recommendationId, action }: { portfolioId: number; recommendationId: number; action: "APPLIED" | "DISMISSED" }) =>
      api.applyRecommendation(portfolioId, recommendationId, action),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["portfolio-advisor", vars.portfolioId] });
    },
  });
}
