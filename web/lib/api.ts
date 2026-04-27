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
  // scoreTotal carries the Setup lens (current swing-trade formula).
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
  // Phase 2 multi-lens scoring. compositeScore is the balanced "good
  // investment overall" lens; lensQualityScore is the fundamentals-led
  // "would I hold long-term" lens. Distinct from breakdown.qualityScore
  // (which is the Quality/Profitability/Growth fundamentals sub-score).
  compositeScore: number | null;
  lensQualityScore: number | null;
  // ISO timestamp of the underlying live_quote that we used to overlay
  // currentPrice / changePct. Null when no fresh live_quote was available.
  quoteAsOf: string | null;
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
  // §14.1 — Quality/Profitability/Growth decomposition of the Fundamentals
  // factor. Null for signals scored before FundamentalSubscoreJob ran.
  qualityScore: number | null;
  profitabilityScore: number | null;
  growthScore: number | null;
  // 8th factor — Smart Money family (Insider 35% / Institutional 25% /
  // Short 15% / Congressional 15% / Options 10%). 25% weight in composite.
  // Defaults to 50 (neutral) until Pass B wires the real rollup.
  smartMoneyScore: number;
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
  // §14.5 related — the news-catalyst factor picks a subset of articles per
  // signal to fold into the score. This flag is set by the scoring pipeline
  // on each item that was actually consumed. Null = pre-flag data; we fall
  // back to sentiment heuristics for the UI summary in that case.
  contributedToScore?: boolean | null;
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

export interface AuditLogEntry {
  signalId: number;
  ticker: string;
  stockName: string;
  signalType: string;
  scoreTotal: number;
  issuedAt: string;
  closedAt: string | null;
  entryPrice: number | null;
  exitPrice: number | null;
  returnPct: number | null;
  durationDays: number | null;
  outcome: string; // target_hit | stop_hit | horizon_expired | open
}

export interface FactorProfileSnapshot {
  momentum: number;
  relVolume: number;
  news: number;
  fundamentals: number;
  sentiment: number;
  trend: number;
  risk: number;
}

export interface AuditLogDetail {
  signalId: number;
  ticker: string;
  stockName: string;
  signalType: string;
  scoreTotal: number;
  issuedAt: string;
  closedAt: string | null;
  entryPrice: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  exitPrice: number | null;
  returnPct: number | null;
  maxRunupPct: number | null;
  maxDrawdownPct: number | null;
  durationDays: number | null;
  outcome: string;
  factorProfile: FactorProfileSnapshot | null;
}

export interface SectorPerformance {
  sector: string;
  stockCount: number;
  changePct: number | null;
  signalCount: number;
}

// Slim row from /market/movers — sourced from FMP's biggest-gainers /
// biggest-losers / most-actives endpoints (authoritative for "today's
// % change") with our internal sector / marketCap / signal score
// enrichment. Fewer fields than ScreenerRow because the movers grid
// only needs the headline columns.
export interface MoverRow {
  ticker: string;
  name: string;
  sector: string | null;
  price: number | null;
  change: number | null;
  changePct: number | null;
  marketCap: number | null;
  signalScore: number | null;
  quoteAsOf: string | null;
}

export type MoversCategory = "gainers" | "losers" | "actives";

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
  // Phase 2 multi-lens scoring: balanced "good investment" lens.
  compositeScore: number | null;
  // Phase 2: fundamentals-led "would I hold long-term" lens.
  qualityScore: number | null;
  entryLow: number | null;
  entryHigh: number | null;
  stopLoss: number | null;
  targetLow: number | null;
  targetHigh: number | null;
  riskReward: number | null;
  horizonDays: number | null;
  verdict: string | null;
  quoteAsOf: string | null;
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

