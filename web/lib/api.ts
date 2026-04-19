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
  currentPrice: number | null;
  changePct: number | null;
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
  id: number;
  headline: string;
  summary: string | null;
  source: string | null;
  url: string | null;
  sentimentScore: number | null;
  catalystType: string | null;
  publishedAt: string | null;
  ticker: string | null;
}

export interface NewsAthenaSummary {
  id: number;
  ticker: string | null;
  headline: string;
  source: string | null;
  url: string | null;
  publishedAt: string | null;
  sentimentScore: number | null;
  catalystType: string | null;
  athenaSummary: string | null;
  generatedAt: string | null;
}

export interface PerformanceOverview {
  totalSignals: number;
  winRate: number;
  avgReturn: number;
  avgDrawdown: number;
}

export interface SectorPerformance {
  sector: string;
  stockCount: number;
  changePct: number | null;
  signalCount: number;
}

export interface ScreenerRow {
  ticker: string;
  name: string;
  sector: string | null;
  price: number | null;
  changePct: number | null;
  volume: number | null;
  relVolume: number | null;
  marketCap: number | null;
  peRatio: number | null;
  forwardPe: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  beta: number | null;
  returnOnEquity: number | null;
  operatingMargin: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  dividendYield: number | null;
  perfWeek: number | null;
  perfMonth: number | null;
  perfQuarter: number | null;
  perfYtd: number | null;
  perfYear: number | null;
  week52High: number | null;
  week52Low: number | null;
  week52RangePct: number | null;
  rsi: number | null;
  analystTargetPrice: number | null;
  nextEarningsDate: string | null;
  signalScore: number | null;
  signalType: string | null;
  entryLow: number | null;
  entryHigh: number | null;
  stopLoss: number | null;
  targetLow: number | null;
  targetHigh: number | null;
  riskReward: number | null;
  horizonDays: number | null;
  verdict: string | null;
}

export interface AthenaTradePlan {
  entryLow?: number | null;
  entryHigh?: number | null;
  stopLoss?: number | null;
  targetLow?: number | null;
  targetHigh?: number | null;
  riskReward?: number | null;
  narrative: string;
}

export interface AthenaThesisResponse {
  ticker: string;
  verdict: string;
  tier: string;
  thesis: string;
  catalysts: string[];
  risks: string[];
  tradePlan: AthenaTradePlan;
  generatedAt: string;
  model: string;
}

export interface StockSearchResult {
  id: number;
  ticker: string;
  name: string;
  sector: string | null;
  marketCap: number | null;
}

export interface MarketPulseResponse {
  regime: "bull" | "bear" | "highvol" | "neutral";
  spyReturn1d: number | null;
  vixLevel: number | null;
  signalsToday: number;
  buyCount: number;
  watchCount: number;
  narrative: string;
  scanAt: string | null;
  topTickers: string[];
}

export interface TrendingStock {
  ticker: string;
  name: string;
  sector: string | null;
  price: number;
  changePct: number;
  volume: number;
  relVolume: number | null;
  signalScore: number | null;
}

export interface EarningsCalendarItem {
  ticker: string;
  name: string;
  earningsDate: string;
  price: number | null;
  signalScore: number | null;
}

export interface MarketIndex {
  ticker: string;
  label: string;
  category: string;
  price: number | null;
  prevClose: number | null;
  changePct: number | null;
}

export interface AnalystConsensus {
  ticker: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  totalAnalysts: number;
  rating: number;
  targetHigh: number | null;
  targetLow: number | null;
  targetConsensus: number | null;
  targetMedian: number | null;
}

export interface EarningsHistoryItem {
  period: string;
  reportedAt: string | null;
  revenue: number | null;
  revenueGrowth: number | null;
  eps: number | null;
  epsSurprise: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
}

export interface InsiderActivity {
  ticker: string;
  transactionDate: string | null;
  filingDate: string | null;
  reportingName: string | null;
  relationship: string | null;
  transactionType: string | null;
  sharesTraded: number | null;
  price: number | null;
  totalValue: number | null;
}

export interface CongressTradeRow {
  chamber: string;
  ticker: string;
  assetDescription: string | null;
  representative: string | null;
  transactionType: string | null;
  transactionDate: string | null;
  disclosureDate: string | null;
  amount: string | null;
  sourceUrl: string | null;
}

export interface InsiderTrade {
  transactionDate: string | null;
  reportingName: string | null;
  relationship: string | null;
  transactionType: string | null;
  sharesTraded: number | null;
  price: number | null;
  totalValue: number | null;
}

export interface OwnershipResponse {
  ticker: string;
  institutionalPercent: number | null;
  investorsHolding: number | null;
  investorsHoldingChange: number | null;
  totalInvested: number | null;
  ownershipPercentChange: number | null;
  recentInsiderTrades: InsiderTrade[];
}

