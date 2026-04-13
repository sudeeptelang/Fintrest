# Fintrest.ai — Product Spec

## Positioning Statement

**fintrest.ai is an AI-powered investing intelligence platform that explains why a stock move is happening and what to do next — like a personal AI trader.**

We are NOT a signal app. We are NOT a trading app. We are a **Decision Intelligence Platform for Retail Investors**.

---

## Strategic Identity

| We are NOT | We ARE |
|---|---|
| A pure signal app | An AI explanation engine |
| A TradingView clone | A simpler, AI-first UX |
| A Telegram signal channel | A premium SaaS platform |
| A charting tool | A decision support system |

### One-line pitch
> "The only app that explains why a stock is moving and what to do next."

### What users actually pay for
Users don't pay for signals. They pay for **confidence**, **clarity**, **reduced risk**, and **feeling informed and in control**. Every feature must serve one of these.

---

## Core Differentiation Pillars

### 1. Explainable Signals (Primary Advantage)
Every signal includes WHY — technical indicators, sentiment, options flow, confidence score. Most apps give "BUY NVDA" with zero context. We give the reasoning, building trust that converts to subscriptions.

### 2. AI Copilot — Athena (Conversational Investing)
Users ask natural-language questions: "Should I buy TSLA today?" Athena responds with trend direction, risk level, entry/exit, alternatives. No major app does this well yet. Creates addictive daily usage.

### 3. Personalized Intelligence Engine
Signals adapt based on risk tolerance, trading style (day/swing/long-term), and portfolio composition. Dramatically reduces churn vs generic "same signals for everyone" apps.

### 4. Smart Money Tracking (Premium Value Driver)
Surface institutional activity: options flow, insider trades, hedge fund moves. Package simply: "Big money is buying this today." This is the #1 driver for $49-$99 tier conversions.

### 5. Trust & Transparency Layer
Display historical win rate, signal performance tracking, confidence levels, risk categorization. Users don't just see signals — they see the track record. This is where most competitors fail.

---

## Competitive Landscape

### Tier 1 — Mass Market Platforms (Biggest Revenue)

| Platform | Revenue | Users | Strength | Weakness | Our Opportunity |
|---|---|---|---|---|---|
| **TradingView** | $100M+/yr | 50M+ | Charts + community + signals as feature | Complex UI, not AI-first | Simpler AI-first UX |
| **Robinhood** | $1B+/yr | 20M+ | Trading + UX | No deep insights | Add intelligence layer |
| **Webull** | High | 10M+ | Technical indicators + community | Cluttered | Cleaner signal experience |
| **Yahoo Finance** | High (ads) | Millions | News + watchlist | No actionable signals | Explainable signals |

### Tier 2 — Pro Signal Platforms (High Revenue Per User)

| Platform | Price | Strength | Weakness | Our Opportunity |
|---|---|---|---|---|
| **Benzinga Pro** | $100-300/mo | Real-time news + momentum | Expensive, no AI copilot | AI explanation at lower price |
| **Trade Ideas** | $1,000+/yr | Holly AI automated signals | Complex, expensive | Simpler, more accessible |
| **Stock Market Guides** | $49-69/mo | Backtested returns | Limited personalization | Adaptive signals |
| **Mindful Trader** | $47/mo | Swing trading focus | No AI, no explanation | Full AI layer |

### Tier 3 — Pure Signal Apps (Our Direct Competitors)

| Platform | Users | Model | Why We Win |
|---|---|---|---|
| **Stock Alarm** | 295K+ | Freemium alerts | No explanation, no AI |
| **ProTicker Signals** | Growing | Subscription signals | No personalization |
| **Stocks Signals** | Growing | AI scanning | No copilot, weak UX |

### Competitive Comparison Matrix

| Capability | Typical Signal Apps | TradingView | Benzinga | **fintrest.ai** |
|---|---|---|---|---|
| Signals | Yes | Yes | Yes | **Yes** |
| Explanation (WHY) | No | No | Partial | **Yes** |
| AI Copilot | No | No | No | **Yes** |
| Personalization | No | No | No | **Yes** |
| Smart Money Insights | No | Limited | Yes | **Yes** |
| Performance Tracking | No | No | No | **Yes** |
| Factor Scoring (0-100) | No | No | No | **Yes** |