// Today page "what changed overnight" — diff between the last 2 completed scans.
export interface OvernightChanges {
  hasComparison: boolean;
  message?: string;
  latestScanAt?: string;
  previousScanAt?: string;
  addedCount: number;
  fellOffCount: number;
  added: OvernightMover[];
  fellOff: OvernightMover[];
  jumps: OvernightDelta[];
  drops: OvernightDelta[];
}

export interface OvernightMover {
  ticker: string;
  name: string;
  score: number;
  signalType: string | null;
}

export interface OvernightDelta {
  ticker: string;
  name: string;
  currentScore: number;
  previousScore: number;
  delta: number;
  signalType: string | null;
}

export interface IpoCalendarItem {
  ticker: string;
  company: string;
  date: string;
  exchange: string | null;
  status: string | null;    // "Expected", "Priced", "Withdrawn"
  shares: number | null;
  priceRange: string | null;
  marketCap: number | null;
}

// Peer comparison set — FMP peers enriched with our own signal score
// and live price. Powers the Compare Mode card.
export interface PeersResponse {
  ticker: string;
  peerCount: number;
  peers: PeerRow[];
}

export interface PeerRow {
  ticker: string;
  name: string | null;
  sector: string | null;
  marketCap: number | null;
  price: number | null;
  changePct: number | null;
  score: number | null;
  inUniverse: boolean;
}

// Real score-history points for sparklines + day-over-day delta.
// Populated at scan time by the backend; each data point is one day.
export interface ScoreHistoryPoint {
  date: string;
  score: number;
  signalType?: string | null;
}

export interface ScoreHistoryResponse {
  ticker: string;
  days: number;
  points: ScoreHistoryPoint[];
}

export interface BulkScoreHistoryResponse {
  days: number;
  tickers: Record<string, Array<{ date: string; score: number }>>;
}

// Analyst revisions window feed for the News / Catalyst deep-dive
// on ticker detail. Band comes server-side so the UI doesn't own
// thresholds.
export interface AnalystRevisionsResponse {
  ticker: string;
  windowDays: number;
  totalEvents: number;
  upgrades: number;
  downgrades: number;
  reiterations: number;
  initializations: number;
  targets: number;
  netRevisions: number;
  band: "strongly-positive" | "positive" | "mixed" | "negative" | "strongly-negative";
  events: AnalystRevisionEvent[];
}

export interface AnalystRevisionEvent {
  date: string;
  action: string | null; // "up" | "down" | "reiterate" | "initialize" | "target"
  newGrade: string | null;
  previousGrade: string | null;
  gradingCompany: string | null;
}

// Earnings surprises feed for the ticker detail + Lens thesis copy.
// Includes per-quarter rows and an aggregate beat-rate + streak so the
// UI can render "beats 7 of last 10 · 3-quarter streak" in one line.
export interface EarningsSurprisesResponse {
  ticker: string;
  quartersReviewed: number;
  beats: number;
  misses: number;
  beatRatePct: number;
  avgSurprisePct: number;
  streak: number; // + = consecutive beats, - = consecutive misses
  quarters: EarningsSurpriseRow[];
}

export interface EarningsSurpriseRow {
  reportDate: string;
  estimatedEps: number | null;
  actualEps: number | null;
  surprisePct: number | null;
  beat: boolean;
}

// FMP DCF fair-value + implied upside vs current price. Band ships
// pre-computed server-side so the frontend doesn't own the thresholds.
export interface DcfResponse {
  ticker: string;
  dcfFairValue: number;
  stockPrice: number | null;
  impliedUpsidePct: number | null;
  band: "undervalued" | "fair" | "overvalued" | "unknown";
  asOf: string | null;
}

// Institutional-grade financial health scores from FMP — Altman Z +
// Piotroski F. Surfaces in the Fundamentals deep-dive on ticker
// detail. Bands come pre-computed from the backend so the UI never
// hardcodes the thresholds.
export interface FinancialScoresResponse {
  ticker: string;
  altmanZScore: number | null;
  altmanBand: "safe" | "grey" | "distress" | "unknown";
  piotroskiScore: number | null;
  piotroskiBand: "strong" | "mid" | "weak" | "unknown";
  workingCapital: number | null;
  totalAssets: number | null;
  marketCap: number | null;
  totalLiabilities: number | null;
  revenue: number | null;
}

