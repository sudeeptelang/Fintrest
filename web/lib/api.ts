import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5185/api/v1";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function authFetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return fetchApi<T>(path, {
    ...options,
    headers: { ...options?.headers, Authorization: `Bearer ${token}` },
  });
}

// --- Types ---

export interface Signal {
  id: number;
  ticker: string;
  stockName: string;
  signalType: string;
  scoreTotal: number;
  entryLow: number | null;
  entryHigh: number | null;
  stopLoss: number | null;
  targetLow: number | null;
  targetHigh: number | null;
  riskLevel: string | null;
  horizonDays: number | null;
  breakdown: SignalBreakdown | null;
  createdAt: string;
}

export interface SignalBreakdown {
  momentumScore: number;
  relVolumeScore: number;
  newsScore: number;
  fundamentalsScore: number;
  sentimentScore: number;
  trendScore: number;
  riskScore: number;
  explanationJson: string | null;
  whyNowSummary: string | null;
}

export interface SignalListResponse {
  signals: Signal[];
  count: number;
}

export interface MarketSummary {
  latestScanAt: string | null;
  signalsToday: number;
  marketStatus: string;
}

export interface StockInfo {
  id: number;
  ticker: string;
  name: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  floatShares: number | null;
  country: string | null;
}

export interface MarketDataPoint {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma20: number | null;
  ma50: number | null;
  ma200: number | null;
  rsi: number | null;
}

export interface NewsItem {
  headline: string;
  summary: string | null;
  source: string | null;
  url: string | null;
  sentimentScore: number | null;
  catalystType: string | null;
  publishedAt: string | null;
}

export interface PerformanceOverview {
  totalSignals: number;
  winRate: number;
  avgReturn: number;
  avgDrawdown: number;
}

// --- Auth & Account Types ---

export interface UserResponse {
  id: number;
  email: string;
  fullName: string | null;
  plan: string;
}

export interface SubscriptionResponse {
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  currentPeriodEnd: string | null;
}

export interface WatchlistItemResponse {
  id: number;
  stockId: number;
  ticker: string;
  stockName: string;
  createdAt: string;
}

export interface WatchlistResponse {
  id: number;
  name: string;
  items: WatchlistItemResponse[];
  createdAt: string;
}

export interface AlertResponse {
  id: number;
  alertType: string;
  channel: string;
  active: boolean;
  stockId: number | null;
  thresholdJson: string | null;
  createdAt: string;
}

// --- API Functions ---

