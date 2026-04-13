# Fintrest.ai — Product Spec

## Screen Inventory (22 Screens)

Design reference: `docs/fintrest_screens_v2_final.html` (open in browser)

| # | Screen | Route | Plan Gate |
|---|--------|-------|-----------|
| 01 | Splash | `/` | Public |
| 02 | Sign Up | `/signup` | Public |
| 03 | Dashboard | `/dashboard` | Free |
| 04 | Signals List | `/signals` | Free (2/day) |
| 05 | Signal Detail | `/stock/[ticker]` | Starter+ |
| 06 | Ask Athena | `/athena` | Starter+ |
| 07 | Portfolio Overview | `/portfolio` | Pro+ |
| 08 | Holding Detail | `/portfolio/[ticker]` | Pro+ |
| 09 | Add Holding | `/portfolio/add` | Pro+ |
| 10 | Performance Chart | `/portfolio/performance` | Pro+ |
| 11 | Rebalancing AI | `/portfolio/rebalance` | Pro+ |
| 12 | Import Portfolio | `/portfolio/import` | Pro+ |
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
| Backtesting | No | No | No | Yes |
| Broker import | No | No | Yes | Yes |

Annual discount: 20% off all paid plans.

## Build Roadmap

### Phase 1 — MVP (Weeks 1-4)
- **Week 1:** Auth (Supabase), DB schema, market data service (Polygon), signals table seed
- **Week 2:** Dashboard page, Signals list + detail pages, score breakdown
- **Week 3:** Athena chat (Agent D), watchlist, alert creation
- **Week 4:** Email alerts (SES), pricing page, Stripe integration, deploy to Vercel

**Phase 1 ships screens:** 01-06, 13-19, 21, 22

### Phase 2 — Portfolio (Weeks 5-8)
- Portfolio overview, holding detail, add/edit/delete holdings
- Performance chart, Rebalancing AI, Portfolio import (CSV + OAuth brokers)

**Phase 2 ships screens:** 07-12

### Phase 3 — Growth (Weeks 9-12)
- Weekly summary emails, SMS alerts (Twilio), Backtesting engine
- SEO signal pages, Mobile PWA, Admin dashboard

**Phase 3 ships screen:** 20 + SEO pages

## SEO Signal Pages

| Path | Revalidate | Target query |
|------|------------|--------------|
| `/signals/[ticker]` | 3600s | "is NVDA a buy today 2026" |
| `/signals/[ticker]/analysis` | 86400s | "NVDA stock analysis" |
| `/signals/sector/[sector]` | 3600s | "best tech stocks to buy" |
| `/signals/weekly-picks` | 604800s | "best stocks to buy this week" |
| `/markets/[index]` | 900s | "S&P 500 today" |

All SEO pages include JSON-LD `FinancialProduct` structured data, OG + Twitter cards, canonical URL, compliance footer.
