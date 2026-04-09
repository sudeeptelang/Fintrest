# Fintrest.ai — CLAUDE.md

> AI-powered swing trade discovery + portfolio management platform. Explainable signals, transparent scoring, AI portfolio advisor, daily research delivered before the open.

---

## Project Overview

**Fintrest.ai** is an explainable stock discovery, trading signal, and portfolio management platform. It ranks trade opportunities, explains why they surfaced, tracks performance, manages user portfolios with AI-driven advice, and distributes alerts through a subscription model.

**Core philosophy:** Every signal must be traceable, explainable, and auditable. AI is used as an *interpretation and advisory layer* — never to originate trade ideas or make autonomous decisions.

---

## Brand & Identity

| Item | Value |
|------|-------|
| **Brand name** | Fintrest.ai |
| **Tagline** | *Pick Winning Stocks Before The Market Does* |
| **Primary color** | Emerald green `#00b87c` |
| **Dark color** | Navy `#060c1a` |
| **Font — headings** | Sora (800 weight for hero, 700 for h2/h3) |
| **Font — body** | DM Sans |
| **Font — data/mono** | DM Mono |
| **Design inspiration** | Prospero.ai (bold hero, alternating sections, clean white body) |
| **Logo mark** | Bold "F" in rounded square, green gradient |

---

## Tech Stack (Actual)

### Frontend (Web)
- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Charts:** TradingView Lightweight Charts v5, Recharts (radar)
- **State:** React Query (TanStack) for server state
- **Auth:** Supabase Auth via `@supabase/ssr`
- **Hosting:** Vercel

### Frontend (Mobile)
- **Framework:** Flutter 3.41 + Dart 3.11
- **State:** Riverpod
- **Auth:** `supabase_flutter`
- **Charts:** `fl_chart`

