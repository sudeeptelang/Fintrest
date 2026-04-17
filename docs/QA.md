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
