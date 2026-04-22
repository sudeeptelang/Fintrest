# Ticker Detail — target design (v3)

Design target for the ticker detail page, based on 2026-04-22 mockup.
Directly addresses the P0/P1/P2 items in
`docs/QA_TICKER_DETAIL_20260422.md`.

---

## Above-the-fold — what every visitor sees by default

Five blocks. Nothing else on the default view.

### 1. Hero strip
- `F` logo + wordmark · breadcrumb `Today / MSFT` · plan badge `Pro`.
- Ticker (`MSFT`), company + signal meta (`Microsoft Corp · Signal #106 · 15–20 day horizon`).
- **Label `In research set`** next to ticker — replaces `BUY TODAY` per
  QA-P0-4. Non-directive by design. Other variants: `Setup active`,
  `High score`.
- Live price with today's change, market cap.
- Composite score ring on the right (`89 · out of 100`).

### 2. Lens thesis card
- Eyebrow: `LENS THESIS · EVENT-DRIVEN SETUP` — **signal type explained
  in the eyebrow** (QA-P1-3 fix).
- Timestamp: `Updated 6:47 AM ET`.
- Prose body: 3–4 sentences in morning-note voice. Specific numbers,
  specific reasoning, specific conclusion.
- `Full factor audit →` link on the left footer.
- `Research only — your decision` caption on the right footer.

### 3. Trade plan
- Eyebrow: `TRADE PLAN` · right-aligned `Reward / risk 3.2 : 1` pill.
- Horizontal timeline: **Stop · Entry · Now · Target** with prices.
  (Adds `Now` tick to the existing entry/stop/target visualization —
  shows where price actually sits between reference levels.)
- Three supporting bullets with glyphs:
  - `↑` bullish driver ("Analyst target implies 35% upside; operating margin 46.7% confirms pricing power")
  - `!` risk ("Regulatory scrutiny on AI; cloud competition from AWS and Google intensifying")
  - `·` neutral context ("Reward/risk 3.2:1 sits above universe median of 2.1:1")

### 4. 7-factor breakdown
- Radar on the left, numbered list on the right.
- Right column shows factor name + score, color-coded (green for
  strong, amber for weaker Trend/Risk, etc.).
- Top-right: `Weighted composite 89/100`.
- **This replaces the old Factor Radar + Factor Gauges + Factor Scores
  trio** (QA-P1-1). One visualization; the list tells you the numbers.

### 5. Deep Dive accordion (collapsed by default)
- Header: `DEEP DIVE`.
- Rows with right arrows — each expands to a richer section OR links to
  a dedicated page. Each row has a one-line summary so a user can tell
  whether it's worth expanding before they tap.

| Row | One-line summary shown when collapsed |
|---|---|
| Price chart | `1D · 5D · 3M · 1Y · volume profile` |
| Fundamentals | `Financial health strong · 3 of 5 scorecard signals populated` |
| Valuation & sensitivity | `Fair value $572.76 · 5-scenario multiple analysis` |
| Related news | `6 articles · 2 contributed to the news catalyst score` |
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
  section back to the 7-factor breakdown so the whole page feels
  coherent.

---

## Implementation plan

Lands in three commits so each is reviewable:

### Commit A — Deep Dive shell (UI consolidation)
- New `DeepDiveAccordion` component. Five rows, collapsed by default.
- Each row takes `{title, summary, children, emptyMessage?}`.
- When `emptyMessage` is set, render greyed and disable expand.
- Move the five existing sections (`PriceChart`, `StockSnapshot` +
  `TechnicalAnalysis` → Fundamentals slot, `ValuationSection` →
  Valuation & sensitivity slot, `RelatedNews`, `OwnershipStrip` /
  peer) into the accordion children.
- Drop the three factor visualizations (`FactorRadar` +
  `FactorGauges` + `FactorBarChart`) down to **radar-only**, paired
  with the right-column list (QA-P1-1).

### Commit B — Hero polish
- Badge `In research set` replaces `BUY TODAY` on the signal detail
  hero (QA-P0-4). Wire the variant selector in `signal-badge.tsx`.
- Add `Signal #<id> · <N>–<M> day horizon` line under company name.
- Lens thesis card eyebrow picks up signal type: `LENS THESIS ·
  <SIGNAL_TYPE>` (e.g. EVENT-DRIVEN SETUP, MOMENTUM RUN, etc.).
- Trade plan visual gets a `Now` tick between Entry and Target.

### Commit C — Empty-state discipline
- Pass `isPopulated` booleans from the data layer up to each Deep Dive
  row.
- `StockSnapshot`: if >50% of `—` cells, hide the whole card.
- `PeerComparisonCard`: render the greyed "Insufficient peer data"
  state when `peerCount < 3`.
- `RelatedNews`: compute + show `N articles · M contributed to the
  news catalyst score`. `M` comes from the news items that fed the
  scoring engine's news catalyst factor for this signal.

---

## What stays unchanged

- Lens thesis prose — QA review called this one of the strongest
  pieces on the page. Don't touch the writing.
- Reference levels (Entry / Stop / Target) — correct minimum-viable
  trade plan. Just add `Now` tick.
- Sensitivity analysis — most differentiated piece. Lives in the
  `Valuation & sensitivity` row but expands to the full view.
- Signal numbering (`#106`) — the audit-log trust lever. Keep this
  prominently displayed in the hero.

---

Source: visual mockup received 2026-04-22. Page structure matches QA
review recommendations; this doc is the implementation target, not a
separate proposal.