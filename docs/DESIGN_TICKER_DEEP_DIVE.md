# Ticker Detail — target design (v3)

Design target for the ticker detail page. Revised 2026-04-22 to fold in the
v2 mockup feedback: 8-factor composite (adds Smart Money), Smart Money
drill-down card, 7-row Deep Dive accordion, regime pill in the top nav.

Directly addresses the P0/P1/P2 items in
`docs/QA_TICKER_DETAIL_20260422.md`, and the roadmap stages in
`docs/SIGNALS_V3.md §14.9`.

---

## Top nav — regime pill

New element on the app-data shell: a small pill to the right of the
breadcrumb, format `Risk-on regime · VIX 14.2`. Values sourced from FRED
(10Y, DXY) + Cboe (VIX). Three states: `Risk-on` (forest dot), `Neutral`
(ink dot), `Risk-off` (rust dot). Visible on every app-data page — makes
the regime-gating story *visible* instead of a marketing claim.

---

## Above-the-fold — what every visitor sees by default

Five blocks. Nothing else on the default view.

### 1. Hero strip
- `F` logo + wordmark · breadcrumb `Today / MSFT` · **regime pill** ·
  plan badge `Pro`.
- Ticker (`MSFT`), company + signal meta (`Microsoft Corp · Signal #106 · 15–20 day horizon`).
- **Label `In research set`** next to ticker — replaces `BUY TODAY` per
  QA-P0-4. Non-directive by design. Other variants: `Setup active`,
  `High score`.
- Live price with today's change, market cap.
- **8-segment** composite score ring on the right (`87 · out of 100`).
  Adding Smart Money as the 8th segment nudges the composite down from 89
  to 87 for MSFT — which is honest: adding a moderate factor to a strong
  signal should move the needle slightly down, not up.

### 2. Lens thesis card
- Eyebrow: `LENS THESIS · EVENT-DRIVEN SETUP` — signal type explained
  in the eyebrow (QA-P1-3 fix).
- Timestamp: `Updated 6:47 AM ET`.
- Prose body: 3–4 sentences in morning-note voice. With the new data
  sources plumbed in, the voice picks up specifics: insider dollar
  amounts + officer history ("CFO's largest purchase since 2023"), 13F
  positioning ("Tiger Global initiated a $180M position"), options flow
  ("unusual call buying on Nov 22 expiry, 4.1x average, ask-weighted").
  It reads like a sell-side note because it has more to say.
- `Full factor audit →` link on the left footer.
- `Research only — your decision` caption on the right footer.

### 3. Trade plan
- Eyebrow: `TRADE PLAN` · right-aligned `Reward / risk 3.2 : 1` pill.
- Horizontal timeline: **Stop · Entry · Now · Target** with prices.
- Three supporting bullets with glyphs:
  - `↑` bullish driver ("Analyst target implies 35% upside; operating margin 46.7% confirms pricing power")
  - `!` risk ("Regulatory scrutiny on AI; cloud competition from AWS and Google intensifying")
  - `·` neutral context ("Reward/risk 3.2:1 sits above universe median of 2.1:1")

### 4. 8-factor breakdown
- Radar on the left (8 axes: Momentum, Rel Vol, News, Earnings,
  Sentiment, Trend, Risk, Smart $), numbered list on the right.
- Right column: factor name + score, color-coded (green for strong,
  amber for weaker, down-toned for poor).
- Top-right: `Weighted composite 87/100`.
- **Smart money row is clickable** — sits at the bottom, labelled
  `Smart money · expanded ↓` with a score of `74`. Expanding it reveals
  Block 5 below.
- **Replaces the old Factor Radar + Factor Gauges + Factor Scores trio**
  (QA-P1-1).

### 5. Smart Money breakdown (indented drill-down)
- Visually indented with a 2px `forest` left border so it reads as a
  *drill-down of the 8th factor*, not a parallel card.
- Header: `SMART MONEY · BREAKDOWN` + `Composite 74/100 · 5 sub-signals
  weighted by independent accuracy`.
