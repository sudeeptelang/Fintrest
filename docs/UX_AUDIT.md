# Fintrest.ai — UX Audit (2026-04-24)

> Goal: make the signal score the gravitational center of every screen.
> Right now the score is one card among many. In a product that sells
> "explainable US stock signal scores," that's a leak in the positioning.

This doc captures (a) every rearrangement idea raised in the session,
(b) the ranked execution order, and (c) the tradeoffs. It's the sister
doc to `FMP_ROADMAP.md` — data and UI move together.

---

## Part 1 — What's wrong today

| # | Observation | Why it matters |
|---|---|---|
| 1 | BUY / WATCH / AVOID badge out-ranks the composite number on the Today grid. | The verdict is a *derived* tag. If the score is the product, the number (and its delta) leads. |
| 2 | Ticker detail stacks Hero → Lens → Trade Plan → Factors. | The 8-factor breakdown is buried as #4. A score-first stack puts it right after the hero, with Lens *explaining the score*, not sitting parallel to it. |
| 3 | 8-factor radar shows static scores. | Readers can't see which factor pushed this signal from WATCH to BUY today, or which factor is the fragile one. No daily story. |
| 4 | Audit log is nav #5. | For a product that sells explainability + tracked performance, historical accuracy IS the moat. It should be a persistent strip on Today, not a page users forget to visit. |
| 5 | Analyst rating / related news / earnings history compete with the score as peer cards. | Useful *evidence*, but they should be demoted into factor deep-dives, not steal attention from the score. |
| 6 | Markets page is a generic dashboard. | Could become "the score lens on the market" — sector scores, regime score, biggest score movers today. Every screen should reinforce the concept. |
| 7 | `/congress` and `/insiders` exist as standalone firehose pages + live on the Markets page. | Nobody browsing a firehose is finding a specific stock they care about. Belongs on ticker detail + as screener filters, nowhere else. |
| 8 | Signal rows on Today show mostly prose description. | Should be Bloomberg-grid dense: score, score delta, entry/target/stop, R:R, distance-to-entry, top-two factor contributions. Prose demotes to tooltip. |
| 9 | No stock logos anywhere. | Scanning a list of tickers is cognitive overhead. Logos anchor identity and make the grid feel alive. |
| 10 | Brand color is forest green — distinctive but may cost trust conversion. | Light-blue is finance-default (Schwab, Morgan Stanley, Fidelity). Could be a paywall-conversion win at the cost of brand differentiation. Test before committing. |
| 11 | **Everything is green.** "Three greens, three jobs" made every color meaningful — side effect is the whole page reads as one shade and nothing pulls the eye. The score gets drowned in brand chrome. | Visual gravity is gone. Need a second palette layer — brand forest stays for chrome, content uses a 4-family tint system (see Part 3.5). |

---

## Part 2 — The new IA

### Primary nav (down from 5 to 4 after Congress/Insiders kill)

1. **Today** — morning briefing + ranked signals
2. **Research** — featured signals on top, screener below (merger of current Markets + Screeners surfaces)
3. **Portfolio** — holdings with an aggregate portfolio score
4. **Audit log** — public track record

Removed from primary nav: Markets (merged into Research), Insiders, Congress.
Moved to "More" / secondary: Watchlist, Alerts, Notifications, Upload.

### Ticker detail — new stack order