// Smart Money (phase 2) institutional-flow sub-signal derived from
// FMP's 13F-rolled-up ownership feed. Score combines ownership %
// change + investor count change.
export interface InstitutionalSignalResponse {
  ticker: string;
  score: number;
  institutionalPercent: number | null;
  investorsHolding: number | null;
  investorsHoldingChange: number | null;
  ownershipPercentChange: number | null;
  totalInvested: number | null;
  evidence: string | null;
}

// Smart Money (phase 2) congressional sub-signal derived from the last
// 90 days of firehose disclosures. Shape matches
// MarketController.GetCongressSignal.
export interface CongressSignalResponse {
  ticker: string;
  score: number;
  buyCount90d: number;
  sellCount90d: number;
  bipartisan: boolean;
  evidence: string | null;
  latestDisclosure: string | null;
}

// Smart Money (phase 2) short-interest snapshot. Mirrors the anonymous
// response shape of MarketController.GetShortInterest.
export interface ShortInterestResponse {
  ticker: string;
  settlementDate: string;
  shortPctFloat: number | null;
  daysToCover: number | null;
  shortInterestShares: number | null;
  floatShares: number | null;
  avgDailyVolume: number | null;
  score: number;
  evidence: string | null;
}

// Smart Money (phase 1) per-ticker composite. Mirrors InsiderScoreResponse
// on the backend — see MarketController.GetInsiderScore. Null-shaped fields
// are present when the feed returned no qualifying activity.
export interface InsiderScore {
  ticker: string;
  asOfDate: string;
  score: number;
  netDollarFlow30d: number | null;
  clusterCount30d: number | null;
  officerBuyCount: number | null;
  directorBuyCount: number | null;
  largestPurchaseValue: number | null;
  largestPurchaserName: string | null;
  largestPurchaserTitle: string | null;
  largestPurchaserHistoryNote: string | null;
  methodologyVersion: string;
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
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
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

export interface MarketRegimeDto {
  state: "risk-on" | "neutral" | "risk-off";
  vix: number | null;
  tenYear: number | null;
  dxy: number | null;
  updatedAt: string | null;
}

export const api = {
  // Market (public)
  marketSummary: () => fetchApi<MarketSummary>("/market/summary"),
  marketRegime: () => fetchApi<MarketRegimeDto>("/market/regime"),
  marketSectors: () => fetchApi<SectorPerformance[]>("/market/sectors"),
  marketIndices: () => fetchApi<MarketIndex[]>("/market/indices"),
  marketTrending: (limit = 10) => fetchApi<TrendingStock[]>(`/market/trending?limit=${limit}`),
  marketMostActive: (limit = 10) => fetchApi<TrendingStock[]>(`/market/most-active?limit=${limit}`),
  marketEarningsCalendar: (days = 14) => fetchApi<EarningsCalendarItem[]>(`/market/earnings-calendar?days=${days}`),
  marketIposCalendar: (limit = 20) => fetchApi<IpoCalendarItem[]>(`/market/ipos-calendar?limit=${limit}`),
  marketNews: (limit = 10) => fetchApi<NewsItem[]>(`/market/news?limit=${limit}`),
  marketScreener: (limit = 50) => fetchApi<ScreenerRow[]>(`/market/screener?limit=${limit}`),
  marketMovers: (category: MoversCategory, limit = 20) =>
    fetchApi<MoverRow[]>(`/market/movers?category=${category}&limit=${limit}`),
  marketInsidersLatest: (limit = 50) => authFetchApi<InsiderActivity[]>(`/market/insiders/latest?limit=${limit}`),
  marketInsidersByTicker: (ticker: string, limit = 10) =>
    authFetchApi<InsiderActivity[]>(`/market/insiders/${ticker}?limit=${limit}`),
  marketCongressByTicker: (ticker: string, limit = 10) =>
    authFetchApi<CongressTradeRow[]>(`/market/congress/${ticker}?limit=${limit}`),
  marketPeers: async (ticker: string): Promise<PeersResponse | null> => {
    const res = await fetch(`${API_BASE}/market/peers/${ticker}`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  },
  stockScoreHistory: (ticker: string, days = 30) =>
    fetchApi<ScoreHistoryResponse>(`/stocks/${ticker}/score-history?days=${days}`),
  stockScoreHistoryBulk: (tickers: string[], days = 30) =>
    fetchApi<BulkScoreHistoryResponse>(`/stocks/score-history/bulk?tickers=${tickers.join(",")}&days=${days}`),
  marketAnalystRevisions: async (ticker: string, days = 30): Promise<AnalystRevisionsResponse | null> => {
    const res = await fetch(`${API_BASE}/market/analyst-revisions/${ticker}?days=${days}`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  },
  marketEarningsSurprises: async (ticker: string, quarters = 10): Promise<EarningsSurprisesResponse | null> => {
    const res = await fetch(`${API_BASE}/market/earnings-surprises/${ticker}?quarters=${quarters}`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  },
  marketDcf: async (ticker: string): Promise<DcfResponse | null> => {
    const res = await fetch(`${API_BASE}/market/dcf/${ticker}`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  },
  marketFinancialScores: async (ticker: string): Promise<FinancialScoresResponse | null> => {
    const res = await fetch(`${API_BASE}/market/financial-scores/${ticker}`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  },
  marketInstitutionalSignal: async (ticker: string): Promise<InstitutionalSignalResponse | null> => {
    const res = await fetch(`${API_BASE}/market/institutional-signal/${ticker}`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  },
  marketCongressSignal: async (ticker: string): Promise<CongressSignalResponse | null> => {
    const res = await fetch(`${API_BASE}/market/congress-signal/${ticker}`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  },
  marketShortInterest: async (ticker: string): Promise<ShortInterestResponse | null> => {
    // GET /market/short-interest/{ticker} returns 204 when we haven't
    // pulled a snapshot for this ticker yet. Treat that as null.
    const res = await fetch(`${API_BASE}/market/short-interest/${ticker}`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  },
  marketInsiderScore: async (ticker: string): Promise<InsiderScore | null> => {
    // GET /market/insider-score/{ticker} returns 204 when there's no qualifying
    // activity in the 30-day window. Treat that as null — the sub-card renders
    // the "no recent insider buying" empty state.
    const res = await fetch(`${API_BASE}/market/insider-score/${ticker}`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  },
  marketCongressLatest: (limit = 50) => authFetchApi<CongressTradeRow[]>(`/market/congress/latest?limit=${limit}`),
  topPicks: (limit = 12) => fetchApi<SignalListResponse>(`/picks/top-today?limit=${limit}`),
  overnightChanges: () => fetchApi<OvernightChanges>("/signals/overnight-changes"),
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

  // Performance + audit log (public — trust surface)
  performanceOverview: () => fetchApi<PerformanceOverview>("/performance/overview"),
  auditLog: (status?: "win" | "loss" | "open", limit = 100) => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    qs.set("limit", String(limit));
    return fetchApi<AuditLogEntry[]>(`/market/audit-log?${qs.toString()}`);
  },
  auditLogDetail: (signalId: number) =>
    fetchApi<AuditLogDetail>(`/market/audit-log/${signalId}`),

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

  // Ask Lens chat removed for MVP. Thesis generation per-signal still lives
  // under `/market/...` + `/stocks/{ticker}/thesis` and is unaffected.

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
  deleteHolding: (portfolioId: number, holdingId: number) =>
    authFetchApi<void>(`/portfolios/${portfolioId}/holdings/${holdingId}`, { method: "DELETE" }),
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

  // Admin (authenticated, admin role)
  adminSystemHealth: () =>
    authFetchApi<SystemHealthResponse>("/admin/system-health"),
  adminRunPipeline: () =>
    authFetchApi<unknown>("/admin/pipeline/run", { method: "POST" }),
  adminRunScan: () =>
    authFetchApi<unknown>("/admin/scan/run", { method: "POST" }),
  adminRunIngestion: () =>
    authFetchApi<unknown>("/admin/ingest/run", { method: "POST" }),
  adminRefreshQuotes: (count = 500) =>
    authFetchApi<unknown>(`/admin/quotes/refresh?count=${count}`, { method: "POST" }),
  adminIngestTopCaps: (count = 100) =>
    authFetchApi<unknown>(`/admin/ingest/top-caps?count=${count}`, { method: "POST" }),
  // Smart-money sub-signal triggers — run these to populate the
  // insider_scores + short_interest_snapshots tables that feed the 8th
  // factor. Edgar pulls Form 4 raw rows; Insider score recompute rolls
  // those into per-ticker scores; Short-interest hits FMP for the
  // weekly FINRA snapshot.
  adminEdgarIngest: () =>
    authFetchApi<unknown>("/admin/edgar/ingest", { method: "POST" }),
  adminInsiderScoreRecompute: () =>
    authFetchApi<unknown>("/admin/insiders/score/recompute", { method: "POST" }),
  adminShortInterestIngest: () =>
    authFetchApi<unknown>("/admin/short-interest/ingest", { method: "POST" }),
  // Firehose refresh — pulls FMP insider + congress feeds into
  // market_firehose_snapshots. Lights up the Congressional sub-signal
  // on stock detail pages.
  adminFirehoseRefresh: () =>
    authFetchApi<unknown>("/admin/firehose/refresh", { method: "POST" }),
  adminRecentScans: (limit = 10) =>
    authFetchApi<{ scans: AdminRecentScan[] }>(`/admin/scans/recent?limit=${limit}`),
};

export interface AdminRecentScan {
  id: number;
  startedAt: string;
  completedAt: string | null;
  signalsGenerated: number;
  status: string;
  durationMs: number | null;
}

// --- Admin Types ---

export interface SystemHealthResponse {
  overallStatus: "ok" | "alert";
  alerts: string[];
  nowUtc: string;
  nowEt: string;
  scan: {
    lastRunAt: string | null;
    lastRunStatus: string | null;
    lastRunSignals: number | null;
    lastRunUniverse: number | null;
    lastRunCompletedAt: string | null;
    todayRan: boolean;
    hoursSinceLastRun: number | null;
  };
  morningBriefing: {
    audienceSize: number;
    weeklyAudienceSize: number;
    todaySent: boolean;
    todaySentCount: number;
    todayFailedCount: number;
    todayStatus: string | null;
    lastSentAt: string | null;
    lastSentCount: number | null;
    lastStatus: string | null;
    lastError: string | null;
    lastWeeklyAt: string | null;
    lastWeeklySentCount: number | null;
  };
  featurePopulation: {
    runId: string;
    tradeDate: string;
    startedAt: string;
    endedAt: string | null;
    universeSize: number | null;
    sectorFallbacks: number;
  } | null;
  lastIngestion: {
    at: string;
    action: string;
    actorUserId: number | null;
  } | null;
  providers: Array<{
    provider: string;
    totalChecks: number;
    successes: number;
    successRate: number;
    lastCheckedAt: string;
    lastOk: boolean;
    lastLatencyMs: number | null;
  }>;
  jobs: Array<{
    name: string;
    pattern: string;
    nextFireEt: string;
  }>;
  recentAdminActions: Array<{
    id: number;
    actorUserId: number | null;
    action: string;
    entityType: string | null;
    entityId: number | null;
    createdAt: string;
  }>;
}

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