### Backend
- **API:** ASP.NET Core 10 (C# 14) with controllers
- **ORM:** Entity Framework Core 10 + Npgsql
- **Naming:** `EFCore.NamingConventions` (snake_case)
- **Auth:** Validates Supabase JWT tokens
- **Scoring:** Custom 7-factor rule engine (no ML)

### Infrastructure
- **Database:** Supabase PostgreSQL (us-east-1, project: knnprcwapfnrdmugajdw)
- **Auth:** Supabase Auth
- **Payments:** Stripe (subscription billing) — pending
- **Email alerts:** SendGrid — pending
- **SMS alerts:** Twilio — pending
- **Push:** Firebase (FCM) — pending
- **Frontend hosting:** Vercel
- **CDN / Security:** Cloudflare (WAF, rate limiting)

### Data Providers (Live)
| Layer | Primary | API Key Status |
|-------|---------|---------------|
| Market data (OHLCV) | Polygon.io | Connected |
| Fundamentals | Financial Modeling Prep | Connected |
| News/Sentiment | Finnhub | Connected |

---

## Architecture

```
Polygon ──────┐
FMP ──────────├──► DataIngestionService ──► Supabase PostgreSQL
Finnhub ──────┘         │                     (24 tables, partitioned)
                        │
              ┌─────────┘
              ▼
    ScanOrchestrator ──► StockScorer (7-Factor)
              │              │
              │    ┌─────────┼──────────────┐
              │    ▼         ▼              ▼
              │  TradeZone  TechnicalIndic  ExplanationGenerator
              │  Calculator  ators          (AI interpretation)
              │
              ▼
    ASP.NET Core API ──► Next.js Web App (Vercel)
              │      ──► Flutter Mobile App
              │      ──► Alert Engine (pending)
              │
              ▼
    Portfolio Engine ──► AI Advisor
              │      ──► Risk Analytics
              │      ──► Rebalancing Recommendations
              │      ──► Tax-Loss Harvesting
```

---

## Database Schema (Supabase — 24+ tables)

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | id (bigint), email, password_hash, plan, full_name |
| `subscriptions` | Stripe billing state, plan, trial_ends_at |
| `stocks` | Security master (ticker, name, exchange, sector, market_cap, float_shares, country) |
| `market_data` | OHLCV + technicals (partitioned by quarter: 2026 Q1–Q4, 2027 Q1) |
| `fundamentals` | revenue_growth, eps_growth, gross_margin, pe_ratio, debt_to_equity |
| `news_items` | Headlines, sentiment_score, catalyst_type, vendor_source_id |
| `scan_runs` | run_type, market_session, strategy_version, universe_size, status |
| `signals` | score_total, signal_type, entry_low/high, stop_loss, target_low/high, risk_level, horizon_days |
| `signal_breakdowns` | 7 factor scores + explanation_json + why_now_summary |
| `signal_events` | Event sourcing (event_type, event_ts, payload_json) |
| `watchlists` + `watchlist_items` | User watchlists |
| `alerts` + `alert_deliveries` | Alert prefs + delivery log |
| `performance_tracking` | evaluation_mode, entry/exit price, return_pct, max_drawdown_pct, outcome |
| `seo_articles` | slug, title, body_md, status |
| `admin_audit_logs` | actor_user_id, action, entity_type, entity_id, metadata_json |
| `provider_health` | provider, success, latency_ms, checked_at |
| `llm_trace_logs` | explanation_type, model, prompt_hash, input/output_tokens |

### Portfolio Tables (New)
| Table | Purpose |
|-------|---------|
| `portfolios` | id, user_id, name, strategy, cash_balance, created_at |
| `portfolio_holdings` | portfolio_id, stock_id, quantity, avg_cost, current_value, unrealized_pnl |
| `portfolio_transactions` | portfolio_id, stock_id, type (BUY/SELL), quantity, price, fees, executed_at |
| `portfolio_snapshots` | portfolio_id, date, total_value, cash, invested, daily_return_pct |
| `portfolio_ai_recommendations` | portfolio_id, type, ticker, action, reasoning, confidence, status |
| `portfolio_risk_metrics` | portfolio_id, date, sharpe_ratio, sortino_ratio, max_drawdown, beta, var_95 |

**Key constraints:**
- All IDs are `bigint` (auto-increment)
- All enums stored as uppercase strings with CHECK constraints
- `market_data` partitioned by quarter
- snake_case column names throughout

---

## Scoring Engine (Live)

Seven weighted dimensions, scores 0–100:

| Dimension | Weight | Key Signals |
|-----------|--------|-------------|
| Momentum | 25% | Price vs MA20/50/200, rate of change (ROC-10) |
| Relative Volume | 15% | Current vol vs 30-day SMA |
| News Catalyst | 15% | Aggregated sentiment (-1 to 1), catalyst detection |
| Fundamentals | 15% | Revenue growth, EPS growth, gross margin |
| Sentiment | 10% | Social score, analyst rating (1-5), insider buying |
| Trend Strength | 10% | ADX, trend direction alignment |
| Risk Filter | 10% | ATR%, liquidity, float (higher = safer) |

**Signal types:** `BUY_TODAY` (80+) · `WATCH` (60-79) · `HIGH_RISK` (40-59) · `AVOID` (<40)

**Trade zones:** ATR-based entry range (±0.25 ATR), stop-loss (1.5x ATR), target range (2-3x R:R, conviction-adjusted)

**Technical indicators computed:** SMA, EMA, RSI-14, ADX-14, ATR-14, ATR%, ROC-10, MACD, Trend Direction

---

## Portfolio Management (AI-Powered)

### Core Features
- **Multi-portfolio support** — Users can create multiple portfolios with different strategies
- **Real-time holdings tracking** — Live P&L, unrealized gains, cost basis
- **Transaction history** — Full buy/sell/dividend log with fees
- **Daily snapshots** — Historical portfolio value for performance charts

### AI Portfolio Advisor
- **Portfolio health score** — Overall rating based on diversification, risk, and signal alignment
- **Rebalancing recommendations** — Suggest trades to optimize sector allocation and risk
- **Signal-aligned suggestions** — "Your portfolio has TSLA (HIGH_RISK score 54). Consider reducing."
- **Concentration alerts** — Flag when single position > 15% or single sector > 30%
- **Correlation analysis** — Identify highly correlated holdings that increase risk
- **Tax-loss harvesting** — Identify positions with unrealized losses for tax optimization

### Risk Analytics
- **Sharpe Ratio** — Risk-adjusted return measurement
- **Sortino Ratio** — Downside-risk adjusted returns
- **Max Drawdown** — Largest peak-to-trough decline
- **Beta** — Portfolio sensitivity to market movements
- **Value at Risk (VaR 95%)** — Estimated maximum daily loss
- **Sector allocation** — Visual breakdown with target vs actual
- **Drawdown chart** — Historical drawdown visualization

### Portfolio Screens
| Screen | Route | Features |
|--------|-------|----------|
| Portfolio Dashboard | `/portfolio` | Total value, daily P&L, health score, allocation donut |
| Holdings | `/portfolio/holdings` | Live positions with unrealized P&L, signal scores |
| Transactions | `/portfolio/transactions` | Buy/sell log, filters, export |
| AI Advisor | `/portfolio/advisor` | Recommendations, rebalancing, alerts |
| Analytics | `/portfolio/analytics` | Sharpe, drawdown chart, sector allocation, risk metrics |

---

## Daily Cron Job Pipeline

**Schedule:** Every trading day at 6:30 AM ET (before market open)

```
CRON: 30 6 * * 1-5 (Mon-Fri, 6:30 AM ET)

Step 1: Data Ingestion (DataIngestionService)
  ├─ Polygon → OHLCV bars (previous day close)
  ├─ FMP → New quarterly earnings (if any)
  └─ Finnhub → Last 7 days news + sentiment

Step 2: Scoring Engine (ScanOrchestrator)
  ├─ Build snapshot for each active stock
  ├─ Compute technical indicators
  ├─ Run 7-factor scoring
  ├─ Calculate trade zones (ATR-based)
  ├─ Generate AI explanations
  └─ Persist signals + breakdowns + events

Step 3: Portfolio Updates
  ├─ Update current prices for all holdings
  ├─ Recalculate unrealized P&L
  ├─ Take daily snapshot
  ├─ Run AI advisor analysis
  └─ Generate portfolio recommendations

Step 4: Alert Distribution
  ├─ New BUY_TODAY signals → Email (Starter+)
  ├─ Signal upgrades/downgrades → Push (Pro+)
  ├─ Stop-loss hits → SMS (Premium)
  ├─ Portfolio alerts → Email (Pro+)
  └─ Deduplicate within 24h cooling period

Step 5: Performance Tracking
  ├─ Evaluate open signals against current prices
  ├─ Close signals that hit target or stop
  └─ Update win rate, avg return metrics
```

---

## API Endpoints

### Public
```
GET  /api/v1/market/summary
GET  /api/v1/picks/top-today
GET  /api/v1/picks/swing-week
GET  /api/v1/stocks/{ticker}
GET  /api/v1/stocks/{ticker}/chart?range=3m
GET  /api/v1/stocks/{ticker}/signals
GET  /api/v1/stocks/{ticker}/news
GET  /api/v1/performance/overview
GET  /api/v1/blog/{slug}
```

### Authenticated
```
GET  /api/v1/auth/me
POST /api/v1/auth/sync
GET  /api/v1/watchlists
POST /api/v1/watchlists
POST /api/v1/watchlists/{id}/items
GET  /api/v1/alerts
POST /api/v1/alerts
GET  /api/v1/subscription
POST /api/v1/subscription/checkout
```

### Portfolio (Authenticated)
```
GET    /api/v1/portfolios
POST   /api/v1/portfolios
GET    /api/v1/portfolios/{id}
GET    /api/v1/portfolios/{id}/holdings
POST   /api/v1/portfolios/{id}/transactions
GET    /api/v1/portfolios/{id}/transactions
GET    /api/v1/portfolios/{id}/snapshots?range=3m
GET    /api/v1/portfolios/{id}/analytics
GET    /api/v1/portfolios/{id}/advisor
POST   /api/v1/portfolios/{id}/advisor/apply/{recommendationId}
```

### Admin
```
POST /api/v1/admin/scan/run
GET  /api/v1/admin/scan-runs
POST /api/v1/admin/signals/recompute/{signal_id}
GET  /api/v1/admin/provider-health
GET  /api/v1/admin/audit-logs
POST /api/v1/admin/ingest/run
POST /api/v1/admin/ingest/{ticker}
POST /api/v1/admin/universe/sync
POST /api/v1/admin/pipeline/run
```

### Seed (Dev only — remove before production)
```
POST /api/v1/seed/universe
POST /api/v1/seed/ingest
POST /api/v1/seed/scan
POST /api/v1/seed/full
```

---

## Pages & Screens

| Page | Route | Status |
|------|-------|--------|
| Landing / Home | `/` | Done — Prospero-style hero, features, pricing |
| Top Picks | `/picks` | Done — Live signal table from API |
| Swing Trades | `/swing` | Done — BUY_TODAY signals with trade zones |
| Stock Detail | `/stock/{ticker}` | Done — Score ring, radar chart, candlestick chart, AI analysis |
| Dashboard | `/dashboard` | Done — Live market summary + signals |
| Sector Heatmap | `/heatmap` | Built — needs live sector data |
| Watchlist | `/watchlist` | Built — needs API wiring |
| Performance | `/performance` | Done — Live stats |
| Pricing | `/pricing` | Done — 4-tier plans |
| Blog / SEO | `/blog/{slug}` | Built — needs AI generation |
| Admin Panel | `/admin` | Built — needs auth |
| Auth Login | `/auth/login` | Done — Supabase Auth |
| Auth Signup | `/auth/signup` | Done — Supabase Auth |
| **Portfolio Dashboard** | `/portfolio` | **New** |
| **Portfolio Holdings** | `/portfolio/holdings` | **New** |
| **Portfolio Transactions** | `/portfolio/transactions` | **New** |
| **AI Advisor** | `/portfolio/advisor` | **New** |
| **Portfolio Analytics** | `/portfolio/analytics` | **New** |

---

## Subscription Plans

| Plan | Price | Key Features |
|------|-------|-------------|
| Free | $0 | 3 daily picks, delayed signals, basic pages |
| Starter | $19/mo | All picks, watchlist, 9 AM alerts, basic portfolio |
| Pro | $49/mo | 6:30 AM early alerts, trade zones, AI analysis, AI advisor, full portfolio |
| Premium | $99/mo | Real-time SMS/push, stop-loss alerts, tax-loss harvesting, API access |

---

## AI Usage Rules

AI **is** used for:
- Summarizing news catalysts
- Explaining why a stock ranked (plain English from structured inputs)
- Generating entry/stop/target narrative
- Portfolio health scoring and recommendations
- Rebalancing suggestions based on risk + signal alignment
- Tax-loss harvesting identification
- Daily email alert copy
- SEO article generation (`/blog/{ticker}`)

AI **is NOT** used for:
- Originating trade ideas (rule engine only)
- Generating factor scores (7-factor rule engine only)
- Making autonomous buy/sell decisions
- Executing trades on behalf of users

---

## Compliance Requirements

**Required legal pages:** Disclaimer · Terms of Use · Privacy Policy · Risk Disclosure · Refund/Cancellation Policy

**Product language — AVOID:**
- "Guaranteed profits"
- "Best stock to double tomorrow"
- "We predict the future"
- "AI manages your portfolio"

**Product language — USE:**
- "Educational research signals"
- "Data-driven stock analytics"
- "Explainable ranking model"
- "AI-assisted portfolio insights"
- "Historical performance with disclosure context"

**Compliance-by-design controls:**
- Immutable scan run records
- Stored factor provenance per signal (JSONB audit trail)
- Admin audit trails for all actions
- Source freshness checks
- Versioned strategy configs
- LLM trace logging (prompt hash, token counts)
- Portfolio recommendation audit trail

---

## Build Roadmap

### Phase 1 — MVP ✅ (Complete)
- [x] Design system + component library (Tailwind + shadcn/ui)
- [x] Security master + ingestion pipelines (Polygon, FMP, Finnhub)
- [x] Rule engine v1 (7-factor scoring, live with 20 stocks)
- [x] All core pages (Landing, Dashboard, Picks, Stock Detail, Pricing, Watchlist)
- [x] Auth (Supabase Auth across web + mobile + backend)
- [x] Mobile app (Flutter — 8 screens)
- [x] Score ring, radar chart, candlestick chart
- [x] AI explanation generation
- [ ] Stripe subscription billing
- [ ] Email alerts (SendGrid)
- [ ] Compliance pages

### Phase 2 — Portfolio + Cron (Current)
- [ ] Daily cron job (6:30 AM ET ingest + scan + alerts)
- [ ] Portfolio management (holdings, transactions, P&L)
- [ ] AI portfolio advisor (rebalancing, risk, tax-loss)
- [ ] Portfolio analytics (Sharpe, drawdown, sector allocation)
- [ ] Advanced performance tracking
- [ ] TradingView chart improvements

### Phase 3 — Trust & Retention
- [ ] Social login (Google, Apple via Supabase)
- [ ] Push notifications (Firebase FCM)
- [ ] SMS alerts (Twilio)
- [ ] Watchlist intelligence alerts
- [ ] More strategy scan packs
- [ ] A/B test explanation styles

### Phase 4 — Expansion
- [ ] India market (NSE/BSE)
- [ ] API access for developers
- [ ] White-label signal widgets
- [ ] Alt-data features (insider trades, options flow)
- [ ] 500+ stock universe

---

## File Structure

```
fintrest/
├── web/                              # Next.js 16 (Vercel)
│   ├── app/
│   │   ├── (marketing)/              # Landing, pricing, blog
│   │   ├── (app)/                    # Dashboard, picks, stock, portfolio
│   │   ├── (admin)/                  # Admin panel
│   │   └── auth/                     # Login, signup, callback
│   ├── components/
│   │   ├── ui/                       # shadcn/ui
│   │   ├── charts/                   # ScoreRing, FactorRadar, PriceChart
│   │   ├── signals/                  # SignalRow
│   │   ├── landing/                  # Hero, Features, Pricing, CTA
│   │   └── layout/                   # Navbar, Sidebar, Footer
│   ├── lib/
│   │   ├── api.ts                    # Typed API client
│   │   ├── hooks.ts                  # React Query hooks
│   │   ├── constants.ts
│   │   └── supabase/                 # Supabase client + server
│   └── proxy.ts                      # Auth middleware
│
├── backend/Fintrest.Api/             # ASP.NET Core 10
│   ├── Controllers/                  # Auth, Market, Watchlists, Alerts, Admin, Seed, Portfolio
│   ├── Models/                       # EF Core entities (15+ tables)
│   ├── DTOs/                         # Request/response records
│   ├── Data/AppDbContext.cs          # EF Core + snake_case naming
│   ├── Services/
│   │   ├── ScoringEngine.cs          # 7-factor static scorer
│   │   ├── Indicators/               # SMA, EMA, RSI, ADX, ATR, ROC
│   │   ├── Scoring/                  # StockScorer, TradeZone, Explanation
│   │   ├── Pipeline/                 # ScanOrchestrator
│   │   ├── Ingestion/                # DataIngestionService
│   │   ├── Providers/                # Polygon, FMP, Finnhub clients
│   │   └── Portfolio/                # PortfolioService, AIAdvisor, RiskAnalytics
│   └── appsettings.json              # Config (secrets in Development.json)
│
├── mobile/                           # Flutter 3.41
│   └── lib/
│       ├── core/                     # Theme, API client, Supabase config
│       ├── models/                   # Signal, WatchlistItem
│       ├── screens/                  # Auth, Home, Picks, StockDetail, Settings
│       └── widgets/                  # SignalCard, ScoreBar
│
├── CLAUDE.md                         # ← this file
└── README.md                         # Project documentation
```

---

## Observability

- Provider latency tracked in `provider_health` table
- Scan job success/failure in `scan_runs`
- LLM prompt + output trace in `llm_trace_logs`
- Alert delivery tracking in `alert_deliveries`
- Portfolio recommendation audit trail

## Security

- Rate limiting (Cloudflare + API layer)
- Supabase Auth (JWT validation in backend)
- Secrets in `appsettings.Development.json` (gitignored)
- RBAC for admin tools
- PII minimization
- All IDs are bigint (no UUIDs exposed)

---

*For questions, context, or architecture decisions — reference this file first. All AI-generated code in this project must follow the compliance rules above.*