1. Hero (ticker, price, actions, stock logo)
2. **Composite score + 8-factor breakdown** (promoted from #4 to #2)
3. **"What's driving today" strip** — factor contributions vs. yesterday (NEW)
4. Lens thesis — explains the number above, not separate from it
5. Trade plan (entry / target / stop together)
6. **Smart Money sub-card** (already there, phase 1 live)
7. Deep-dive accordion: price chart · news · earnings history · analyst ratings · ownership · fundamentals · valuation · peers
8. **Congress + Insider activity cards** (NEW — pulled from standalone pages)

### Today — new structure

1. Daily score strip (win rate this week / month — was Audit log page)
2. **"What changed overnight"** panel — Added / Fell off / Biggest score jumps (NEW)
3. Featured signals grid — data-dense rows, logos, score sparklines, inline "Run Lens" CTA
4. Market pulse condensed (regime + top sector scores)

### Research (new, replaces Markets)

1. **Markets strip** — indices ticker + 1D/5D/1M/6M/YTD/1Y/5Y/10Y/MAX chart + Latest News column (single row, inspired by the Google Finance pattern from reference PDF)
2. Featured signals (editorial picks)
3. Screener filters (score threshold, factor floors, insider buying, congress activity, DCF undervalued, etc.)
4. Movers grid — Tabs: Top Gainers / Top Losers / 52wk High / 52wk Low / Prev. Day; with inline "Run Lens" + "+ Watchlist" actions per row (reference PDF page 2)
5. Score heatmap (shaded by composite, not price %)
6. Sector score grid + regime + earnings/IPO calendars (refreshed two-column `Pre:/Post:/Mkt:/Est:` layout)

---

## Part 3 — Score-first primitives (cross-cutting)

These sit on top of the IA rearrangement — things that should appear *everywhere* a score is shown.

| Primitive | Where it appears | Effort |
|---|---|---|
| **Score sparkline** — 30-day micro-chart next to the number | Every card that shows a score | S |
| **Score delta vs. yesterday** — `+4` or `-2` badge | Every signal row, ticker hero, watchlist row | S |
| **Stock logo** — Clearbit or FMP logo CDN | Every ticker appearance | S |
| **Portfolio composite score** — aggregate of holdings' scores, weighted | Portfolio page hero | M |
| **Score-threshold alerts** — "when ALLY crosses 75" | Alerts page, quick-add from ticker | M |
| **Inline "Run Lens" CTA** — one-click thesis trigger from any grid row | Today, Research movers, watchlist, screener results | M |

> **"Run Lens" is also a monetization primitive.** Free tier = 3 Lens runs/day;
> Pro = unlimited. Every grid in the product becomes a paywall surface without
> adding any interstitial pages. See Open Questions §2.

---

## Part 3.5 — Palette expansion (two-layer)

Problem: pure "three greens" doctrine collapses visual hierarchy. Solution is a
two-layer palette — brand stays forest, content gets a muted 4-family system.

**Brand layer (unchanged):** `forest #0F4F3A` · `forest-dark #0A3528` · `forest-light #E8F1EC`
Used for identity only — nav active state, logo, primary CTA, Lens gutter.

**Content layer (NEW — four muted families):**

| Token | Hex | Family | Factors it tints |
|---|---|---|---|
| `navy` | `#1E3A5F` | Technical | Momentum · Trend · Rel Volume |
| `amber` | `#B8862F` | Fundamentals | Fundamentals · Valuation |
| `plum` | `#6B3B5E` | Sentiment | Sentiment · News |
| `teal` | `#2F7A7A` | Smart Money | Smart Money · Risk |

All four sit in the v2 "muted editorial" register — no primary RGB, compatible with the forest brand mood.

**Where each family shows up:**
- 8-factor breakdown bars (each bar tinted by its family) — turns eight identical green bars into four two-factor groups the eye can scan
- Deep-dive accordion rows (family icon + left border tint)
- Section backgrounds on Research (subtle 5% wash per tab — "Fundamentals view" vs. "Technical view")

**Still reserved:**
- `up #0A7F4F` — performance green (stock went up, score is high, bullish regime)
- `down #6B5443` — performance warm gray-brown (never red)
- `rust` — Lens editorial accent (unchanged)
- `warn #B25E09` / `danger #912018` — unchanged

**Rule update:** "Three greens, three jobs" still holds for brand/performance. Content hierarchy uses the new 4-family palette. Every color still has exactly one valid interpretation — we just doubled the lexicon.

---

## Part 4 — Ranked execution order

Costing: S = <2h, M = 4–8h, L = 1–3 days, XL = week+.

### Tier 1 — Cheap wins (≤1 day, do this week)
1. **Promote score + delta above verdict badge** on Today grid (S)
2. **Stock logos everywhere** — single component, Clearbit fallback CDN (S)
3. **Score sparkline primitive** — reused everywhere (S)
4. **Data-dense signal rows** — swap prose for score / R:R / levels / distance-to-entry (S)
5. **Kill `/congress` and `/insiders` pages**, remove from nav (S)
6. **Persistent Audit strip on Today** — win rate this week + link (S)
7. **Markets strip rework** — indices + chart + Latest News single row (S)
8. **Earnings calendar two-column refresh** — `Pre:/Post:/Mkt:/Est:` labels (S)

### Tier 2 — Mid refactors (1–3 days, next week)
9. **Merge Markets into Research** with screener on top (M)
10. **Ticker-detail stack reorder** — factors above Lens, Lens explains the number (M)
11. **Congress + Insider cards on ticker detail** — pull from firehose, filter by ticker (M)
12. **"What changed overnight" panel on Today** — needs a snapshot diff service (M)
13. **Inline "Run Lens" CTA** — wire button on grid rows + free-tier rate limit (M)
14. **Palette expansion rollout** — add 4 family tokens to Tailwind + apply to 8-factor breakdown + deep-dive accordion (M)
15. **Movers grid** — Top Gainers / Losers / 52wk High / 52wk Low tabs with inline actions (M)

### Tier 3 — Bigger moves (3–5 days, sprint after)
16. **"What's driving today" factor-contribution strip** — requires yesterday-vs-today diff per factor (M–L)
17. **Score heatmap** — shade by composite, not price (M)
18. **Portfolio aggregate score** — weighted blend of holdings' scores + trajectory (L)
19. **Score-threshold alerts** — new alert type end-to-end (L)
20. **Lens Editorial feed** — curated long-form from our voice, category-tagged (Earnings Season · Macro · Deep Dives). Uses MVP-2 newsletter infra as CMS. (L)

### Tier 4 — Strategic bets (decide before starting)
21. **Light-blue brand test** — mock up side-by-side first; full rollout is a half-day (XL if committed). *Partially mitigated by palette expansion — may not be needed.*
22. **Free/paid paywall shift** — free sees score, pays for breakdown. Pricing move, but UI side is reshaping Lens + factor breakdown as gated content (L)

---

## Part 5 — What we're consciously NOT doing

- **No dark mode.** MVP-1 is light-only. Confirmed decision.
- **No emoji**, no skeleton shimmers, no parallax. v2 design rules stand.
- **No custom charting library swap.** Recharts + lightweight-charts are fine.
- **No mobile nav redesign.** Bottom-tab 5-icon already works; just reorder to match the new primary nav.
- **No third-party analyst / author feed** (Seeking Alpha model — reference PDF page 3). We don't host thousands of external authors; building an empty feed pressures us toward AI slop, which poisons the Lens brand. Our answer is Lens Editorial (Tier 3) + the analyst card on ticker detail, not a content farm.
- **No Crypto / Forex / non-US equity support** in MVP-1. Reference PDFs show these in global competitors' grids; we're deliberately narrow.

---

## Open questions for the user

1. Is "Research" the right name for the merged Markets + Screener surface? (Alternatives: "Explore", "Discover", "Markets")
2. **Lens free-tier run allowance** — 3/day, 5/day, or 10/week? Decide before Tier 2 item 13 (inline CTA) ships, because the paywall interstitial copy depends on it.
3. Should Audit log stay as a full nav item *and* get the Today strip, or collapse into a Today widget with a "see all" link?
4. Brand color: palette expansion (Part 3.5) probably satisfies the "too green" concern — do we still want to test light-blue as a full rebrand, or call it handled?
5. Paywall model: free sees score + verdict, pays for Lens + breakdown? Decide before Tier 3.
6. Palette expansion approval — navy/amber/plum/teal as proposed, or different hues? (Mock up first or ship directly?)
