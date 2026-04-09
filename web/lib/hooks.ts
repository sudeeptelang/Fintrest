"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function useMarketSummary() {
  return useQuery({ queryKey: ["market-summary"], queryFn: api.marketSummary });
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

export function usePerformanceOverview() {
  return useQuery({ queryKey: ["performance"], queryFn: api.performanceOverview });
}
