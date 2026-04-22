# Fintrest.ai — Complete UX & Build Reference

**Version:** 1.0 · **Owner:** DSYS Inc. · **Status:** Canonical reference
**Received:** 2026-04-22 · **Source:** `fintrest_ux_spec.html` (attached by user)

This is the canonical reference for design, engineering, and writing. It
supersedes earlier docs (DESIGN_TICKER_DEEP_DIVE.md, MVP_PUNCHLIST.md,
SMART_MONEY_BUILD_SPEC.md) where they conflict. A searchable HTML
preview version is also stored at `docs/fintrest_ux_spec.html` when available.

---

## 01. Positioning & guardrails

Fintrest publishes **research, not recommendations** — not a tagline,
the legal posture that keeps the product inside the publisher's exemption
and out of Investment Adviser Act territory.

**Hard UX rules** (true on every screen, narration, push, email, share):

- The literal word **BUY** never appears as a directive next to a ticker.
  Badges: `In research set`, `Passed`, `High score`, `Setup active`.
- Words **sell, buy this, recommend, you should, go long, go short** never
  appear in Lens output. Lens describes; it does not direct.
- Every signal displays source + staleness where lag matters
  (`SEC EDGAR · 2d ago`, `FINRA · 9d old`, `Quiver · up to 45d STOCK Act lag`).
- Backtest numbers and live numbers are never blended in the same stat.
- Every page with analyst targets, historical signal outcomes, or backtest
  stats carries the standard disclaimer footer.
- Audit log is public, includes losers, always one tap/click away. Never
  hidden, collapsed, or paywalled.
- Fake testimonials are forbidden.

**Regulatory-sensitive surfaces** (legal review required pre-launch):
Lens Personalized (Elite), Ask Lens chat, alert templates. Consider
reframing "Lens Personalized — tuned to your holdings" as "Lens applied
to holdings" (removes the word "tuned" which is adviser-adjacent).

---

## 02. Information architecture — FINAL

### Four-pillar model

| Pillar | Question | Sub-sections |
|---|---|---|
| **Markets** | What's the market doing right now? | Overview · Screeners · Sectors · Regime · Earnings |
| **Research** | What should I look at today? | Today's drop · Smart money · Screener |
| **My stuff** | What am I tracking? | Portfolio · Watchlist · Boards |
| **Audit log** | Did the engine work? | All · Wins · Losses · Open · By type |

### Consolidation decisions — what merged into what

| Old item | New home | Why |
|---|---|---|
| Today | Research → Today's drop (default) | Three landing metaphors → one |
| Boards | My stuff → Boards | Personal clusters with Portfolio + Watchlist |
| Insiders, Congress | Research → Smart money → tabs | One factor hub |
| Alerts, Notifications | Inbox (bell icon) | One inbox, filter chips inside |
| Upload | Settings → Portfolio import | Once-a-quarter action |
| Settings, Log out | Profile avatar (top-right) | Standard pattern |

### Mobile tab bar

`Markets · Research · My stuff · Audit` — 4 tabs, no fifth. Inbox is a
header icon, not a tab. Profile is a header avatar, not a tab.

### Web sidebar

200px fixed-width sidebar: brand mark → 4 primary items → optional
sub-items (revealed when parent is active) → divider → Support section
(Methodology, Help, Settings). Top bar global: breadcrumb left, search +
help + inbox + avatar right.

---

## 03. Design system

### Color tokens (light + dark)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--fin-accent` | `#0F6E56` | `#9FE1CB` | Brand, positive outcomes, primary action |
| `--fin-accent-bg` | `rgba(15,110,86,0.07)` | `rgba(159,225,203,0.08)` | Accent card backgrounds |
| `--fin-accent-border` | `rgba(15,110,86,0.25)` | `rgba(159,225,203,0.25)` | Accent card borders |
| `--fin-warn` | `#BA7517` | `#EF9F27` | Caution, middling scores (50–70), flags |
| `--fin-danger` | `#A32D2D` | `#F09595` | Negative outcomes, losses, stopped-out signals |
| `--fin-info` | `#185FA5` | `#85B7EB` | Neutral info states |

**Score color rule:** 0–49 red, 50–69 amber, 70+ green. Product convention.

> **NOTE**: new accent `#0F6E56` differs from v2 Forest `#0F4F3A`. Needs
> a migration pass across `globals.css` + all primitives.

### Typography

