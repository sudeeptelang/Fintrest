# Fintrest.ai — QA Backlog

> Running list of bugs, UI polish, and feature requests from QA on `fintrestweb.vercel.app` + localhost.
> Last updated: 2026-04-17

## Done

- [x] **Create Alert: ticker does not resolve from URL param** — [alerts/create/page.tsx](web/app/(app)/alerts/create/page.tsx) now syncs URL→state via `useEffect` and auto-resolves stock via `useStock(ticker)` so arrival at `/alerts/create?ticker=AAPL` immediately shows "AAPL — Apple Inc"
- [x] **Create alert: wrong page with error but alert *is* created** — rewrote handler as `useMutation` with `invalidateQueries(["alerts"])` + `router.push("/alerts")` on success; actual error now surfaced, submit disabled while ticker unresolved
- [x] **Portfolio holding % change** — added `DayChangePct` end-to-end: backend DTO + batched last-2-bar computation ([PortfolioController.cs](backend/Fintrest.Api/Controllers/PortfolioController.cs)); frontend dedicated `% Today` column, sortable
- [x] **Portfolio sortable** — headers were already wired but dynamic `text-${align}` Tailwind class wasn't generated → fixed to static; made headers visibly clickable (primary color when active, inline sort icon)
- [x] **Earnings calendar empty** — refactored `/market/earnings-calendar` to hit FMP's global `/earning-calendar` live (no per-stock ingestion needed); falls back to `Stock.NextEarningsDate` if FMP returns empty ([MarketController.cs](backend/Fintrest.Api/Controllers/MarketController.cs))
- [x] **Performance page "totally empty"** — now shows a "How tracking works" explainer with a `—` state on stat cards when no closed signals exist ([performance/page.tsx](web/app/(app)/performance/page.tsx))
- [x] **Header logo fix** — replaced oversized assets with optimized 192px version; ring now theme-aware (`ring-foreground/15`) so logo visible on both dark navbar and light sidebar
- [x] **Athena color scheme** — swapped navy gradient → slate-blue (`#1e293b → #334155`) matching the blue+purple theme ([athena-surface.tsx](web/components/ui/athena-surface.tsx))
- [x] **FMP Premier rate limit** — bumped 250/min → 650/min ([RateLimiter.cs](backend/Fintrest.Api/Services/Providers/RateLimiter.cs))

## New bugs (separate track — not blocking QA)

