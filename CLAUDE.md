# Fintrest.ai — CLAUDE.md

> AI-powered swing trade discovery platform. Explainable signals, transparent scoring, daily research delivered before the open.

---

## Project Overview

**Fintrest.ai** is an explainable stock discovery and trading signal platform — not a black-box predictor. It ranks trade opportunities, explains why they surfaced, tracks performance, and distributes alerts through a subscription model.

**Core philosophy:** Every signal must be traceable, explainable, and auditable. AI is used only as an *interpretation layer* — never to originate trade ideas.

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

## Tech Stack

### Frontend
- **Framework:** Next.js (App Router) + React 18
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** TradingView Lightweight Charts v5
- **State:** Zustand for client state, React Query for server state
- **Auth:** NextAuth.js or Clerk

### Backend
- **API:** FastAPI (Python) — preferred for scoring/AI workflows
- **Alt:** ASP.NET Core — for strongly typed enterprise patterns
- **Jobs/Workers:** Celery + Redis (recurring scans, alerts)
- **ORM:** SQLAlchemy (Python) or EF Core (.NET)

### Infrastructure
- **Database:** PostgreSQL (primary system of record)
- **Cache:** Redis (fast reads, job queue)
- **Payments:** Stripe (subscription billing)
- **Email alerts:** SendGrid
- **SMS alerts:** Twilio
- **Push:** Firebase (FCM)
- **Frontend hosting:** Vercel
- **Backend hosting:** Railway / AWS ECS / Azure App Service
- **CDN / Security:** Cloudflare (WAF, rate limiting)

---

## Architecture

```
Market Data APIs ──┐
Fundamental APIs   ├──► Ingestion Service ──► Normalization ──► PostgreSQL
News/Sentiment     │                                          ──► Redis Cache
Alt Data APIs  ────┘

PostgreSQL + Redis ──► Rule Engine / Signal Engine
                            │
                  ┌─────────┼──────────────┐
                  ▼         ▼              ▼
            Signal Store  Performance   AI Explanation
            (Breakdown)   Tracker       Service (LLM)
                  │
                  ▼
           Backend API ──► Next.js Web App
                       ──► Admin Panel
                       ──► Alert Engine ──► Email / SMS / Push
```

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | id, email, password_hash, plan, created_at |
| `subscriptions` | Stripe billing state |
| `stocks` | Security master (ticker, name, exchange, sector) |
| `market_data` | OHLCV + technical indicators, partitioned by month |
| `fundamentals` | Point-in-time revenue, EPS, margins, valuation |
| `news_items` | Headlines, sentiment_score, catalyst_type |
| `scan_runs` | Every scanner execution with timestamps |
| `signals` | Core signal output (score_total, signal_type, entry/stop/target) |
| `signal_breakdowns` | Weighted factor scores + explanation_json |
| `signal_events` | Event sourcing for signal lifecycle |
| `watchlists` + `watchlist_items` | User watchlists |
| `alerts` + `alert_deliveries` | Alert prefs + delivery log |
| `performance_tracking` | Signal evaluation (return_pct, drawdown, etc.) |
| `seo_articles` | AI-generated SEO content per ticker |
| `admin_audit_logs` | Full control trail |

**Postgres notes:**
- Partition `market_data` by month/quarter
- Composite indexes on `(stock_id, ts DESC)` and `(scan_run_id, score_total DESC)`
- Use JSONB for `explanation_json` and `factor_provenance`

---

## Scoring Engine

Seven weighted dimensions, scores 0–100:

| Dimension | Weight | Key Signals |
|-----------|--------|-------------|
| Momentum | 25% | Price vs MA20/50/200, rate of change |
| Relative Volume | 15% | Today vol vs 30-day avg |
| News Catalyst | 15% | Sentiment score, catalyst_type |
| Earnings/Fundamentals | 15% | Revenue growth, EPS beat, margins |
| Sentiment | 10% | Social, insider, analyst |
| Trend Strength | 10% | ADX, trend direction |
| Risk Filter | 10% | ATR, liquidity, float |

