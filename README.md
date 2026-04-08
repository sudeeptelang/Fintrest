# Fintrest.ai

**Pick Winning Stocks Before The Market Does**

AI-powered swing trade discovery platform. Explainable signals, transparent scoring, daily research delivered before the open.

---

## What is Fintrest?

Fintrest.ai ranks trade opportunities using a 7-factor scoring engine, explains why each stock surfaced, tracks signal performance, and delivers alerts through email, SMS, and push notifications. Every signal is traceable, explainable, and auditable — AI is used only as an interpretation layer, never to originate trade ideas.

---

## Architecture

```
Market Data APIs ──┐
Fundamental APIs   ├──► Ingestion ──► PostgreSQL (Supabase)
News/Sentiment     │                  ──► Redis Cache
Alt Data APIs  ────┘

PostgreSQL ──► Scoring Engine (7-Factor) ──► Signal Store
                    │                            │
              ┌─────┼──────────┐                 │
              ▼     ▼          ▼                 ▼
         Breakdown  AI       Trade Zone    Backend API (.NET)
         (Audit)    Explain  Calculator         │
                                          ┌─────┼──────┐
                                          ▼     ▼      ▼
                                       Next.js  Flutter  Alerts
                                       (Web)   (Mobile)  Engine
```

---

## Project Structure

```
fintrest/
├── web/                    # Next.js 16 (App Router) + Tailwind + shadcn/ui
├── backend/                # ASP.NET Core 10 Web API + EF Core + Npgsql
│   └── Fintrest.Api/
├── mobile/                 # Flutter 3.41 (iOS + Android)
└── CLAUDE.md               # Project spec and AI instructions
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend (Web)** | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, Framer Motion |
| **Frontend (Mobile)** | Flutter 3.41, Dart 3.11, Riverpod, Dio, fl_chart |
| **Backend API** | ASP.NET Core 10, C# 14, EF Core 10, Npgsql |
| **Database** | PostgreSQL via Supabase (us-east-1) |
| **Auth** | Supabase Auth |
| **Payments** | Stripe |
| **Email Alerts** | SendGrid |
| **SMS Alerts** | Twilio |
| **Push Notifications** | Firebase (FCM) |
| **Frontend Hosting** | Vercel |
| **CDN / Security** | Cloudflare |

---

## Scoring Engine

Seven weighted dimensions, each scored 0–100:

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| **Momentum** | 25% | Price vs MA20/50/200, rate of change |
| **Relative Volume** | 15% | Current volume vs 30-day average |
| **News Catalyst** | 15% | Aggregated sentiment, catalyst detection |
| **Fundamentals** | 15% | Revenue growth, EPS surprise, margins |
| **Sentiment** | 10% | Social, analyst ratings, insider activity |
| **Trend Strength** | 10% | ADX, trend direction alignment |
| **Risk Filter** | 10% | ATR volatility, liquidity, float |

**Signal types:** `BUY_TODAY` (80+) · `WATCH` (60-79) · `HIGH_RISK` (40-59) · `AVOID` (<40)

**Trade zones:** ATR-based stop-loss (1.5x ATR), conviction-adjusted targets (2:1 to 3:1 R:R).

### Pipeline Flow

```
POST /api/v1/admin/scan/run
  → Load active stocks from DB
  → Build snapshot (market data, fundamentals, news)
  → Compute technical indicators (SMA, EMA, RSI, ADX, ATR, ROC)
  → Run 7-factor scoring engine
  → Calculate trade zones
  → Generate plain-English explanation
  → Persist signals + breakdowns + provenance
  → Return ranked results
```

---

## Database Schema

24 tables on Supabase with partitioned `market_data` (quarterly).

| Table | Purpose |
|-------|---------|
| `users` | Auth and profile |
| `subscriptions` | Stripe billing state |
| `stocks` | Security master |
| `market_data` | OHLCV + technical indicators (partitioned) |
| `fundamentals` | Revenue, EPS, margins, valuation |
| `news_items` | Headlines, sentiment scores, catalyst type |
| `scan_runs` | Every scan execution with metadata |
| `signals` | Scored output (type, score, entry/stop/target) |
| `signal_breakdowns` | 7-factor scores + explanation JSON |
| `signal_events` | Event sourcing for signal lifecycle |
| `watchlists` / `watchlist_items` | User watchlists |
| `alerts` / `alert_deliveries` | Alert prefs + delivery log |
| `performance_tracking` | Signal outcome tracking |
| `seo_articles` | AI-generated SEO content |
| `admin_audit_logs` | Full control trail |

---

## API Endpoints

All routes under `/api/v1`.

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/market/summary` | Market overview + signal count |
| GET | `/picks/top-today` | Ranked signals from latest scan |
| GET | `/picks/swing-week` | Weekly swing trade setups |
| GET | `/stocks/{ticker}` | Stock profile |
| GET | `/stocks/{ticker}/chart` | OHLCV price data |
| GET | `/stocks/{ticker}/signals` | Signal history for a stock |
| GET | `/stocks/{ticker}/news` | Recent news with sentiment |
| GET | `/performance/overview` | Aggregate win rate and returns |
| GET | `/blog/{slug}` | SEO article content |