- **Lens thesis + editorial copy** uses serif (Georgia / Iowan / Palatino
  fallback). This is the one place serif appears — it signals "research
  analyst voice," not UI chrome.
- **Everything else** uses system sans (SF Pro / Segoe UI).
- **Numbers** in tables and stat cards use tabular numerals:
  `font-variant-numeric: tabular-nums`.
- **Two weights only**: 400 regular, 500–600 medium. Never 700 bold.

### Spacing & corners

- Border radius: 6px inputs, 8px cards, 12px containers, 20px phone
  mockups, 999px pills.
- Borders: 0.5px tertiary (default), 1px primary, 2px accent only for
  "selected" or "featured."
- Shadows: none. Elevation via border + background contrast.

### Score ring — the signature

8-segment score ring is Fintrest's visual signature. Segments in order:
Momentum · Rel volume · News catalyst · Earnings · Sentiment · Trend ·
Risk · Smart money. Segment fill length = score 0–100.

---

## 04. Content voice — Lens

Rules:
- **Specific over generic.** "The CFO's $2.4M purchase — her largest since
  joining in 2023" beats "insiders are buying."
- **Named over anonymous.** "Tiger Global initiated a $180M position"
  beats "a major hedge fund."
- **Numbers with context.** "Call volume 4.1x the 30-day average" beats
  "unusual options activity."
- **Describe, don't direct.**
- **Admit uncertainty.** "13F reports with 45-day lag, so this may have
  changed."
- **One sentence of context per data point max.** No editorializing.

### Tone anchor

> MSFT breaks out on 94th-percentile news catalyst activity alongside
> real insider accumulation — CFO and two directors bought a combined
> $4.2M in open-market shares in the last 30 days, the CFO's largest
> purchase since joining in 2023. Tiger Global initiated a $180M position
> in the latest 13F. Unusual call buying on the Nov 22 expiry (4.1x
> average, ask-weighted) confirms institutional positioning.

---

## 05. Markets — landing destination

Tab 1. Answers "what is the market doing right now?" in one scroll.

- **Regime hero** — 5 cards: Risk-on/off/transition classification, VIX,
  10Y yield, HY spread, DXY. Classifier from FRED + Cboe, nightly.
- **Indices** — S&P 500, Nasdaq 100, Russell 2000, Dow. Real-time via
  Polygon.
- **Market breadth** — % of S&P 500 above 50d MA, above 200d MA, new
  52w highs, new 52w lows.
- **Sector heatmap** — 11 GICS sectors, equal-sized, colored by perf.
  Click → drill-down.
- **Screeners (6 cards, 2×3)** — Top gainers, Top losers, Most active,
  52w highs, 52w lows, Unusual volume. Top 5 each; "See all" opens full.
- **Earnings this week** — 5-column week view, today highlighted, BMO/AMC
  indicators.

---

## 06. Research — today's drop

Research is tab 2. Default sub-tab "Today's drop" — published 6:47 AM ET
every trading day. Lists every signal that passed the 8-factor bar with
composite score, horizon, one-line Lens why-now, and factor bar.

---

## 07. Smart money hub

Both the 8th factor on every ticker page **and** a standalone destination
under Research. Tabs: Overview · Insiders · Congress · 13F · Options ·
Shorts.

Weights: Insiders 35% · Institutional 25% · Congress 15% · Options 15% ·
Shorts 10%.

Source/staleness on every row:
- Insiders: SEC EDGAR Form 4 · 1–2d lag
- Institutional: SEC 13F via Whale Wisdom · 45d reporting lag
- Congress: Quiver Quantitative · up to 45d STOCK Act lag
- Options: Unusual Whales + Cboe · real-time
- Shorts: FINRA + Fintel · 1–2w lag

> **Budget flag**: Quiver ($50–100/mo) and Unusual Whales ($200–400/mo)
> are not in the current budget. Spec calls for them by Phase 9. Either:
> (a) defer options flow, (b) use FMP senate/house feed for congressional
> (already paid for), (c) raise data budget with revenue.

---

## 08. Ticker detail page

Most important screen. Strict hierarchy: **hero → thesis → trade plan →
8-factor breakdown → deep dive rail**. Everything else collapsed.

- **Hero** — ticker + name + exchange + `In research set` pill + signal
  # + horizon + live price + market cap + 8-segment ring.
- **Lens thesis card** — serif prose, eyebrow "LENS THESIS · [TYPE]",
  timestamp "Updated 6:47 AM ET", 3–4 sentences.
