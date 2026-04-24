"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// Stale-time budget — market data rarely changes by the second, so we lean on React Query's
// cache to avoid re-hitting the API on every route change. Global default is 60s
// (see QueryProvider); these override where the domain allows a longer window.
const FIVE_MIN = 1000 * 60 * 5;
const TWO_MIN = 1000 * 60 * 2;
const TEN_MIN = 1000 * 60 * 10;

export function useAuditLog(status?: "win" | "loss" | "open") {
  return useQuery({
    queryKey: ["audit-log", status ?? "all"],
    queryFn: () => api.auditLog(status, 100),
    staleTime: FIVE_MIN,
  });
}

export function useAuditLogDetail(signalId: number) {
  return useQuery({
    queryKey: ["audit-log-detail", signalId],
    queryFn: () => api.auditLogDetail(signalId),
    staleTime: FIVE_MIN,
    enabled: signalId > 0,
  });
}

export function useMarketSummary() {
  return useQuery({ queryKey: ["market-summary"], queryFn: api.marketSummary, staleTime: TWO_MIN });
}

// Lands with the §14.5 macro pipeline. While the endpoint is not yet
// implemented the 404 is silently swallowed — the header pill hides and
// the Deep Dive macro row stays in its greyed state.
export function useMarketRegime() {
  return useQuery({
    queryKey: ["market-regime"],
    queryFn: () => api.marketRegime().catch(() => null),
    staleTime: FIVE_MIN,
    retry: false,
  });
}

export function useMarketSectors() {
  return useQuery({ queryKey: ["market-sectors"], queryFn: api.marketSectors, staleTime: FIVE_MIN });
}

export function useMarketIndices() {
  return useQuery({ queryKey: ["market-indices"], queryFn: api.marketIndices, staleTime: TWO_MIN });
}

export function useMarketTrending(limit = 10) {
  return useQuery({ queryKey: ["market-trending", limit], queryFn: () => api.marketTrending(limit), staleTime: TWO_MIN });
}

export function useMarketMostActive(limit = 10) {
  return useQuery({ queryKey: ["market-most-active", limit], queryFn: () => api.marketMostActive(limit), staleTime: TWO_MIN });
}

export function useMarketEarningsCalendar(days = 14) {
  return useQuery({ queryKey: ["market-earnings-calendar", days], queryFn: () => api.marketEarningsCalendar(days), staleTime: TEN_MIN });
}

export function useMarketIposCalendar(limit = 20) {
  return useQuery({
    queryKey: ["market-ipos-calendar", limit],
    queryFn: () => api.marketIposCalendar(limit),
    staleTime: TEN_MIN,
  });
}

export function useMarketNews(limit = 10) {
  return useQuery({ queryKey: ["market-news", limit], queryFn: () => api.marketNews(limit), staleTime: TWO_MIN });
}

export function useMarketScreener(limit = 50) {
  return useQuery({ queryKey: ["market-screener", limit], queryFn: () => api.marketScreener(limit), staleTime: TWO_MIN });
}