- Five sub-rows, each showing:
  - Label + `{weight}% weight` pill.
  - Horizontal strength bar.
  - Numeric score on the right.
  - One-sentence evidence line that names the *specific* detail (not
    "strong insider activity" — actually "CFO's largest purchase since
    2023" or "Tiger Global $180M new position").
  - **Source line**: `Source: <feed> · <staleness window>`. This is the
    credibility lever. Most competitors hide provenance — we publish it.

Sub-rows, in weight order:

| Row | Weight | Example evidence | Source · staleness |
|---|---|---|---|
| Insider activity | 35% | `CFO and 2 directors bought $4.2M in last 30 days. CFO's largest purchase since joining 2023. No 10b5-1 disposals.` | SEC EDGAR Form 4 · 1–2 day disclosure lag |
| Institutional flow | 25% | `Institutional ownership +3.1% QoQ. Tiger Global initiated $180M new position. 14 tracked funds added; 3 trimmed.` | SEC 13F via Whale Wisdom · 45-day reporting lag |
| Options positioning | 15% | `Unusual call volume on Nov 22 expiry — 4.1x 30-day average, ask-weighted. Put/call 0.42 vs. 0.68 sector median.` | Unusual Whales + Cboe · real-time |
| Congressional | 15% | `No material trades this quarter. 2 immaterial disclosures (<$15K). Score weighted by each member's 90-day forward accuracy.` | Quiver Quantitative · up to 45-day STOCK Act lag |
| Short dynamics | 10% | `Short interest −8% WoW while price rising — conviction unwind, not squeeze setup. Days-to-cover 1.4, low pressure.` | FINRA bi-monthly + Fintel · 1–2 week lag |

### 6. Deep Dive accordion (collapsed by default)
- Header: `DEEP DIVE`.
- **7 rows** (was 5 in the v1 mockup — the revision adds Options flow
  detail + Macro & regime context).
- Each row: one-line summary shown when collapsed so readers can tell
  whether it's worth expanding.

| Row | One-line summary shown when collapsed |
|---|---|
| Price chart | `1D · 5D · 3M · 1Y · volume profile · Polygon real-time` |
| Options flow detail | `Chain · unusual activity · skew · IV rank · Unusual Whales` |
| Fundamentals | `Financial health strong · 3 of 5 scorecard signals populated` |
| Valuation & sensitivity | `Fair value $572.76 · 5-scenario multiple analysis` |
| Related news | `6 articles · 2 contributed to news score · Benzinga · EDGAR 8-K · Yahoo` |
| Macro & regime context | `Risk-on · VIX 14.2 · 10Y 4.21% · DXY 103.4 · FRED + Cboe` |
| Peer comparison | `Insufficient peer data — hidden until populated` (greyed, not tappable) |

**Key rules** (from QA-P0-3):
- **Hide-until-populated**: if a Deep Dive row has fewer than N fields
  populated (`peer comparison`, for example, when Microsoft has no peer
  rows), render in greyed state with "hidden until populated" —
  non-tappable. Never ship empty sections labeled "Neutral".
- **Summary must be specific**: "Financial health strong · 3 of 5
  scorecard signals populated" beats "Fundamentals data". Mentioning
  completeness (`3 of 5`) upfront is honest about what's inside.
- **News row counts weighted contribution** (QA-P2 suggestion): "6
  articles · 2 contributed to the news catalyst score" ties the news
  section back to the 8-factor breakdown so the whole page feels
  coherent. Source tags (Benzinga · EDGAR 8-K · Yahoo) surface which
  feeds contributed.

---

## Implementation plan

Lands in staged commits so each is reviewable. The UI scaffolding (A–C)
ships before the data behind Smart Money is fully populated; empty sub-
rows render with the honest `—` / `No trades this quarter` state.

### Commit A — Deep Dive shell + 8-factor consolidation
- New `DeepDiveAccordion` component. Rows accept
  `{title, summary, children, emptyMessage?}`.
- When `emptyMessage` is set, render greyed and disable expand.
- Move the five existing sections (`PriceChart`, `StockSnapshot` +
  `TechnicalAnalysis` → Fundamentals slot, `ValuationSection` →
  Valuation & sensitivity slot, `RelatedNews`, `OwnershipStrip` /
  peer) into the accordion children.
- **Drop** the three factor visualizations (`FactorRadar` +
  `FactorGauges` + `FactorBarChart`) down to `FactorBreakdownPanel`
  (radar + numbered list) (QA-P1-1).
- Options flow detail + Macro & regime context rows render with
  `emptyMessage` until their feeds are wired (Phase 2/3).

### Commit B — Hero + regime pill
- Badge `In research set` replaces `BUY TODAY` on the signal detail
  hero (QA-P0-4). Wire the variant selector in `signal-badge.tsx`.
- Add `Signal #<id> · <N>–<M> day horizon` line under company name.
- Lens thesis card eyebrow picks up signal type: `LENS THESIS ·
  <SIGNAL_TYPE>` (e.g. EVENT-DRIVEN SETUP, MOMENTUM RUN, etc.).
- Trade plan visual gets a `Now` tick between Entry and Target.
- New `RegimePill` in the app header, sourced from the daily macro
  snapshot (FRED + Cboe).

### Commit C — 8th factor (Smart Money) + breakdown card
- Extend `SignalBreakdown` type with `smartMoneyScore` + optional
  `smartMoneyComponents` (5 sub-scores + evidence + source).
- Score ring picks up the 8th segment.
- `FactorBreakdownPanel` radar picks up the `Smart $` axis; list picks
  up the row.
- New `SmartMoneyBreakdown` card renders below the 8-factor panel,
  visually indented (2px forest left border + 16px left pad). When
  sub-components are null, the card still renders but shows each row in
  its honest empty state with source/staleness.

### Commit D — Empty-state discipline
- Pass `isPopulated` booleans from the data layer up to each Deep Dive
  row.
- `StockSnapshot`: if >50% of `—` cells, hide the whole card.
- `PeerComparisonCard`: render the greyed "Insufficient peer data"
  state when `peerCount < 3`.
- `RelatedNews`: compute + show `N articles · M contributed to the
  news catalyst score`. `M` comes from the news items that fed the
  scoring engine's news catalyst factor for this signal.
- `RelatedNews`: render per-row source chips (Benzinga / EDGAR 8-K /
  Yahoo).

---

## Build order for the Smart Money feeds (mirror of §14.9)

| Phase | Feeds | Sub-rows it powers | Cost |
|---|---|---|---|
| 1 | SEC EDGAR Form 4 (free, parser + cron) | Insider activity | $0 |
| 2 | Quiver Quantitative + 13F parsing | Congressional + Institutional flow | ~$50–100/mo |
| 3 | Unusual Whales (delay until Pro revenue) | Options flow | several $100/mo |

Short dynamics sits alongside — FINRA bi-monthly data is free but low-
frequency; Fintel fills the gap.

The macro deep-dive row ships in Phase 1 too — FRED is free and the
regime classifier (risk-on / neutral / risk-off) is a few rules on 10Y
yield, VIX, and DXY.

---

## What stays unchanged

- Lens thesis prose — QA review called this one of the strongest
  pieces on the page. Don't touch the writing; just expand it to weave
  in insider/13F/options once those APIs are plumbed in.
- Reference levels (Entry / Stop / Target) — correct minimum-viable
  trade plan. Just add `Now` tick.
- Sensitivity analysis — most differentiated piece. Lives in the
  `Valuation & sensitivity` row but expands to the full view.
- Signal numbering (`#106`) — the audit-log trust lever. Keep this
  prominently displayed in the hero.

---

Source: visual mockups received 2026-04-22 (v1 + v2 revision). Page
structure matches QA review recommendations; this doc is the
implementation target, not a separate proposal.