- **Trade plan** — Stop / Entry / Now / Target timeline + R/R pill +
  2–3 supporting bullets (↑ driver, ! risk, · context).
- **8-factor breakdown** — radar + numbered list with weighted composite
  top-right. Smart money row clickable → drill-down.
- **Deep Dive accordion** — 7 rows, collapsed: Price chart · Options flow
  detail · Fundamentals · Valuation & sensitivity · Related news · Macro
  & regime context · Peer comparison.

---

## 09. Factor deep-dives — THE differentiator

Per-factor explainer pages that show **why** a score is what it is.
8 factors + 5 Smart Money sub-dives = **13 unique explainer pages**,
same 5-block template:

1. **Factor summary card** — score + circular progress + one-sentence
   description + universe percentile.
2. **Inputs panel** — 6–8 stat cards showing specific measurements +
   universe median context.
3. **Distribution band** — weak/average/strong terciles with ticker's
   position marked.
4. **90-day trajectory** — line chart of factor score over 90 days +
   universe median reference line.
5. **Lens commentary** — 2–3 sentence narrative naming the dominant driver.

### Factor-specific inputs

| Factor | Key inputs |
|---|---|
| **Momentum** | 5d / 20d / 60d / 120d returns · multi-TF RSI · ADX · distance from 52w high |
| **Rel volume** | Current volume · 30d avg · intraday ratio · $ traded vs cap |
| **News catalyst** | Article count 24h / 7d · catalyst percentile · EDGAR filings · sentiment · top 5 catalyst list |
| **Earnings quality** | 4Q beat rate · revenue surprise · EPS surprise · next report · ATM IV · beat/miss grid |
| **Sentiment** | Analyst upgrades/downgrades 30d · target price changes · Stocktwits/Reddit |
| **Trend** | Price vs 50d · vs 200d · golden/death cross distance · slope · mini price chart |
| **Risk** | IV rank · beta · 90d max DD · days to earnings · ATR · IV gauge |
| **Smart money** | All 5 sub-components with own tap-through explainer pages |

Navigation: tap factor row on ticker page → deep-dive opens full page
(mobile) or modal overlay (web). Breadcrumb: `Research / MSFT / Momentum`
or `Research / MSFT / Smart money / Insiders`.

---

## 10. My stuff — Portfolio

5 sub-tabs: Holdings · Analysis · Benchmark · Risk · History.

- **Holdings** — table/cards per holding: shares, value, % of port, P/L,
  Lens score, factor drift (which factors moved most in 30d), signal status.
- **Analysis** — sector concentration (flag any sector > 60%), portfolio
  factor profile (weighted by position), top contributors/detractors.
- **Benchmark** — overlay chart vs. SPY / QQQ / custom + alpha/beta/IR.
- **Risk** — beta, volatility, max DD, Sharpe, largest position %,
  correlation matrix.
- **History** — trade history, realized P/L, tax lot tracking.

### Lens portfolio commentary (nightly)

One paragraph per user: dominant factor tilt, largest concentration risk,
any holding with Lens-score drop > 20 pts in 30d, whether any holdings
appear in today's drop, benchmark tracking.

### Review flags

If a holding's Lens score drops 20+ points over 30 days → **review flag**.
Soft nudge, not a sell signal. Surfaced on holdings row + Inbox.

---

## 11. My stuff — Watchlist & Boards

