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

export function usePerformanceOverview() {
  return useQuery({ queryKey: ["performance"], queryFn: api.performanceOverview });
}

// --- Authenticated hooks ---

export function useCurrentUser() {
  return useQuery({ queryKey: ["current-user"], queryFn: api.me });
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
