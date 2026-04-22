# Fintrest India — Minimal Launch Plan

**Status:** Exploratory / post-US-MVP
**Question asked (2026-04-22):** "Do we have data for India NSE / BSE / Sensex — can we release in India too?"
**Short answer:** Yes, a minimal India product is feasible with $0–100/mo incremental data cost by leaning on public and free-tier Indian sources. But it is **not** the same product as the US version — less real-time, no insider/congressional overlays, weaker fundamentals coverage, different compliance framing. Treat it as a **research + scorecard lite** offering for Indian retail, not a full port.

---

## What we can represent *today* with free + near-free India data

The goal is a minimal viable India product: **one screen per ticker** with price, basic fundamentals, a simplified score, and a factor breakdown. Shipped end-of-day (EOD), not real-time.

### Free / near-free Indian data sources

| Source | What it gives | Cost | Caveats |
|---|---|---|---|
| **NSE bhavcopy** (public CSV) | Daily OHLCV + 52w H/L + volume for every listed stock. Updated EOD. | **Free** | Not real-time. Zip download per trading day. |
| **BSE bhavcopy** | Same for BSE listings (many overlap NSE). | **Free** | Same EOD pattern. |
| **NSE indices** (public) | Nifty 50, Nifty Bank, Nifty IT, Nifty Auto, etc. | **Free** (historical CSV) | Index-level only; no constituent weights without paid feed. |
| **BSE Sensex** (public) | Sensex OHLCV + daily change. | **Free** | Same EOD pattern. |
| **Yahoo Finance India** (unofficial scrape) | Price + basic fundamentals + news headlines per ticker. | **Free** | Terms-of-service risk — OK for internal dev + small scale. |
| **MoneyControl public pages** | Richer news per ticker + broker recommendations (aggregated consensus). | **Free** | Scraping; rate-limit carefully. |
| **screener.in public API** | ~20 fundamental ratios + 5y financials for NSE listed names. | **Free** (rate-limited) or **₹3,900/mo** paid tier | The paid tier is usable and much better for backfills. |
| **SEBI public disclosures** | Insider trades (Reg 7/29), shareholding pattern changes. Published quarterly + event-based. | **Free** | HTML tables + PDFs — parsing is work but doable. |
| **NSE option chain** (public) | Live-ish option chain during market hours (15-min delayed via their public page). | **Free** | Scraping; no SLA. OK for EOD snapshot of PCR / OI concentration. |
| **RBI + FRED** | Repo rate, CPI, IIP, INR/USD, 10Y G-Sec. | **Free** | Macro regime inputs. |

### What this adds up to

Everything you need for a **minimal scorecard + signal product** at effectively $0 incremental data cost, accepting EOD cadence. If you want to go paid for quality:

- **Screener.in paid** (₹3,900/mo ≈ $47) — cleans up the fundamentals layer significantly. Probably the single best money spent.
- **TrueData or GDFL** feeds (~₹10,000–25,000/mo) — real-time quotes if that becomes a requirement. **Not needed for MVP.**

---

## Minimal India product — scope

Three screens. Match the US product's IA but with dialed-back content:

### 1. Today (India)
- Nifty 50 + Sensex banner with daily change + 30-day chart
- Top 10 movers (up/down) from NSE bhavcopy
- Sector heatmap using NSE sectoral indices (Bank, IT, Auto, Pharma, Energy, FMCG, Metal, Realty)
- "Today's research set" — 10–15 tickers selected by scoring engine
- **No** insider / congressional / options flow overlays in v1

### 2. Ticker detail (India)
- Price + change + 52w range + market cap (in ₹ crore, not $)
- **Simplified 5-factor score** (not 7/8):
  - Momentum (1M / 3M price change vs Nifty 500)
  - Trend (above/below 20/50/200 DMA)
  - Fundamentals (PE / PB / ROE / debt-to-equity vs sector median)
  - Relative volume (vs 20-day avg)
  - Quality (profitability consistency, leverage trend)