### Revenue Model Comparison

| Type | Avg Revenue/User | Scale Potential |
|---|---|---|
| Pure signal app | $20-200/month | Limited |
| Trading platform + signals | $100-1,000+/user/year | Massive |
| AI signal SaaS (us) | $50-300/month | Growing fast |

---

## Critical Risks (Avoid at All Costs)

| Risk | Impact | Mitigation |
|---|---|---|
| Signal-only approach | High churn, low trust | Explanation layer + trust metrics |
| No differentiation | Lost in saturated market | AI copilot + personalization |
| Lack of trust metrics | Low conversion | Win rate tracking, confidence scores |
| Poor UX | Low retention | Premium editorial design (warm palette, Satoshi font) |
| Bad signals | Reputation death | R:R >= 1.5 filter, compliance footer, "educational content" framing |

---

## Screen Inventory (22 Screens)

Design reference: `docs/fintrest_screens_v2_final.html` (open in browser)

| # | Screen | Route | Plan Gate |
|---|--------|-------|-----------|
| 01 | Splash | `/` | Public |
| 02 | Sign Up | `/signup` | Public |
| 03 | Dashboard | `/dashboard` | Free |
| 04 | Signals List | `/picks` | Free (2/day) |
| 05 | Signal Detail | `/stock/[ticker]` | Starter+ |
| 06 | Ask Athena | `/athena` | Starter+ |
| 07 | Portfolio Overview | `/portfolio` | Pro+ |
| 08 | Holding Detail | `/portfolio/[id]` | Pro+ |
| 09 | Add Holding | `/portfolio/add` | Pro+ |
| 10 | Performance Chart | `/performance` | Pro+ |
| 11 | Rebalancing AI | `/portfolio/rebalance` | Pro+ |
| 12 | Import Portfolio | `/portfolio/upload` | Pro+ |
| 13 | Watchlist | `/watchlist` | Starter+ |
| 14 | Alerts | `/alerts` | Starter+ |
| 15 | Create Alert | `/alerts/create` | Starter+ |
| 16 | Markets | `/markets` | Free |
| 17 | Notifications | `/notifications` | Free |
| 18 | Pricing | `/pricing` | Public |
| 19 | Profile & Settings | `/settings` | Free |
| 20 | Weekly Summary | `/summary` | Starter+ |
| 21 | Signal Score Breakdown | `/stock/[ticker]/score` | Starter+ |
| 22 | Candlestick Chart | `/stock/[ticker]/chart` | Starter+ |

### Dashboard Sections (Screen 03)

| Section | Data Source | Description |
|---|---|---|
| Index Strip | `/market/indices` (SPY/QQQ/DIA/IWM) | Live index prices + day change |
| Athena's Signals | `/picks/top-today` (top 5) | Navy gradient card, premium feel |
| Trending | `/market/trending` (top 8 by change %) | Top movers with color-coded change |
| Most Active | `/market/most-active` (top 8 by volume) | Highest volume with rel-volume |
| Earnings Calendar | `/market/earnings-calendar` (14 days) | Upcoming earnings with dates |
| In Case You Missed | `/picks/top-today` (signals 6-12) | Discovery section for engagement |

### Stock Detail Page Sections (Screen 05)

| Section | Data Source | Description |
|---|---|---|
| Hero Header | Signal + Stock | Ticker, price, signal badge, watchlist/alert buttons |
| Score Ring + Radar | Signal breakdown | Tap → full score breakdown (screen 21) |
| Trade Zone | Signal levels | Entry/target/stop as a unit (non-negotiable) |
| Finviz Snapshot | `/stocks/{ticker}/snapshot` | 5-column grid: Valuation, Margins, Performance, Quote, Technicals |
| Price Chart | `/stocks/{ticker}/chart` | Line chart with MA overlays, link to full chart (screen 22) |
| Factor Gauges | Signal breakdown | 7 individual arc gauges (Prospero.ai style) |
| AI Analysis | Signal explanation | Bullish/bearish factors, trade zone narrative |
| Recent News | `/stocks/{ticker}/news` | Sentiment-colored headlines with catalyst badges |

---

## Subscription Plans