export function useTopPicks(limit = 12) {
  return useQuery({ queryKey: ["top-picks", limit], queryFn: () => api.topPicks(limit), staleTime: TWO_MIN });
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

export function useInsidersByTicker(ticker: string, limit = 10) {
  return useQuery({
    queryKey: ["market-insiders-ticker", ticker.toUpperCase(), limit],
    queryFn: () => api.marketInsidersByTicker(ticker.toUpperCase(), limit),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 15, // 15 min — firehose cache refreshes nightly anyway
  });
}

export function useCongressByTicker(ticker: string, limit = 10) {
  return useQuery({
    queryKey: ["market-congress-ticker", ticker.toUpperCase(), limit],
    queryFn: () => api.marketCongressByTicker(ticker.toUpperCase(), limit),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 15,
  });
}

export function useInsiderScore(ticker: string) {
  return useQuery({
    queryKey: ["market-insider-score", ticker.toUpperCase()],
    queryFn: () => api.marketInsiderScore(ticker.toUpperCase()),
    enabled: !!ticker,
    // Recomputed nightly at 8:45 PM ET — safe to cache aggressively.
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useShortInterest(ticker: string) {
  return useQuery({
    queryKey: ["market-short-interest", ticker.toUpperCase()],
    queryFn: () => api.marketShortInterest(ticker.toUpperCase()),
    enabled: !!ticker,
    // FINRA short-interest publishes bi-monthly; we're well inside that
    // cadence caching for an hour.
    staleTime: 1000 * 60 * 60,
  });
}

export function useCongressSignal(ticker: string) {
  return useQuery({
    queryKey: ["market-congress-signal", ticker.toUpperCase()],
    queryFn: () => api.marketCongressSignal(ticker.toUpperCase()),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 60,
  });
}

export function useFinancialScores(ticker: string) {
  return useQuery({
    queryKey: ["market-financial-scores", ticker.toUpperCase()],
    queryFn: () => api.marketFinancialScores(ticker.toUpperCase()),
    enabled: !!ticker,
    // Financial-scores move on quarterly filing cadence — safe to
    // cache aggressively within a session.
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
  });
}

export function useDcf(ticker: string) {
  return useQuery({
    queryKey: ["market-dcf", ticker.toUpperCase()],
    queryFn: () => api.marketDcf(ticker.toUpperCase()),
    enabled: !!ticker,
    // DCF fair value is re-computed on-demand by FMP; price changes
    // intraday. Keep fresh-ish but not thrashing.
    staleTime: 1000 * 60 * 30, // 30 min
  });
}

export function useEarningsSurprises(ticker: string, quarters = 10) {
  return useQuery({
    queryKey: ["market-earnings-surprises", ticker.toUpperCase(), quarters],
    queryFn: () => api.marketEarningsSurprises(ticker.toUpperCase(), quarters),
    enabled: !!ticker,
    // Surprises are quarterly events; cache aggressively.
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
  });
}

export function useScoreHistory(ticker: string, days = 30) {
  return useQuery({
    queryKey: ["stock-score-history", ticker.toUpperCase(), days],
    queryFn: () => api.stockScoreHistory(ticker.toUpperCase(), days),
    enabled: !!ticker,
    // Written at scan time (once daily); cache aggressively.
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
  });
}

export function useScoreHistoryBulk(tickers: string[], days = 30) {
  const key = tickers.map((t) => t.toUpperCase()).sort().join(",");
  return useQuery({
    queryKey: ["stock-score-history-bulk", key, days],
    queryFn: () => api.stockScoreHistoryBulk(tickers, days),
    enabled: tickers.length > 0,
    staleTime: 1000 * 60 * 60 * 6,
  });
}

export function usePeers(ticker: string) {
  return useQuery({
    queryKey: ["market-peers", ticker.toUpperCase()],
    queryFn: () => api.marketPeers(ticker.toUpperCase()),
    enabled: !!ticker,
    // Peer lists rarely change; cache for a long time.
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useAnalystRevisions(ticker: string, days = 30) {
  return useQuery({
    queryKey: ["market-analyst-revisions", ticker.toUpperCase(), days],
    queryFn: () => api.marketAnalystRevisions(ticker.toUpperCase(), days),
    enabled: !!ticker,
    // Grade changes fire unpredictably but settle in hours. 30-min
    // cache keeps us fresh without hammering FMP.
    staleTime: 1000 * 60 * 30,
  });
}

export function useCongressLatest(limit = 100) {
  return useQuery({ queryKey: ["market-congress", limit], queryFn: () => api.marketCongressLatest(limit) });
}

export function useOvernightChanges() {
  return useQuery({
    queryKey: ["signals-overnight-changes"],
    queryFn: api.overnightChanges,
    // Scan completes ~6:00 AM ET. Keep fresh for an hour; overnight diff
    // doesn't change intraday.
    staleTime: 1000 * 60 * 60,
  });
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

// --- Admin ---

export function useAdminSystemHealth() {
  return useQuery({
    queryKey: ["admin-system-health"],
    queryFn: api.adminSystemHealth,
    // System health moves slowly and polling wastes backend work. 60s is
    // plenty for the dashboard; users can click "Refresh" for a forced pull.
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useAdminRunPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.adminRunPipeline(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-system-health"] }),
  });
}

export function useAdminRunScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.adminRunScan(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-system-health"] }),
  });
}

export function useAdminRunIngestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.adminRunIngestion(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-system-health"] }),
  });
}
