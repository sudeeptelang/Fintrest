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

// --- API Functions ---

export const api = {
  // Market
  marketSummary: () => fetchApi<MarketSummary>("/market/summary"),
  topPicks: (limit = 12) => fetchApi<SignalListResponse>(`/picks/top-today?limit=${limit}`),
  swingWeek: () => fetchApi<SignalListResponse>("/picks/swing-week"),

  // Stocks
  stock: (ticker: string) => fetchApi<StockInfo>(`/stocks/${ticker}`),
  stockChart: (ticker: string, range = "3m") =>
    fetchApi<MarketDataPoint[]>(`/stocks/${ticker}/chart?range=${range}`),
  stockSignals: (ticker: string) =>
    fetchApi<SignalListResponse>(`/stocks/${ticker}/signals`),
  stockNews: (ticker: string) =>
    fetchApi<NewsItem[]>(`/stocks/${ticker}/news`),

  // Performance
  performanceOverview: () => fetchApi<PerformanceOverview>("/performance/overview"),

  // Portfolio
  portfolios: () => fetchApi<PortfolioSummary[]>("/portfolios"),
  portfolio: (id: number) => fetchApi<PortfolioSummary>(`/portfolios/${id}`),
  portfolioHoldings: (id: number) => fetchApi<Holding[]>(`/seed/portfolio/${id}/holdings`),
  portfolioTransactions: (id: number) => fetchApi<Transaction[]>(`/portfolios/${id}/transactions`).catch(() => []),
  portfolioAnalytics: (id: number) => fetchApi<PortfolioAnalytics>(`/portfolios/${id}/analytics`).catch(() => null),
  portfolioAdvisor: (id: number) => fetchApi<AdvisorResult>(`/seed/portfolio/${id}/advisor`),
  portfolioAiAnalysis: (id: number) => fetchApi<AiAnalysis>(`/seed/portfolio/${id}/ai-analysis`),
  importCsv: (file: File, name: string, cash?: number) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_BASE}/seed/portfolio/upload?name=${encodeURIComponent(name)}${cash ? `&cash=${cash}` : ""}`, {
      method: "POST",
      body: form,
    }).then(r => {
      if (!r.ok) return r.text().then(t => { throw new Error(t); });
      return r.json();
    }) as Promise<ImportAnalyzeResult>;
  },
  importText: (holdings: string, name?: string, cash?: number) =>
    fetchApi<ImportAnalyzeResult>("/seed/portfolio/text", {
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