| Feature | Free | Starter $19/mo | Pro $49/mo | Elite $99/mo |
|---------|------|----------------|------------|--------------|
| Signals/day | 2 | 12 | All | All |
| Full AI explanations | No | No | Yes | Yes |
| Score breakdown | No | Yes | Yes | Yes |
| Alerts | No | Email 9AM | Email 6:30AM | Email + SMS |
| Watchlist | No | Yes | Yes | Yes |
| Portfolio tracking | No | No | Yes | Yes |
| Athena chat | No | 50/day | Unlimited | Unlimited |
| Portfolio AI | No | No | Yes | Yes |
| Rebalancing AI | No | No | Yes | Yes |
| Smart Money | No | No | Yes | Yes |
| Backtesting | No | No | No | Yes |
| Broker import | No | No | Yes | Yes |
| Personalized signals | No | No | No | Yes |

Annual discount: 20% off all paid plans.

---

## Build Roadmap

### Phase 1 — MVP (Weeks 1-4) ✅ COMPLETE
- Auth (Supabase), DB schema, market data service (Polygon), signals table seed
- Dashboard page with Trending/Most Active/Earnings Calendar/Athena Signals sections
- Signals list + detail pages with Finviz-style snapshot + sortable columns
- Score breakdown (screen 21) + Candlestick chart (screen 22)
- Athena chat (Agent D), watchlist, alert creation
- Heatmap + Markets pages wired to real sector/index data
- S&P 500 universe (468 stocks), parallel ingestion, 7-factor scoring engine
- FMP paid integration (Beta, Forward P/E, PEG, ROE/ROA, analyst targets)

**Phase 1 ships screens:** 01-06, 13-19, 21, 22

### Phase 2 — Portfolio (Weeks 5-8) ✅ MOSTLY COMPLETE
- Portfolio overview, holding detail, add/edit/delete holdings
- Performance chart, Rebalancing AI, Portfolio import (CSV + text)
- All portfolio pages wired with sortable holdings table

**Phase 2 ships screens:** 07-12

### Phase 3 — Growth & Differentiation (Weeks 9-16)
- Email alerts (SES), SMS alerts (Twilio)
- Stripe billing integration
- Analyst consensus widget + technical analysis panel on stock detail
- Peer comparison table
- Insider activity indicator
- Earnings history (beat/miss streak)
- SEO signal pages
- Mobile app (Flutter) wired to backend
- Deploy to Vercel + production hardening

**Phase 3 ships:** Screen 20 + SEO pages + mobile

### Phase 4 — Moat Features (Weeks 17+)
- Personalization engine (signals adapt to user style/risk)
- Smart money tracking (options flow, insider trades, whale moves)
- Community with verified traders + leaderboard
- Backtesting engine
- Weekly summary emails with AI commentary
- Auto-trading API integrations (broker connect)

---

## SEO Signal Pages

| Path | Revalidate | Target query |
|------|------------|--------------|
| `/stock/[ticker]` | 3600s | "is NVDA a buy today 2026" |
| `/stock/[ticker]/analysis` | 86400s | "NVDA stock analysis" |
| `/signals/sector/[sector]` | 3600s | "best tech stocks to buy" |
| `/signals/weekly-picks` | 604800s | "best stocks to buy this week" |
| `/markets/[index]` | 900s | "S&P 500 today" |

All SEO pages include JSON-LD `FinancialProduct` structured data, OG + Twitter cards, canonical URL, compliance footer.

---

## Data Infrastructure (Current State)

| Component | Provider | Tier | Cost |
|---|---|---|---|
| Market Data (OHLCV) | Polygon.io | Starter ($29/mo) | Unlimited calls, 5yr history |
| Fundamentals | FMP | Starter ($29/mo) | 300/min, ratios + profile + earnings |
| News + Sentiment | Finnhub | Free | 60/min, company news + analyst ratings |
| AI (Athena) | Anthropic | Pay-per-token | Claude Sonnet 4 |
| Database | Supabase | Free | PostgreSQL, 24 tables |
| Auth | Supabase Auth | Free | JWT tokens |
| Hosting | Vercel | Free (dev) | Next.js deployment |

**Universe:** 468 S&P 500 stocks, ingested daily. Scanning produces ~20 actionable signals per run with valid entry/target/stop levels and R:R >= 1.5.