export interface StockSnapshot {
  // Identity
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  country: string | null;
  // Latest price
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  dayOpen: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  // Volume
  volume: number | null;
  avgVolume: number | null;
  relVolume: number | null;
  // Valuation
  marketCap: number | null;
  floatShares: number | null;
  peRatio: number | null;
  forwardPe: number | null;
  pegRatio: number | null;
  psRatio: number | null;
  priceToBook: number | null;
  debtToEquity: number | null;
  // Margins / Growth
  grossMargin: number | null;
  netMargin: number | null;
  operatingMargin: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  // Profile (slow-changing per-stock)
  beta: number | null;
  analystTargetPrice: number | null;
  nextEarningsDate: string | null;
  // Technicals
  rsi: number | null;
  atr: number | null;
  atrPct: number | null;
  ma20: number | null;
  ma50: number | null;
  ma200: number | null;
  pctFromMa20: number | null;
  pctFromMa50: number | null;
  pctFromMa200: number | null;
  // 52W & Performance
  week52High: number | null;
  week52Low: number | null;
  week52RangePct: number | null;
  perfWeek: number | null;
  perfMonth: number | null;
  perfQuarter: number | null;
  perfYtd: number | null;
  perfYear: number | null;
}

// --- Auth & Account Types ---

export interface UserResponse {
  id: number;
  email: string;
  fullName: string | null;
  plan: string;
  receiveMorningBriefing: boolean;
  receiveSignalAlerts: boolean;
  receiveWeeklyNewsletter: boolean;
}

export interface UpdatePreferencesRequest {
  receiveMorningBriefing?: boolean;
  receiveSignalAlerts?: boolean;
  receiveWeeklyNewsletter?: boolean;
  fullName?: string;
}

export interface SubscriptionResponse {
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  currentPeriodEnd: string | null;
  stripeConfigured: boolean;
}

export interface WatchlistItemResponse {
  id: number;
  stockId: number;
  ticker: string;
  stockName: string;
  createdAt: string;
  currentPrice: number | null;
  changePct: number | null;
  signalScore: number | null;
  signalType: string | null;
  verdict: string | null;
  entryLow: number | null;
  entryHigh: number | null;
  stopLoss: number | null;
  targetLow: number | null;
  targetHigh: number | null;
  riskReward: number | null;
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
  ticker: string | null;
  thresholdJson: string | null;
  createdAt: string;
}

// --- API Functions ---