export const api = {
  // Market (public)
  marketSummary: () => fetchApi<MarketSummary>("/market/summary"),
  topPicks: (limit = 12) => fetchApi<SignalListResponse>(`/picks/top-today?limit=${limit}`),
  swingWeek: () => fetchApi<SignalListResponse>("/picks/swing-week"),

  // Stocks (public)
  stock: (ticker: string) => fetchApi<StockInfo>(`/stocks/${ticker}`),
  stockChart: (ticker: string, range = "3m") =>
    fetchApi<MarketDataPoint[]>(`/stocks/${ticker}/chart?range=${range}`),
  stockSignals: (ticker: string) =>
    fetchApi<SignalListResponse>(`/stocks/${ticker}/signals`),
  stockNews: (ticker: string) =>
    fetchApi<NewsItem[]>(`/stocks/${ticker}/news`),

  // Performance (public)
  performanceOverview: () => fetchApi<PerformanceOverview>("/performance/overview"),

  // Auth (authenticated)
  me: () => authFetchApi<UserResponse>("/auth/me"),

  // Subscription (authenticated)
  subscription: () => authFetchApi<SubscriptionResponse>("/subscription"),

  // Watchlists (authenticated)
  watchlists: () => authFetchApi<WatchlistResponse[]>("/watchlists"),
  createWatchlist: (name: string) =>
    authFetchApi<WatchlistResponse>("/watchlists", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  addWatchlistItem: (watchlistId: number, stockId: number) =>
    authFetchApi<WatchlistItemResponse>(`/watchlists/${watchlistId}/items`, {
      method: "POST",
      body: JSON.stringify({ stockId }),
    }),
  removeWatchlistItem: (watchlistId: number, itemId: number) =>
    authFetchApi<void>(`/watchlists/${watchlistId}/items/${itemId}`, {
      method: "DELETE",
    }),

  // Alerts (authenticated)
  alerts: () => authFetchApi<AlertResponse[]>("/alerts"),
  createAlert: (req: { alertType: string; channel: string; stockId?: number; thresholdJson?: string }) =>
    authFetchApi<AlertResponse>("/alerts", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  // Portfolio (authenticated)
  portfolios: () => authFetchApi<PortfolioSummary[]>("/portfolios"),
  portfolio: (id: number) => authFetchApi<PortfolioSummary>(`/portfolios/${id}`),
  portfolioHoldings: (id: number) => authFetchApi<Holding[]>(`/portfolios/${id}/holdings`),
  portfolioTransactions: (id: number) => authFetchApi<Transaction[]>(`/portfolios/${id}/transactions`).catch(() => []),
  portfolioAnalytics: (id: number) => authFetchApi<PortfolioAnalytics>(`/portfolios/${id}/analytics`).catch(() => null),
  portfolioAdvisor: (id: number) => authFetchApi<AdvisorResult>(`/portfolios/${id}/advisor`),
  portfolioAiAnalysis: (id: number) => authFetchApi<AiAnalysis>(`/portfolios/${id}/ai-analysis`),
  importCsv: async (file: File, name: string, cash?: number) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Not authenticated");
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_BASE}/portfolios/import/csv?name=${encodeURIComponent(name)}${cash ? `&cash=${cash}` : ""}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(r => {
      if (!r.ok) return r.text().then(t => { throw new Error(t); });
      return r.json();
    }) as Promise<ImportAnalyzeResult>;
  },
  importText: (holdings: string, name?: string, cash?: number) =>
    authFetchApi<ImportAnalyzeResult>("/portfolios/import/text", {
      method: "POST",
      body: JSON.stringify({ holdings, name, cash }),
    }),
};

// --- Portfolio Types ---

export interface PortfolioSummary {
  id: number;
  name: string;
  strategy: string | null;
  cashBalance: number;
  totalValue: number;
  dailyReturnPct: number;
  holdingsCount: number;
  createdAt: string;
}

export interface Holding {
  id: number;
  stockId: number;
  ticker: string;
  stockName: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  signalScore: number | null;
}

export interface Transaction {
  id: number;
  ticker: string;
  type: string;
  quantity: number;
  price: number;
  fees: number;
  total: number;
  executedAt: string;
}

export interface PortfolioAnalytics {
  riskMetrics: RiskMetrics | null;
  sectorAllocation: Record<string, number>;
  topHoldings: Holding[];
  healthScore: number;
}

export interface RiskMetrics {
  date: string;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  maxDrawdown: number | null;
  beta: number | null;
  var95: number | null;
  volatility: number | null;
  totalReturn: number | null;
}

export interface AdvisorResult {
  healthScore: number;
  recommendations: Recommendation[];
  alerts: string[];
}

export interface Recommendation {
  id: number;
  type: string;
  ticker: string;
  action: string;
  reasoning: string;
  confidence: number;
  status: string;
}

export interface AiAnalysis {
  healthScore: number;
  overallAssessment: string;
  keyStrengths: string[];
  keyRisks: string[];
  recommendations: { type: string; ticker: string; action: string; reasoning: string; confidence: number }[];
  diversificationAnalysis: string;
  riskAssessment: string;
  marketAlignmentSummary: string;
  taxOptimizationNotes: string | null;
}

export interface ImportResult {
  portfolioId: number;
  portfolioName: string;
  holdingsImported: number;
  tickersNotFound: number;
  notFoundTickers: string[];
  tickersAutoAdded: number;
  totalInvestedValue: number;
  totalCurrentValue: number;
  totalPnl: number;
}

export interface ImportAnalyzeResult {
  import: ImportResult;
  analysis: AdvisorResult | null;
  analysisError?: string;
}
