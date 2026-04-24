# Fintrest.ai — FMP Data Roadmap (2026-04-24)

> Goal: use FMP Ultimate ($139/mo) wisely. We're hitting ~15 endpoints.
> Ultimate exposes hundreds. This doc inventories what we've got, what's
> on the shelf, and the sequence for wiring the rest — ordered by
> leverage on the signal score, not convenience.
>
> Ground rules:
> - All paths are `/stable/` (FMP Ultimate). Legacy v3/v4 is dead for accounts created after 2025-08-31.
> - Doc URLs are misleading — verify a path against live API before coding.
>   See `memory/reference_fmp_endpoints.md` for the curl verification pattern.
> - Never hardcode the base URL or API key; thread through `IConfiguration`.

Sister doc: `UX_AUDIT.md` — data and UI move together.

---

## Part 1 — What we already use

| Endpoint | Powers | Cached in |
|---|---|---|
| `/income-statement?symbol=&period=quarter` | Fundamental factor (revenue + EPS growth, margins) | `fundamentals` table |
| `/ratios-ttm` | TTM ratios → Fundamentals + Valuation sub-scores | `fundamental_subscores` |
| `/key-metrics-ttm` | TTM per-share metrics (ROE, ROA, PEG) | `fundamental_subscores` + `stocks` |
| `/profile` | Company name, sector, industry, beta, market cap | `stocks` |
| `/price-target-consensus` | Analyst mean/median target | `stocks.analyst_target_price` |
| `/earnings-calendar` | Next earnings date, earnings calendar card | `stocks.next_earnings_date` + Markets UI |
| `/ipos-calendar` | IPO calendar card on Markets | Markets UI (live) |
| `/company-screener` | Screener page (universe filter) | screener UI |
| `/institutional-ownership/symbol-ownership` | Ownership strip on ticker detail | `stocks.ownership_*` |
| `/insider-trading?symbol=…` | Per-stock insider widget | live fetch |
| `/insider-trading/latest` | Insider firehose (`/insiders` page) | `market_firehose_snapshots` |
| `/grades-consensus`, `/grades`, `/price-target-summary` | Analyst card on ticker detail | live fetch (cached 30m) |
| `/senate-latest`, `/house-latest` | Congress firehose (`/congress` page) | `market_firehose_snapshots` |

**What we also use but NOT from FMP:**
- Form 4 raw XML → **SEC EDGAR directly** (Smart Money Phase 1, `EdgarClient`)
- OHLCV prices → **Polygon**
- News sentiment → **Finnhub**
- Redundant insider data is on purpose: FMP for the firehose UX, EDGAR for the Smart Money score.

---

## Part 2 — On the shelf, ranked by leverage

### Tier 1 — Strengthens core 8-factor score (do first)

| Endpoint | What it unlocks | Factor it feeds |
|---|---|---|
| **`/financial-scores`** | Altman Z-score, Piotroski F-score, Working Capital score. Institutional-grade rigor. | Fundamentals (raw sub-inputs) |
| **`/earnings-surprises`** | History of actual vs. estimate. "Beats 8 of last 10 quarters" becomes a narrative + a factor input. | Fundamentals + Lens thesis content |
| **`/grades-historical`** + **`/ratings-snapshot`** | Analyst revisions over time — upgrades/downgrades ticker-by-day. | News/Catalyst factor (momentum in sentiment, not just levels) |
| **`/short-interest`** | Short interest % of float + short-volume ratio. | Smart Money Phase 2 "short dynamics" sub-signal (currently null placeholder) |
| **`/discounted-cash-flow`** | FMP-computed DCF fair value. | Valuation card on ticker detail; screener "trading < DCF" filter |

### Tier 2 — New cards / new surfaces

| Endpoint | Powers | Where it lives |
|---|---|---|
| `/stock-peers` | Peer list per ticker | Compare Mode card on ticker detail + "similar to" suggestions |
| `/economic-calendar` | CPI, FOMC, jobs reports | Market Pulse widget + weekly newsletter macro section |
| `/treasury` | Treasury yield curve (2s, 10s, 30s) | Regime factor (inverted curve warning) + equity-risk-premium strip |
| `/dividends` | Full dividend history | Income-focused board, dividend-growth screener filter |
| `/key-executives` | C-suite + compensation | Context on insider activity ("CEO owns $40M" ≠ "$50K buy") |
| `/analyst-estimates` | Forward consensus EPS + revenue with high/low range | Fundamentals factor robustness + ticker detail expectation card |

### Tier 3 — Supporting / nice-to-have