### Authenticated
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Create account |
| POST | `/auth/login` | Sign in |
| GET | `/auth/me` | Current user profile |
| GET | `/watchlists` | List user watchlists |
| POST | `/watchlists` | Create watchlist |
| POST | `/watchlists/{id}/items` | Add stock to watchlist |
| GET / POST | `/alerts` | Manage alert preferences |
| GET | `/subscription` | Billing status |
| POST | `/subscription/checkout` | Stripe checkout |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/scan/run` | Trigger scoring pipeline |
| GET | `/admin/scan-runs` | Scan history |
| POST | `/admin/signals/recompute/{id}` | Recompute a signal |
| GET | `/admin/provider-health` | Data provider status |
| GET | `/admin/audit-logs` | Admin action trail |

---

## Web App Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero, features, pricing, testimonials |
| Top Picks | `/picks` | Ranked signal table |
| Swing Trades | `/swing` | Weekly setups with trade zones |
| Stock Detail | `/stock/{ticker}` | Score breakdown, AI analysis, chart |
| Sector Heatmap | `/heatmap` | Color-coded sector performance |
| Watchlist | `/watchlist` | User's saved stocks |
| Performance | `/performance` | Signal track record |
| Pricing | `/pricing` | 4-tier subscription plans |
| Blog | `/blog/{slug}` | AI-generated SEO pages |
| Dashboard | `/dashboard` | Summary cards + today's signals |
| Admin | `/admin` | System health, scan runs |

---

## Mobile App Screens

| Screen | Description |
|--------|-------------|
| Login / Signup | Email + password auth |
| Home | Dashboard with summary cards + top signals |
| Top Picks | Full signal list with scores |
| Stock Detail | Score breakdown bars, trade zone, chart |
| Watchlist | Saved stocks with alert toggles |
| Settings | Profile, subscription, notifications, logout |

---

## Subscription Plans

| Plan | Price | Key Features |
|------|-------|-------------|
| **Free** | $0 | 3 daily picks, delayed signals |
| **Starter** | $19/mo | All 12 picks, watchlist, 9 AM alerts |
| **Pro** | $49/mo | 6:30 AM early alerts, trade zones, AI analysis |
| **Premium** | $99/mo | Real-time SMS/push, stop-loss alerts, API access |

---

## Getting Started

### Prerequisites

- Node.js 20+
- .NET 10 SDK
- Flutter 3.40+
- PostgreSQL (or Supabase account)

### Web (Next.js)

```bash
cd web
npm install
npm run dev
# → http://localhost:3000
```

### Backend (ASP.NET Core)

```bash
cd backend/Fintrest.Api
# Update appsettings.json with your Supabase connection string
dotnet run
# → http://localhost:5000
# → Swagger UI at http://localhost:5000/swagger
```

### Mobile (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

---

## Environment Variables

### Backend (`appsettings.json`)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=db.xxx.supabase.co;Database=postgres;Username=postgres;Password=..."
  },
  "Jwt": {
    "Secret": "your-secret-key-min-32-chars",
    "Issuer": "fintrest.ai",
    "Audience": "fintrest.ai"
  }
}
```

### Web (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Connected Services

| Service | Purpose |
|---------|---------|
| **Supabase** | Database + Auth |
| **Vercel** | Web frontend hosting |
| **Cloudflare** | CDN, WAF, rate limiting |
| **Stripe** | Subscription billing |
| **SendGrid** | Email alerts |
| **Twilio** | SMS alerts |
| **Firebase** | Push notifications |

---

## Compliance

Fintrest.ai provides **educational research signals and data-driven stock analytics**. This is not financial advice.

- Immutable scan run records
- Stored factor provenance per signal (JSONB audit trail)
- Admin audit logs for all actions
- Source freshness checks
- Versioned strategy configs

Required legal pages: Disclaimer · Terms of Use · Privacy Policy · Risk Disclosure · Refund Policy

---

## License

Proprietary. All rights reserved.