export const api = {
  // Market (public)
  marketSummary: () => fetchApi<MarketSummary>("/market/summary"),
  marketSectors: () => fetchApi<SectorPerformance[]>("/market/sectors"),
  marketIndices: () => fetchApi<MarketIndex[]>("/market/indices"),
  marketTrending: (limit = 10) => fetchApi<TrendingStock[]>(`/market/trending?limit=${limit}`),
  marketMostActive: (limit = 10) => fetchApi<TrendingStock[]>(`/market/most-active?limit=${limit}`),
  marketEarningsCalendar: (days = 14) => fetchApi<EarningsCalendarItem[]>(`/market/earnings-calendar?days=${days}`),
  marketNews: (limit = 10) => fetchApi<NewsItem[]>(`/market/news?limit=${limit}`),
  marketScreener: (limit = 50) => fetchApi<ScreenerRow[]>(`/market/screener?limit=${limit}`),
  marketInsidersLatest: (limit = 50) => authFetchApi<InsiderActivity[]>(`/market/insiders/latest?limit=${limit}`),
  marketCongressLatest: (limit = 50) => authFetchApi<CongressTradeRow[]>(`/market/congress/latest?limit=${limit}`),
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
  stockSnapshot: (ticker: string) =>
    fetchApi<StockSnapshot>(`/stocks/${ticker}/snapshot`),
  stockAnalyst: (ticker: string) =>
    fetchApi<AnalystConsensus>(`/stocks/${ticker}/analyst`),
  stockEarnings: (ticker: string) =>
    fetchApi<EarningsHistoryItem[]>(`/stocks/${ticker}/earnings`),
  stockOwnership: (ticker: string) =>
    fetchApi<OwnershipResponse>(`/stocks/${ticker}/ownership`),
  stockThesis: (ticker: string) =>
    fetchApi<AthenaThesisResponse>(`/stocks/${ticker}/thesis`),
  marketPulse: () => fetchApi<MarketPulseResponse>("/market/pulse"),
  newsAthenaSummary: (newsId: number) =>
    fetchApi<NewsAthenaSummary>(`/market/news/${newsId}/athena`),
  searchStocks: (q: string, limit = 8) =>
    fetchApi<StockSearchResult[]>(`/stocks/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  // Performance (public)
  performanceOverview: () => fetchApi<PerformanceOverview>("/performance/overview"),

  // Auth (authenticated)
  me: () => authFetchApi<UserResponse>("/auth/me"),
  updatePreferences: (req: UpdatePreferencesRequest) =>
    authFetchApi<UserResponse>("/auth/me/preferences", {
      method: "PATCH",
      body: JSON.stringify(req),
    }),

  // Subscription (authenticated)
  subscription: () => authFetchApi<SubscriptionResponse>("/subscription"),
  createCheckout: (plan: string) =>
    authFetchApi<{ url: string; sessionId: string }>("/subscription/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
  openBillingPortal: () =>
    authFetchApi<{ url: string }>("/subscription/portal", { method: "POST" }),

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

  // Athena Chat (authenticated)
  athenaChat: (message: string, sessionId?: number) =>
    authFetchApi<{ reply: string; sessionId: number | null }>("/athena/chat", {
      method: "POST",
      body: JSON.stringify({ message, sessionId }),
    }),
  athenaSessions: () =>
    authFetchApi<{ id: number; title: string; createdAt: string; updatedAt: string }[]>("/athena/sessions"),
  athenaSession: (id: number) =>
    authFetchApi<{ id: number; title: string; messages: { Role: string; Content: string }[]; createdAt: string }>(`/athena/sessions/${id}`),
  deleteAthenaSession: (id: number) =>
    authFetchApi<void>(`/athena/sessions/${id}`, { method: "DELETE" }),

  // Portfolio (authenticated)
  portfolios: () => authFetchApi<PortfolioSummary[]>("/portfolios"),
  portfolio: (id: number) => authFetchApi<PortfolioSummary>(`/portfolios/${id}`),
  portfolioHoldings: (id: number) => authFetchApi<Holding[]>(`/portfolios/${id}/holdings`),
  portfolioTransactions: (id: number) => authFetchApi<Transaction[]>(`/portfolios/${id}/transactions`).catch(() => []),
  portfolioAnalytics: (id: number) => authFetchApi<PortfolioAnalytics>(`/portfolios/${id}/analytics`).catch(() => null),
  portfolioReturns: (id: number) => authFetchApi<PortfolioReturnBreakdown>(`/portfolios/${id}/returns`).catch(() => null),
  portfolioRating: (id: number) => authFetchApi<PortfolioRating>(`/portfolios/${id}/rating`).catch(() => null),
  portfolioPerformance: (id: number, range: string = "3m") =>
    authFetchApi<PerformanceSeries>(`/portfolios/${id}/performance?range=${range}`).catch(() => null),
  portfolioTax: (id: number) =>
    authFetchApi<PortfolioTaxProfile>(`/portfolios/${id}/tax`).catch(() => null),
  deletePortfolio: (id: number) =>
    authFetchApi<void>(`/portfolios/${id}`, { method: "DELETE" }),
  portfolioAdvisor: (id: number) => authFetchApi<AdvisorResult>(`/portfolios/${id}/advisor`),
  addTransaction: (portfolioId: number, req: { stockTicker: string; type: string; quantity: number; price: number; fees?: number }) =>
    authFetchApi<Transaction>(`/portfolios/${portfolioId}/transactions`, {
      method: "POST",
      body: JSON.stringify(req),
    }),
  applyRecommendation: (portfolioId: number, recommendationId: number, action: "APPLIED" | "DISMISSED") =>
    authFetchApi<{ id: number; status: string }>(`/portfolios/${portfolioId}/advisor/apply/${recommendationId}?action=${action}`, {
      method: "POST",
    }),
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
  dayChangePct: number | null;
  fairValue: number | null;
  fairValueDiscountPct: number | null;
  priceHistory60d: number[] | null;
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

export interface PortfolioReturnBreakdown {
  costBasis: number;
  currentValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  dividendsReceived: number;
  totalReturn: number;
  totalReturnPct: number;
  annualizedReturnPct: number | null;
  inceptionDate: string | null;
  daysSinceInception: number;
  benchmarkReturnPct: number | null;
  alphaPct: number | null;
}

export interface PortfolioCategoryGrade {
  grade: string;    // "A" | "B" | "C" | "D" | "F" | "—"
  score: number;
  label: string;
}

export interface PortfolioRating {
  overall: string;
  overallScore: number;
  categories: Record<string, PortfolioCategoryGrade>;
  strengths: string[];
  watchouts: string[];
  coverage: number;
}

export interface PerformancePoint {
  date: string;
  portfolioIndex: number;
  benchmarkIndex: number;
  portfolioReturnPct: number;
  benchmarkReturnPct: number;
}

export interface PerformanceSeries {
  benchmark: string;
  range: string;
  points: PerformancePoint[];
  finalPortfolioReturnPct: number | null;
  finalBenchmarkReturnPct: number | null;
  finalAlphaPct: number | null;
}

export interface PortfolioTaxProfile {
  shortTermUnrealizedPnl: number;
  longTermUnrealizedPnl: number;
  shortTermRealizedPnlYtd: number;
  longTermRealizedPnlYtd: number;
  nearLongTerm: Array<{
    ticker: string;
    quantity: number;
    unrealizedPnl: number;
    daysUntilLongTerm: number;
  }>;
  taxLossHarvest: Array<{
    ticker: string;
    quantity: number;
    unrealizedPnl: number;
    daysHeld: number;
    holdingType: "short" | "long";
  }>;
}

export interface AdvisorResult {
  healthScore: number;
  recommendations: Recommendation[];
  alerts: string[];
  factorProfile: PortfolioFactorProfile | null;
  verdictMix: Record<string, number> | null;
  regimeContext: "bull" | "bear" | "highvol" | "neutral" | null;
}

export interface PortfolioFactorProfile {
  momentum: number;
  volume: number;
  catalyst: number;
  fundamental: number;
  sentiment: number;
  trend: number;
  risk: number;
  coverage: number;
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