| Endpoint | Use |
|---|---|
| `/etf-holder` | ETF constituent weights — powers thematic boards |
| `/sector-performance` | Already partially used; expand for heatmap tinting |
| `/gainers`, `/losers`, `/most-active` | Cleaner than our current sources; trivial swap |
| `/esg-score` | ESG screener filter (low demand, defer) |
| `/sec-filings` (8-K, 10-Q, 10-K index) | "Recent filings" card on ticker detail |
| `/stock-news-sentiments` | Pre-computed FMP sentiment — may dup Finnhub |

---

## Part 3 — Ranked sequence (next 3 weeks)

### Week 1 — Score quality lift (zero new UI)

Goal: strengthen existing factors with no UI churn. Free upgrade to score credibility.

1. **`/financial-scores`** wired into Fundamentals factor
   - Add `altman_z`, `piotroski_f` columns to `fundamental_subscores`
   - Nightly fetch in the existing fundamentals pipeline
   - Weight: 10% of Fundamentals factor (start small, validate)
2. **`/earnings-surprises`** history fetch
   - Store in `earnings_surprises` table (stock_id, quarter, estimate, actual, surprise_pct)
   - Feed "beats X of last N" into Fundamentals + expose to Lens thesis generator
3. **`/grades-historical`** analyst revisions time-series
   - `analyst_revisions` table (stock_id, date, firm, from_grade, to_grade, action)
   - Feed News/Catalyst factor: "3 upgrades in last 30 days" adds momentum
   - Gives the analyst card a "recent activity" tab

### Week 2 — Smart Money Phase 2 (short dynamics)

4. **`/short-interest`** — completes the Smart Money sub-card's 5th row
   - New table `short_interest` (ticker, settlement_date, short_pct_float, days_to_cover)
   - Nightly ingest (FINRA data is bi-monthly; fetch all, dedupe on settlement_date)
   - Sub-score: high short interest + rising price = "squeeze setup"; high short + falling = "conviction short"
   - Swap the `short` row in `smart-money-breakdown.tsx` from placeholder to live

### Week 3 — New cards on ticker detail

5. **`/discounted-cash-flow`** — Valuation card
   - Show DCF fair value vs. current price + implied upside/downside
   - Screener filter: "trading 20%+ below DCF"
6. **`/stock-peers`** — Compare Mode card
   - 5-7 peer tickers with composite scores side-by-side
   - Lets user see "ALLY at 68, sector median at 54" context

### Deferred (tie to later work)

- `/economic-calendar` + `/treasury` → wire into MVP-2 newsletter macro section
- `/dividends`, `/key-executives`, `/analyst-estimates` → nice-to-haves, batch as "context data release" once
- ETF / ESG / 8-K → post-launch

---

## Part 4 — Rate-limit / cost guardrails

FMP Ultimate has a **3000 requests/minute** soft limit per account.

Our current worst case is Data Ingestion running 8 endpoints × ~500 tickers ≈ 4000 requests in a batch. We already throttle to ~40 concurrent; adding 3 endpoints (financial-scores, earnings-surprises, grades-historical) takes us to ~6500 per nightly run. Still inside the minute budget when spread over the 5-minute ingestion window — but worth adding a **per-endpoint request counter** so we see which endpoints are chewing budget.

Action item (pairs with Week 1): add a `fmp_request_log` table + a 5-minute Grafana / admin view.

---

## Part 5 — What we will NOT add

- **Crypto, forex, commodities.** Out of scope — we're an equities product.
- **`/company-screener`'s advanced filters** — we've replaced it with our own screener that joins FMP data with our scores. No reason to round-trip through FMP for filtering.
- **Pre-computed FMP sentiment** (`/stock-news-sentiments`) — we already have Finnhub. Adding a second source creates inconsistency unless we aggregate, which isn't worth the effort.
- **13F filings** — FMP's coverage is patchy; Whale Wisdom is cleaner for Smart Money Phase 2 institutional sub-signal.

---

## Open questions for the user

1. **Altman Z / Piotroski F weighting** — start at 10% of Fundamentals factor or higher? (Conservative = 10%; aggressive = 25%.)
2. **Short interest frequency** — FINRA is bi-monthly; do we want daily "short volume ratio" (different metric, updates daily) as a complement?
3. **DCF display** — show FMP's DCF verbatim, or compute our own and show both?
4. **Week 3 scope** — is adding 2 visible cards (DCF + peers) compatible with the ticker-detail rearrangement planned in `UX_AUDIT.md` Tier 2? (Yes if rearrangement lands first; otherwise cards pile onto the old stack.)