**Signal types:** `BUY_TODAY` · `WATCH` · `AVOID` · `TAKE_PROFIT` · `HIGH_RISK`

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
POST /api/v1/auth/signup
POST /api/v1/auth/login
GET  /api/v1/me
GET  /api/v1/watchlists
POST /api/v1/watchlists
POST /api/v1/watchlists/{id}/items
POST /api/v1/alerts
GET  /api/v1/subscription
POST /api/v1/subscription/checkout
```

### Admin
```
POST /api/v1/admin/scan/run
GET  /api/v1/admin/scan-runs
POST /api/v1/admin/signals/recompute/{signal_id}
GET  /api/v1/admin/provider-health
GET  /api/v1/admin/audit-logs
```

---

## Pages & Screens

| Page | Route | Notes |
|------|-------|-------|
| Landing / Home | `/` | Prospero-style hero, features, social proof |
| Top Picks | `/picks` | Ranked signal table, scan filters |
| Swing Trades | `/swing` | Weekly trade setups |
| Stock Detail | `/stock/{ticker}` | Full signal breakdown + chart + AI |
| Sector Heatmap | `/heatmap` | Color-coded sector performance |
| Watchlist | `/watchlist` | User's saved stocks |
| Performance | `/performance` | Signal track record |
| Pricing | `/pricing` | 4-tier plans + FAQ |
| Blog / SEO | `/blog/{slug}` | AI-generated ticker pages |
| Admin Panel | `/admin` | Internal monitoring |

---

## Subscription Plans

| Plan | Price | Key Features |
|------|-------|-------------|
| Free | $0 | 3 daily picks, delayed signals, basic pages |
| Starter | $19/mo | All 12 picks, watchlist, 9 AM alerts |
| Pro | $49/mo | 6:30 AM early alerts, full trade zones, AI analysis |
| Premium | $99/mo | Real-time SMS/push, stop-loss alerts, India+US, API |

---

## Alert System

**Types:** New strong buy · Upgrade to buy · Stop loss hit · Target reached · Watchlist breakout · Earnings catalyst

**Channels:** Email (SendGrid) · SMS (Twilio) · Push (Firebase FCM)

**Rules:** Deduplicate within cooling period · Respect market hours preference · Free tier = no alerts · Starter = delayed email only

---

## Data Providers

| Layer | Primary | Backup |
|-------|---------|--------|
| Market data | Polygon | Twelve Data / Tiingo |
| Fundamentals | Financial Modeling Prep | Finnhub |
| News/Sentiment | Finnhub News | MarketAux / Benzinga |
| Alt data | Reddit/X sentiment, Insider trades, Options activity | — |

---

## AI Usage Rules

AI **is** used for:
- Summarizing news catalysts
- Explaining why a stock ranked (plain English from structured inputs)
- Generating entry/stop/target narrative
- Daily email alert copy
- SEO article generation (`/blog/{ticker}`)

AI **is NOT** used for:
- Originating trade ideas
- Generating scores (rule engine only)
- Making buy/sell decisions

---

## Compliance Requirements

**Required legal pages:** Disclaimer · Terms of Use · Privacy Policy · Risk Disclosure · Refund/Cancellation Policy

**Product language — AVOID:**
- "Guaranteed profits"
- "Best stock to double tomorrow"
- "We predict the future"

**Product language — USE:**
- "Educational research signals"
- "Data-driven stock analytics"
- "Explainable ranking model"
- "Historical performance with disclosure context"

**Compliance-by-design controls:**
- Immutable scan run records
- Stored factor provenance per signal
- Admin audit trails
- Source freshness checks
- Versioned strategy configs

---

## Build Roadmap

### Phase 1 — MVP (Weeks 1–8)
- [ ] Design system + component library
- [ ] Security master + ingestion pipelines
- [ ] Rule engine v1
- [ ] Home, Dashboard, Top Picks, Stock Detail, Pricing, Watchlist
- [ ] Auth (sign up/login/JWT)
- [ ] Stripe subscription billing
- [ ] Email alerts (SendGrid)
- [ ] Basic performance tracking
- [ ] Compliance pages + SEO framework

### Phase 2 — Trust & Retention
- [ ] Advanced performance analytics
- [ ] Watchlist intelligence alerts
- [ ] Sector heatmap
- [ ] More strategy scan packs
- [ ] A/B test explanation styles and pricing

### Phase 3 — Expansion
- [ ] India market (NSE/BSE)
- [ ] API access for developers
- [ ] White-label signal widgets
- [ ] Mobile app (React Native)
- [ ] Alt-data features (insider trades, options flow)

---

## Observability

- Provider latency and failure dashboards
- Scan job success/failure metrics
- Stale data alerts
- Alert delivery rate monitoring
- LLM prompt + output trace logging

## Security

- Rate limiting (Cloudflare + API layer)
- Signed webhooks for Stripe
- Secrets in vault (not env files in prod)
- RBAC for admin tools
- PII minimization

## Testing

- Unit tests per factor function
- Regression tests per rule version
- Snapshot tests for signal explanations
- Synthetic provider failure drills

---

## File Structure (Next.js)

```
fintrest-ai/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx              # Landing
│   │   ├── pricing/page.tsx
│   │   └── blog/[slug]/page.tsx
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   ├── picks/page.tsx
│   │   ├── stock/[ticker]/page.tsx
│   │   ├── heatmap/page.tsx
│   │   └── watchlist/page.tsx
│   ├── (admin)/
│   │   └── admin/page.tsx
│   └── api/
│       └── v1/
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── charts/                   # Lightweight Charts wrappers
│   ├── signals/                  # SignalCard, ScoreRing, TradeSetup
│   └── layout/                   # Nav, Sidebar, Footer
├── lib/
│   ├── api.ts                    # API client
│   ├── scoring.ts                # Score display helpers
│   └── constants.ts
├── styles/
│   └── globals.css               # Tailwind + brand tokens
└── CLAUDE.md                     # ← this file
```

---

*For questions, context, or architecture decisions — reference this file first. All AI-generated code in this project must follow the compliance rules above.*
