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
};