- [ ] **Scan orchestrator: `ObjectDisposedException` on NpgsqlConnector during drift scan** — signals are scored but fail to save. Symptom: `ManualResetEventSlim.Reset()` throws in `NpgsqlConnector.ResetCancellation()` during INSERT into `signals`. Likely cause: shared `DbContext` used concurrently somewhere in [ScanOrchestrator.cs](backend/Fintrest.Api/Services/Pipeline/ScanOrchestrator.cs) (`Task.WhenAll` / `Parallel.ForEach` feeding the same context). The catch block at line 244 then compounds the failure because the connector is dead. Fix approach: audit ScanOrchestrator for concurrent db usage; or create a fresh scope in the catch block to at least record the FAILED status.
- [ ] **Polygon 404 for `^VIX`** — harmless noise, VIX is optional and already falls back. Clean up the `^VIX` probe in [IntradayDriftJob.cs:96](backend/Fintrest.Api/Services/Pipeline/IntradayDriftJob.cs#L96) (Polygon uses `I:VIX`, not `^VIX`).

## In progress / needs diagnosis

- [~] **Insiders + Congress no data** — Premier plan upgraded (unlocks these endpoints per FMP docs), rate limiter bumped, empty-state messaging improved. Still empty at the user's end. Next diagnostic step: hit the FMP URL directly with the Premier key to distinguish auth vs parsing failure:
  ```powershell
  $key = "<your FMP Premier key>"
  Invoke-RestMethod "https://financialmodelingprep.com/stable/insider-trading/latest?page=0&limit=5&apikey=$key"
  ```
  - 401/403 → key isn't associated with the Premier account
  - 200 + JSON → response shape drift; parsing in `FmpProvider.cs:368-402` needs review
  - 200 + empty array → same issue, perhaps a weekend/market-closed condition

## Remaining (from user's latest screenshot)

### UI / content gaps
- [ ] **Top 5 Stocks pick cards** — prominent row of today's top 5 signals on the dashboard
- [ ] **Stock chart needs improvement** — *still needs clarification*: indicators? timeframes? candles? tooltip?
- [ ] **Portfolio holdings: more detail columns** — day % is in; user may want market value %, weight, beta, sector, etc. Needs clarification on which
- [ ] **Markets — % change** — *still needs clarification*: code already renders % in dashboard strip + Markets page; which specific cell is missing?

### Features
- [ ] **Trending lists (Robinhood-style)** — Category pills with icons (Newly Listed Crypto, Index Options, Early Dividend Stocks, Equity Options, Tradable Crypto, IPO Access, Altcoins, 100 Most Popular, Daily Movers, Cannabis, Upcoming Earnings, 24 Hour Market, Tech Media & Telecom, Technology, ETFs, Energy, Pharma, Growth & Value ETFs, Energy & Water) + Show More
- [ ] **Popular signals (Finviz-style screeners)** — pre-built screens: Unusual Volume, New High, Oversold, Breakout Setup, etc.
- [ ] **News & feed** — aggregated news on dashboard + per-ticker on stock detail

## Suggested next order

1. **Verify insiders + congress** with the PowerShell diagnostic above (5 min)
2. **Top 5 picks cards** (#1 above — quick, visible win; the data is already fetched via `useTopPicks`)
3. **News feed** (#11 — `/market/news` already exists on backend, just surface it properly)
4. **Trending lists + Finviz screeners** (feature-heavy — design first)
5. **Stock chart improvements** — after clarification

---

## 2026-04-21 — Ticker detail deep-dive mockup (v1 + v2)

User shared two mockups for the ticker detail page. Captured verbatim so
the build order is obvious later. Formal spec lives in
`docs/DESIGN_TICKER_DEEP_DIVE.md`.

### Message 1 — v1 mockup ("and there will be a — deep dive detail page")

Above-the-fold:
- Hero: `In research set` badge (replacing `BUY TODAY`) · ticker MSFT ·
  `Microsoft Corp · Signal #106 · 15–20 day horizon` · price/change ·
  market cap · composite ring `89 / 100`.
- Lens thesis card: eyebrow `LENS THESIS · EVENT-DRIVEN SETUP`,
  timestamp `Updated 6:47 AM ET`, 3–4 prose sentences, footer links
  `Full factor audit →` + caption `Research only — your decision`.
- Trade plan: eyebrow `TRADE PLAN`, right-aligned `Reward / risk
  3.2 : 1` pill, horizontal timeline **Stop · Entry · Now · Target**
  (adds a `Now` tick), three supporting bullets with glyphs (`↑` bull,
  `!` risk, `·` neutral).
- 7-factor breakdown: radar + numbered list, weighted composite top-
  right. Replaces the old FactorRadar + FactorGauges + FactorBarChart
  trio.
- Deep Dive accordion (collapsed by default), 5 rows:
  - Price chart · `1D · 5D · 3M · 1Y · volume profile`
  - Fundamentals · `Financial health strong · 3 of 5 scorecard signals
    populated`
  - Valuation & sensitivity · `Fair value $572.76 · 5-scenario multiple
    analysis`
  - Related news · `6 articles · 2 contributed to the news catalyst
    score`
  - Peer comparison · greyed `Insufficient peer data — hidden until
    populated`

Key rules:
- Hide-until-populated: greyed + disabled for rows with fewer than N
  populated fields. Never ship empty sections labelled "Neutral".
- Summary must be specific: `Financial health strong · 3 of 5 scorecard
  signals populated` beats `Fundamentals data`.
- News row counts weighted contribution so the section ties back to the
  factor breakdown.

### Message 2 — v2 mockup revision (Smart Money + regime pill)

What's new from v1:

- **Score ring grows to 8 segments** — 8th is Smart Money at 74.
  Composite drops from 89 to 87, which is honest (adding a moderate
  factor to a strong signal should move the needle slightly down, not
  up). Radar picks up a `Smart $` axis in the same position.
- **Lens thesis rewrites** to weave in the new data — insider buying
  with dollar amounts and the CFO's relative history, the Tiger Global
  13F, and unusual call activity. Demonstrates what Lens should sound
  like once the new APIs are plumbed in. It reads more like a sell-
  side note because it has more to say — which is the whole point of
  adding these data sources.
- **Smart Money breakdown card** is the genuinely new piece. Indented
  with a left-border accent so it reads as a drill-down of the 8th
  factor, not a parallel card. Each sub-component shows: weight, score,
  horizontal strength bar, a one-sentence evidence line that names the
  specific detail (CFO's largest purchase since 2023, Tiger Global
  $180M, Nov 22 call volume 4.1x average), and the data source with its
  staleness window. That staleness line is the credibility lever
  mentioned earlier — `Source: SEC EDGAR Form 4 · 1–2 day disclosure
  lag` tells a sophisticated user you know exactly where the data comes
  from and how fresh it is. Most competitors hide this.
- **Top nav `Risk-on regime · VIX 14.2` pill** — tiny addition, big
  story. Signals to users (and investors) that regime-gating isn't just
  a marketing claim, it's visible. Sourced from FRED + Cboe in the
  Deep Dive macro row.
- **Deep Dive rail grows from 5 → 7 rows**, with the new ones being
  `Options flow detail` (Unusual Whales deep dive) and
  `Macro & regime context` (FRED + Cboe). Related news picks up source
  tags — Benzinga · EDGAR 8-K · Yahoo — so users see which feeds
  contributed. Fundamentals row keeps its honest `3 of 5 scorecard
  signals populated` disclosure. Peer comparison stays grayed because
  it's still empty; we don't pretend.

Smart Money sub-rows (in weight order):
- **Insider activity** 35% · 88 · `CFO and 2 directors bought $4.2M in
  last 30 days. CFO's largest purchase since joining 2023. No 10b5-1
  disposals.` · SEC EDGAR Form 4 · 1–2 day disclosure lag
- **Institutional flow** 25% · 76 · `Institutional ownership +3.1%
  QoQ. Tiger Global initiated $180M new position. 14 tracked funds
  added; 3 trimmed.` · SEC 13F via Whale Wisdom · 45-day reporting lag
- **Options positioning** 15% · 81 · `Unusual call volume on Nov 22
  expiry — 4.1x 30-day average, ask-weighted. Put/call 0.42 vs. 0.68
  sector median.` · Unusual Whales + Cboe · real-time
- **Congressional** 15% · 42 · `No material trades this quarter.
  2 immaterial disclosures (<$15K). Score weighted by each member's
  90-day forward accuracy.` · Quiver Quantitative · up to 45-day STOCK
  Act lag
- **Short dynamics** 10% · 55 · `Short interest −8% WoW while price
  rising — conviction unwind, not squeeze setup. Days-to-cover 1.4,
  low pressure.` · FINRA bi-monthly + Fintel · 1–2 week lag

### Build-order implication (mirror of SIGNALS_V3.md §14.9)

- **Phase 1** is EDGAR Form 4 parsing (free, highest-value sub-
  component at 35% weight). Ship the Insider Activity row of Smart
  Money with just this and Postgres — no paid APIs. That alone is a
  visible differentiator from the current state.
- **Phase 2** adds Quiver Quantitative (~$50–100/mo) for Congressional
  + 13F parsing. Smart Money has four of five inputs.
- **Phase 3** is Unusual Whales for options flow (several $100/mo).
  Delay until Pro revenue justifies it.
- The **Deep Dive macro row** can ship immediately — FRED is free and
  the regime classifier (risk-on / neutral / risk-off) is a few rules
  on 10Y yield, VIX, and DXY.