**Watchlist** — flat list of tickers to monitor but don't own.
**Boards** — user-defined themed clusters ("AI infrastructure," "Cyclicals
rebound," "Earnings plays"). Each board = named sub-watchlist with Lens
coverage + board-avg score.

---

## 12. Audit log — single most important trust feature

Every signal ever issued, with entry / exit / outcome / Lens retrospective.
**Losers are not hidden. Ever.** Public-facing on marketing site + one tap
away inside the app.

### Signal detail page (especially for losers)

- Hero with outcome pill (`Stopped out` in danger color)
- Entry / Stop / Target / Exit / Outcome grid
- Factor profile at issue (what the engine saw)
- **Lens retrospective** — narrative explaining what failed, tagged with
  failure mode (commodity_regime, earnings_surprise, broad_selloff, etc.)

### Failure-mode aggregation

Every losing signal gets tagged with a failure-mode code. Aggregated
publicly on methodology page so users can see what categories of risk
the engine misses.

---

## 13. Screener

Under Research. Custom filter 500+ tickers by factor thresholds, save
presets, share as board. Default view: "tickers that pass the universal
bar but aren't in today's drop" — the next-up queue.

Filter axes: composite score, each of 8 factors, sector, market cap,
earnings window, IV rank, exclude today's drop, exclude portfolio.

---

## 14. Inbox (alerts + notifications)

One inbox replaces old Alerts + Notifications split. Filter chips: All ·
Signals · Alerts · Reviews · System. Bell badge for unread.

### Alert trigger types

- **Price** — cross above, cross below, % change from setpoint.
- **Score** — composite crosses threshold.
- **Factor** — single factor score threshold.
- **Smart money** — new insider cluster / 13F add / unusual options.
- **Signal entry/exit** — ticker enters or leaves today's drop.
- **Portfolio review** — auto-flag when holding drops > 20 score pts in 30d.

---

## 15. Ask Lens — REGULATORY GATE

Contextual chat surface — floating button on ticker pages + full-screen
from Research tab. Every answer cites the specific factor/data referenced.

**Pre-ship requirements:**
1. System prompt hard-refuses any "should I" framing, redirects to
   factor-based description.
2. Red-team test with 100+ adversarial prompts. Document every refusal
   for legal review.
3. Securities-attorney sign-off on system prompt before Phase 8 ship.

### Example exchange

> **User**: "Should I buy it?"
> **Lens**: "I describe what's in the research set; I don't recommend
> trades. What I can tell you: the setup is event-driven with a 15–20
> day horizon, the trade plan has a 3.2:1 R/R if entered near $422 with
> a stop at $410, and the risk factor scores 77 — moderate. Whether the
> setup fits your portfolio, risk tolerance, or time horizon is yours
> to judge."

---

## 16. Onboarding — 4 steps, < 90 seconds

| Step | Collects | Used for |
|---|---|---|
| 1 · Welcome | Nothing — posture statement + CTA | Sets expectation: research, not advice |
| 2 · Interests | Tags (themes + sectors), pick 2+ | Ranks today's drop · seeds Boards |
| 3 · Style | Hold duration + risk tolerance | Filters signal types |
| 4 · Notifications | Push channel opt-ins | Inbox + push scheduling |

Every step skippable. End state: user lands on today's drop filtered to
their interests.

---

## 17. Auth

Email + password via bcrypt. OAuth: Apple (required for iOS App Store) +
Google. **No Facebook.**

Sign-up requires two checkboxes — Terms/Privacy AND "research, not advice"
acknowledgment. Both logged with timestamps for regulatory records.

Reset link expires 30 min, single-use token. MFA opt-in via authenticator
app. **Required for Elite accounts day 1.**

---

## 18. Settings — 5 panels

- **Personalization** — interests, hold duration, risk tolerance,
  appearance (system/light/dark), default landing tab.
- **Notifications** — morning drop, signal alerts, portfolio, quiet hours.
- **Billing** — current plan, change plan, invoices, payment method.
- **Account** — name, email, password, MFA.
- **Data** — portfolio import, export, delete.

### Plan tiers — FINAL

| Feature | Free | Pro · $29/mo | Elite · $99/mo |
|---|---|---|---|
| Daily drop signals | 3 (delayed 15 min) | All · real-time | All · real-time |
| Factor deep-dives | — | All 8 factors | All 8 + sub-dives |
| Smart money data | — | Full | Full + options flow |
| Audit log | Public | Public + personal | Public + personal |
| Portfolio analytics | Holdings only | Full analytics | Full + Lens Personalized |
| Ask Lens chat | 5 msgs/day | Unlimited | Unlimited + history |
| Alerts | 3 price | Unlimited · push + email | Unlimited · push + email + SMS |
| Boards | 1 | Unlimited | Unlimited + share |

> Elite moved from $45/mo (old pricing) → $99/mo. Intentional gap,
> validated with beta data. Watch: if Pro→Elite upgrade rate < 8%,
> revisit.

---

## 19. Methodology & help — load-bearing trust page

Linked from every signal, public landing, audit log. Must pass the
"is this legitimate?" test from a skeptical reader in 90 seconds.

### Outline

1. How a signal is made — 3-paragraph walkthrough.
2. The eight factors — 1-paragraph explainer per factor.
3. The universal bar — composite + factor floors explicit, not hand-waved.
4. Data sources & freshness — table of every source with update frequency,
   lag, and which factor it feeds.
5. Regime model — how risk-on/off is classified and which weights shift.
6. Audit log philosophy — why losers are published, failure-mode tagging.
7. What Fintrest is not — publisher's-exemption language.
8. Backtest caveats — survivorship bias, regime coverage, OOS split.

---

## 20. Public landing page — current page must be fixed before paid ads

Required fixes:
1. **Remove fake testimonials.** Real named beta users with linkable
   profiles OR no testimonials.
2. **Replace "BUY TODAY" badges** with `In research set` / `Passed the
   8-factor bar` / `High score`.
3. **Extend backtest window.** Jan 2024 – Mar 2026 is bull-market only.
   Extend to include 2022 drawdown.
4. **Add product screenshots** (today's drop, ticker detail with ring,
   audit log with losers).
5. **Pricing clarity.** $29 vs $99 framed by buyer (casual reader vs
   active trader), not feature lists.

### Section order

1. Hero — "Research you can actually follow" + sub + CTA
2. Sample signal — real today's-drop item with 8-factor ring
3. How it works — 3-step (scan → score → explain)
4. 8 factors grid
5. Audit log preview — last 20 signals, wins + losses mixed
6. Methodology teaser
7. Pricing
8. FAQ (starts with "Is this investment advice?" → no)
9. Footer

---

## 21. Data contracts

### Signal object

```json
{
  "id": "signal_000412",
  "ticker": "MSFT",
  "name": "Microsoft Corp",
  "issued_at": "2026-10-22T10:47:00Z",
  "type": "event-driven",
  "horizon_days": [15, 20],
  "composite_score": 87,
  "factors": {
    "momentum":     { "score": 91,  "percentile": 96 },
    "rel_volume":   { "score": 100, "percentile": 99 },
    "news":         { "score": 94,  "percentile": 94 },
    "earnings":     { "score": 88,  "percentile": 87 },
    "sentiment":    { "score": 95,  "percentile": 95 },
    "trend":        { "score": 69,  "percentile": 62 },
    "risk":         { "score": 77,  "percentile": 71 },
    "smart_money":  { "score": 74,  "percentile": 78,
      "sub": {
        "insider":       { "score": 88, "weight": 0.35 },
        "institutional": { "score": 76, "weight": 0.25 },
        "congress":      { "score": 42, "weight": 0.15 },
        "options":       { "score": 81, "weight": 0.15 },
        "shorts":        { "score": 55, "weight": 0.10 }
      }
    }
  },
  "trade_plan": {
    "entry":  { "level": 422.00, "basis": "breakout retest" },
    "stop":   { "level": 410.00, "basis": "below 50d MA" },
    "target": { "level": 462.00, "basis": "prior high + measured move" },
    "risk_reward": 3.2
  },
  "thesis": "MSFT breaks out on 94th-percentile news catalyst...",
  "thesis_version": "2026-10-22-a",
  "regime_at_issue": "risk_on"
}
```

### Portfolio holding

```json
{
  "ticker": "NVDA",
  "shares": 12,
  "cost_basis": 86.50,
  "current_price": 142.14,
  "value": 1705.68,
  "pct_of_portfolio": 31.5,
  "pnl": { "absolute": 665.68, "percent": 44.2 },
  "lens_score": 91,
  "factor_drift_30d": {
    "momentum":    { "delta": 8,  "direction": "up" },
    "smart_money": { "delta": 12, "direction": "up" }
  },
  "signal_status": "in_todays_drop",
  "review_flag": false
}
```

### Audit entry

```json
{
  "id": 409,
  "ticker": "XOM",
  "issued_at": "2026-10-12T10:47:00Z",
  "closed_at": "2026-10-23T15:58:00Z",
  "type": "breakout",
  "composite_score_at_issue": 76,
  "entry": 112.00,
  "stop": 108.00,
  "target": 126.00,
  "exit": 108.44,
  "outcome": {
    "status": "stopped_out",
    "pnl_percent": -3.2,
    "days_held": 11
  },
  "failure_mode": "commodity_regime",
  "lens_retrospective": "The XOM setup failed on crude-oil weakness..."
}
```

---

## 22. Build-order checklist

| Phase | Ships | Blocks on |
|---|---|---|
| 0 · Foundation | Design tokens, component library, routing shell, auth, onboarding | Design system complete |
| 1 · Markets | Overview: regime, indices, breadth, sectors, screeners, earnings | Polygon + FRED |
| 2 · Today's drop | Research default, 8-factor scoring end-to-end, Lens thesis | Scoring pipeline nightly |
| 3 · Ticker page | Hero + thesis + trade plan + factor breakdown + 8-segment ring | Factor scores served |
| 4 · Deep dives | All 8 factor deep-dive pages + 5 Smart Money sub-dives | Phase 3 |
| 5 · Portfolio | Manual add + CSV import + 5 sub-tabs + review flags | Phase 3 |
| 6 · Audit log | Public list + signal detail + retrospectives + failure-mode tagging | Phase 2 has 30+ closed |
| 7 · Alerts + Inbox | Create alert, inbox filters, push + email delivery | Auth, ticker page |
| 8 · Ask Lens | Chat + ticker context + system prompt + red-team | Legal review |
| 9 · Smart Money hub | Hub Overview + 5 sub-tabs | Data source contracts |
| 10 · Screener | Custom filters + presets + save to board | Phase 2 |
| 11 · Watchlist + Boards | Flat watchlist + themed boards + board alerts | Phase 5 |
| 12 · Settings | All 5 panels | Stripe + OAuth |
| 13 · Public landing | Rebuild, remove fake testimonials, screenshots | Product screenshots |
| 14 · Methodology page | Full methodology + data sources + backtest disclosure | Legal sign-off |
| 15 · Paid acquisition | Ads, affiliate, content SEO | Everything above |

### Phases that parallelize

Phase 5 (Portfolio) + Phase 6 (Audit log) after Phase 3. Phase 9 (Smart
Money hub) depends on external data contracts — start as a side-track.

---

## 23. Route map

| Route | Page |
|---|---|
| `/` | Redirect to `/markets` (authed) or landing (unauthed) |
| `/markets` | Markets overview |
| `/markets/screeners` | All screeners expanded |
| `/markets/sectors` | Sector drill-down |
| `/markets/regime` | Regime classification + history |
| `/markets/earnings` | Earnings calendar |
| `/research` | Today's drop (default) |
| `/research/smart-money` | Smart money hub |
| `/research/smart-money/:subfactor` | Insiders / Congress / 13F / Options / Shorts |
| `/research/screener` | Custom screener |
| `/ticker/:symbol` | Ticker detail page |
| `/ticker/:symbol/:factor` | Factor deep-dive |
| `/ticker/:symbol/smart-money/:subfactor` | Smart Money sub-factor dive |
| `/my/portfolio` | Portfolio holdings + sub-tabs |
| `/my/watchlist` | Watchlist |
| `/my/boards` | Boards index |
| `/my/boards/:slug` | Board detail |
| `/audit` | Audit log list |
| `/audit/:signal_id` | Signal detail + retrospective |
| `/inbox` | Inbox (alerts + notifications) |
| `/inbox/create` | New alert |
| `/lens` | Ask Lens full-screen |
| `/settings/personalization` | Interests, style, appearance |
| `/settings/notifications` | Push, email, SMS preferences |
| `/settings/billing` | Plan, invoices, payment method |
| `/settings/account` | Name, email, password, MFA |
| `/settings/data` | Portfolio import, export, delete |
| `/methodology` | Full methodology |
| `/signin`, `/signup`, `/reset` | Auth |
| `/onboarding/:step` | Onboarding steps 1–4 |

Conventions: tickers uppercase in URLs, signal IDs stable integers never
reused, board slugs user-generated kebab-case, factor names canonical
(`rel-volume`, `smart-money`).

---

## 24. Open decisions

| Decision | Options | Blocks |
|---|---|---|
| Elite pricing | $75 / $99 / $129 | Launch pricing page |
| Lens Personalized language | "Tuned to" vs "Applied to" | Elite tier launch |
| Ask Lens system prompt | Draft vs stricter refusal | Phase 8 ship |
| Commodity regime overlay | Ship vs defer to v2 | Energy signal quality |
| Options data provider | Unusual Whales vs CBOE vs Benzinga | Phase 9 options |
| Broker integration | None · Plaid · Snaptrade | Portfolio import UX |
| Mobile app wrapper | Native · React Native · PWA | iOS App Store timing |
| Affiliate / referral | Commission · credit · none at launch | Growth plan |

---

**End of spec.** Ship plan + gap analysis in [MVP_FINAL_PLAN.md](MVP_FINAL_PLAN.md).