- Lens thesis paragraph (2–3 sentences, on-demand generation — same cost discipline as US)
- Reference levels (entry / stop / target) if the setup qualifies
- EOD-only disclosure prominent: "Prices update after market close"
- **Deferred:** News (MoneyControl scrape is fragile), Analyst consensus (thin), Options positioning, Insider, Institutional flow

### 3. Audit log (India)
- Every signal Fintrest India has ever published + its outcome. Same treatment as US — this is the credibility lever.

### What's explicitly NOT in v1

- Real-time prices (adds data cost, doesn't change the research product meaningfully)
- Congressional trades equivalent (would need to build SEBI-disclosure parsing; OK to defer)
- Options flow (no affordable provider)
- Personalized Lens / Ask Lens (cost exposure + unclear regulatory standing in India)
- Portfolio import (different broker CSV formats; defer to v2)
- Alerts (can be added later via email; push needs FCM)

---

## Compliance — SEBI is not the SEC

This is the part that determines whether India is shippable or not. Brief version of the legal read; a local lawyer **must** sign off before launch.

### The two SEBI regimes that touch us

1. **Research Analyst (RA) regulations, 2014.**
   - Covers anyone who *publishes research reports on securities*.
   - Registration required: net worth ₹1–25 lakh depending on scale, NISM-XV exam, SEBI application.
   - Independent of whether money changes hands for advice — publishing public research on specific tickers is RA activity.

2. **Investment Adviser (IA) regulations, 2013.**
   - Personalized recommendations. Not our product, and we avoid it the same way we avoid RIA status in the US.

### What this means for our framing

The US "educational publisher" (Motley Fool / Zacks) model **does not cleanly transfer**. SEBI has been actively enforcing against unregistered research publishers since 2023. Realistic options:

**Option A — Register as a SEBI Research Analyst.** Preferred if India becomes strategic. Cost: ~₹1 lakh net worth proof + NISM-XV + SEBI fee. Time: 6–10 weeks. Unlocks the ability to legitimately publish ticker-specific research in India.

**Option B — Reposition as "market data + analytics, not research."** Products that publish *scores + factor breakdowns* without explicit buy/watch/avoid labels are arguably market-data products, not research. We would drop:
- The "BUY TODAY / WATCH / AVOID" framing (already in motion for US per research-set badge work)
- Any language that reads as a recommendation
- Per-signal "Lens thesis" conclusions

And keep:
- Factor scores + breakdowns
- Reference levels labelled as technical levels, not trade recommendations
- Audit log of historical setups (framed as "scored in top decile on date X" not "we said buy")

**Option C — White-label via an existing Indian RA.** Find a registered Indian RA, license Fintrest's engine to them, they publish under their registration. We take a rev share. Fastest to market, lowest compliance risk, worst economics.

**My read:** Option B is the cheapest path to a shippable product. It constrains the pitch but the scoring engine + audit log story is still differentiated. Get legal sign-off on the framing *before* writing a single India-specific line of code.

---

## Tech work

The scoring engine (v3 feature store) ports over cleanly — features are ticker-agnostic math on OHLCV + fundamentals. The pieces that need replacement:

| Layer | Change |
|---|---|
| Data ingestion | New `IndiaBhavcopyIngestJob` pulling NSE + BSE EOD CSVs; new `ScreenerIndiaIngestJob` for fundamentals; defer news/insider ingestion. |
| Ticker model | Add exchange suffix (`RELIANCE.NS`, `RELIANCE.BO`) or second `Stock` partition keyed by country. |
| Currency | Number formatting helper: `formatInr(x)` returns lakhs/crores. |
| Indices | Nifty 50 + Sensex + sector indices as first-class regime inputs. |
| Earnings calendar | Different FY (Apr-Mar); Indian companies file quarterly + annual; pull from NSE `corpAnnouncement` feed. |
| Time zones | All app times in IST instead of ET. Scan job runs 6 AM IST, not 6 AM ET. |
| Payment | RazorPay alongside Stripe (Stripe works in India but RazorPay fees are lower + UPI is expected). |
| Branding | Likely separate subdomain `fintrest.in` with its own marketing copy. Same design system. |

Engineering estimate from "US MVP shipped" to "India MVP shipped" with Option B framing: **4–6 weeks**. Most of that is data ingestion + compliance-driven copy changes, not product build.

---

## Cost model (India-only)

| Line item | Monthly |
|---|---|
| NSE/BSE bhavcopy, SEBI, RBI, NSE indices (all free public) | $0 |
| screener.in paid tier (optional but recommended) | ~$47 |
| Hosting (separate `fintrest.in` frontend on Vercel) | ~$0 (free tier) |
| Additional Supabase storage | ~$25 |
| Email (ACS) — separate sender domain | minimal |
| **Total incremental** | **~$75/mo** |

That fits inside the existing budget envelope. Real-time data (optional v2) would jump this to $200–400/mo.

### Pricing localization

US plans: Free / Pro $29 / Elite $45. India ₹ plan recommended:
- **Free** — Today + 5 ticker detail views/day
- **Pro** — ₹599/mo (~$7.20) — everything
- **Elite** — ₹999/mo (~$12) — portfolio features when they ship

Indian retail is price-sensitive relative to US; ₹599/mo is a typical "premium app" price point and comparable to Ticker­tape Pro / MoneyControl Pro positioning.

---

## Recommended phasing

**Phase 1 — Don't ship India. Ship US MVP first.** (Current Path A, ~2 weeks.)

**Phase 2 — India feasibility validation.** (1–2 weeks after US launch)
- Engage an Indian lawyer on Option B framing.
- Prototype the bhavcopy ingestion job against 5 tickers end-to-end.
- Validate screener.in API coverage on 50 large-cap Nifty names.

**Phase 3 — India MVP build.** (4–6 weeks)
- Separate `fintrest.in` frontend, shared backend scoring engine.
- EOD-only data pipeline.
- Compliance-scrubbed copy throughout.
- RazorPay integration.

**Phase 4 — India soft launch.** (2 weeks)
- 100-user waitlist release.
- Measure engagement + signal credibility.
- Legal re-review before going public.

Total elapsed from "US revenue flowing" to "India MVP in market": **~3 months**. Call it **Q3 2026** if US ships in early May.

---

## What we decide now (so it's captured)

1. **India is a post-US-MVP track.** Do not spread MVP scope to two markets.
2. **Minimum-viable India is EOD-only with a simplified 5-factor score.** Full real-time + insider/options parity is not the goal for v1.
3. **Compliance framing is Option B (market-data/analytics, not research)** unless product-market fit justifies the cost of SEBI RA registration later.
4. **Incremental monthly data cost target: ≤ $100.** The free bhavcopy + public indices + optional screener paid tier fits inside that.
5. **Separate brand surface (`fintrest.in`), shared scoring engine.** Don't fork the codebase; share the v3 feature store, ship market-specific ingestion + UI shells on top.

---

## Open questions (to resolve before Phase 3 build)

- [ ] Do we register as SEBI RA (Option A) or reposition as market-data (Option B)? — needs lawyer.
- [ ] Is the Indian user willing to pay ₹599/mo for EOD research, or does that price require real-time?
- [ ] How many tickers in the India universe? (Options: Nifty 50, Nifty 100, Nifty 500, or full NSE ~2,000. Universe size drives data ingestion cost.)
- [ ] Is Fintrest India a second SKU under the parent brand, or a new brand with "Powered by Fintrest"?

---

**Referenced:** `docs/MVP_PUNCHLIST.md` (current US roadmap), `docs/SMART_MONEY_BUILD_SPEC.md` (budget discipline lines apply equally to India).
