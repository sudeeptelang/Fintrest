# QA — Ticker Detail page (MSFT live review, 2026-04-22)

External review of the live MSFT ticker page. Ordered by severity. Items tagged
`P0` are credibility-breaking and should land before any new v14.x scoring
feature ships publicly.

---

## Credibility-breaking (P0)

### P0-1. Fundamental scorecard contradicts the Lens thesis
MSFT shows **Growth 0/100 WEAK** and **Valuation 21/100 WEAK** while the Lens
thesis six inches above argues MSFT is an AI/cloud growth leader worth buying.
A 0/100 growth score on Microsoft is a screenshot-for-Reddit bug.

Likely causes:
- Null-handling defaulting to 0 instead of hiding / "—"
- Methodology benchmarks mega-caps against early-stage growth (12–15% rev
  growth scores low when peer distribution is 30%+ growth startups)
- Data feed empty for MSFT specifically

**Fix priority: highest.** Audit the scorecard data pipeline. If data is
missing, render "—" not "0." If methodology is mis-benchmarked, cap at peer-
sector comparison (§14.1 sector ranking should help — Q/P/G is sector-
normalized by design, unlike this older scorecard).

**Rule:** an absent section is 1000× better than a section that says
Microsoft has zero growth.

### P0-2. Volume signal contradicts itself
- Lens thesis: "14M shares at 0.45× 30-day avg — institutional patience."
- 7-factor Rel Volume: 100/100 "Elevated participation. Volume meaningfully
  above 30-day average."

These cannot both be true. One of them is reading stale or wrong data. Find
which of `dayVolume` vs `relVolume` is the source of truth, and make the
thesis generator + factor scorer read from the same value.

### P0-3. Empty data everywhere
PE, SMA 20/50/200, RSI, ATR, TTM Revenue, P/E (TTM), EV/EBITDA, 5Y/10Y EPS
Growth, Next Earnings, the entire Technical Analysis table labeled "Neutral"
across all rows — all "—" for MSFT.

**Rule:** ship no section, or ship a full section. Never ship an empty section
labeled "Neutral." Add a per-section emptiness check; if > N% of fields are
null, hide the whole section with a "data unavailable" placeholder.

### P0-4. "BUY TODAY" badge next to ticker
Same positioning issue as the landing page. We're marketed as research, not
recommendations. Swap "BUY TODAY" for:
- "PASSED" / "IN RESEARCH SET" / "SETUP ACTIVE" / "HIGH SCORE"

Any of those is non-directive. The literal word BUY 4 inches from an 89/100
score reads as a recommendation.

---

## Structural (P1)

### P1-1. Section count too high
~15 sections from Lens thesis to Related News. Most users bail before
Sensitivity Analysis (which is one of the strongest).

**Consolidation to do:**
- Merge Factor Radar + Factor Gauges + Factor Scores → one visualization.
  Pick strongest (gauges or radar, not three views of the same data).
- Merge Snapshot + Technical Analysis + Performance → single tabbed module.
- Put Valuation + Peer P/E + Sensitivity + News behind a "Deep Dive" toggle.
  Default view: Lens thesis + ref levels + 7-factor + price chart.

### P1-2. Factor Scores bar chart has confusing overlay
Faded/gray bars behind the green + callout "Trend (13%): 69/100 (B)". Unclear
what the gray represents — benchmark? sector median? historical? Label it or
remove it.

### P1-3. "Event-Driven" signal type needs explainer
New users don't know what signal family that is. Add a hover tooltip or a
small "?" button expanding to 1–2 lines on what the type implies.

---

## Methodology (P2)

### P2-1. Risk analysis text is circular
"Scoring engine rates this 89/100 — high conviction" tells the user the score
is high because the score is high. Risk 77 should say *why* — implied vol vs
peers? Beta? Earnings-date proximity? Drawdown history? Something that
changes the user's sizing decision.

### P2-2. "94th percentile catalyst activity" needs defending
Percentile against what universe, over what window, measured how (news count?
velocity? sentiment-weighted?)? Tooltip or inline footnote.

### P2-3. Volume interpretation is narrative-only
"Low volume on an up day = institutional patience" is a choice, not a truth.
Many traders read low-volume rallies as weak. If the scoring engine really
reads 0.45× volume as bullish, Lens needs to defend that explicitly.
Likely a symptom of P0-2 (the volume contradiction).

---

## Working well (don't regress)

- Lens thesis prose quality — reads like a sell-side morning note, specific
  numbers + reasoning + conclusion. Don't let a cheaper model ghostwrite.
- Reference levels block — entry + stop + target + timeframe + "research
  only" disclaimer. Right minimum-viable trade plan.
- **Sensitivity analysis** — most differentiated piece on the page. "At 20%
  multiple compression, fair value is $339" is institutional-quality framing.
  Pull higher in page order; currently buried below empty tables.
- Signal numbering (#106) — stable permanent ID linking to the audit log.
  Strongest trust lever in the product.
- Related news from Yahoo — adds context. Consider tagging which news items
  the scoring engine actually weighted (e.g. "2 of these contributed to your
  94 news catalyst score"), ties news back to the 7-factor breakdown.

---

## Highest-leverage single fix this week

**Fundamental scorecard data pipeline (P0-1).** An absent section is a
thousand times better than one that says Microsoft has zero growth. If you
can only ship one thing this week, audit that module — null-handling or
methodology — and fix it or hide the section entirely.

---

Source: external review of the live `/stock/MSFT` page, 2026-04-22. Not yet
triaged into separate issues; keep this file updated as items are resolved
(mark `✅ fixed in commit X`) so the review is audit-trailed.

---

# Proposed 8th factor — Smart Money (spec received 2026-04-22)

Composite factor combining five insider-and-institutional sub-signals. Treat
weights and thresholds as a *starting point to backtest*, not gospel.

## Inputs (five data streams, each scored 0–100)

### 1. Insider transactions (weight **35**)
Highest-quality sub-signal — real discretionary money from people who know
the business. Source: SEC EDGAR Form 4s (primary) + OpenInsider / Quiver
(backup).

**Filter aggressively:**
- **Include:** open-market purchases by officers / directors / 10%-owners.
- **Exclude:** option exercises, 10b5-1 planned sales, gifts,
  tax-withholding dispositions. Non-discretionary sales look bearish but
  aren't — showing them as "insider selling" generates false bearish
  signals that sophisticated traders will spot.

**Weighting within the sub-signal:**
- Cluster buys (≥3 insiders within 30 days) > lone director buy.
- CFO / CEO purchases > director purchases.
- Weight by size relative to insider's prior holding — a CEO doubling
  their stake is louder than trimming 1%.

### 2. Institutional accumulation (weight **25**)
Slower (quarterly, 45-day reporting lag) but high signal-to-noise. Source:
13F filings from EDGAR, or Whale Wisdom / Fintel.

**Key measures:**
- QoQ change in institutional ownership %
- Count of institutions **initiating** vs **closing**
- Flag if any *tracked* funds (Berkshire, Tiger, Lone Pine, ARK,
  Renaissance, Citadel, Bridgewater) initiated or materially added

**Survivorship bias risk:** your "tracked funds" list will be tempted to
include famous winners. Either publish the list transparently with
methodology, or don't show fund names — use aggregate counts.

### 3. Congressional trades (weight **15**)
Include but keep weight low. Noisy, up to 45-day STOCK Act disclosure lag,
member-level accuracy varies wildly. Source: Quiver Quantitative, Capitol
Trades.

**Member-weighted:** score each disclosed trade by that member's historical
90-day forward return accuracy. High-accuracy members = higher signal,
low-accuracy members = near zero.

**Rolling recalibration required:** recompute per-member accuracy monthly.
Don't hardcode "Pelosi = high signal" — let the data decide. Adverse
selection: as Congressional visibility grows (Quiver is mainstream now),
signal decays. Build quarterly weight-recalibration into the job.

### 4. Options flow (weight **15**)
Short-dated aggressive call buying at the ask, or unusually large blocks
relative to open interest. Noisy but leading. Useful as a "something is
about to happen" flag more than a directional bet alone.

Source: Unusual Whales, Cboe DataShop (most expensive of the five feeds).

### 5. Short interest dynamics (weight **10**)
Situational contribution — most of the time near zero, but very relevant
when it matters. Source: Fintel, FINRA bi-monthly data.

**Setups to look for:**
- Rising short interest **paired with** rising price → squeeze setup
- Falling short interest **alongside** rising price → institutional
  conviction

## Starting weights (backtest, don't treat as gospel)

```
Insider 35 · Institutional 25 · Congressional 15 · Options 15 · Short 10 = 100
```

Prior guess after honest backtesting: Insider may deserve **40**,
Congressional may deserve **10**. Backtest against the 2022–2024 universe
with current 7-factor engine before shipping with default weights.

## UI — score ring expansion

- Ring goes from **7 segments → 8**. New segment = Smart Money. Segment
  length = factor strength (same convention as existing factors).
- Pick a distinctive color (green is thematically right — money, smart —
  check for palette collisions with `up` / `forest`).
- **Tap-to-expand** interaction on the Smart Money segment only. Tapping
  opens a secondary 5-segment mini-ring showing the sub-components
  (insider / institutional / congressional / options / short). No other
  factor needs this; Smart Money earns it because it's composite.

## Lens explanation template

Reads like a research analyst talking, not a dashboard dump. Structure:
lead with strongest sub-component, cover others in descending order of
contribution, end with what's driving the score.

```
Smart Money · 82/100

Three insiders bought a combined $4.2M of open-market shares in the last
30 days, including the CFO's largest purchase since joining in 2023.
Institutional ownership rose 3.1% quarter-over-quarter, with Tiger Global
initiating a new $180M position. Unusual call buying on the Nov 22
expiry — 4× average volume, weighted toward the ask. No material
Congressional trades this quarter. The cluster of discretionary insider
buying is the dominant driver here.
```

Generate nightly via Claude against raw transaction data. Cache in Redis
(`lens_smartmoney:{ticker}:{date}`, 36h TTL). Don't regenerate on every
page view.

## Edge cases that will bite

- **Data freshness honesty.** Form 4s lag up to 2 business days; 13Fs lag
  45 days; Congressional lags up to 45 days. Lens must timestamp inputs:
  "based on insider activity through Nov 18." Hiding staleness is a
  published-takedown risk.
- **10b5-1 planned sales** must be excluded (as above).
- **Member-weighted Congressional** needs monthly recalibration.
- **Survivorship** in tracked-funds list (as above).
- **Adverse selection over time** — build quarterly weight recalibration.

## Build sequence for our stack

### Phase 1 (1–2 weeks) — Insider MVP
- SEC EDGAR Form 4 ingestion (primary) + OpenInsider backup.
- New Postgres table `insider_transactions`.
- Nightly scoring job → `smart_money_insider_score` per ticker.
- Ship as a **standalone signal** in the UI before wiring into the main
  ring. Gives a testable MVP of Smart Money without committing to the
  full composite.

### Phase 2 (2–3 weeks) — Add 13F + Congressional
- 13F parsing from EDGAR.
- Quiver Congressional client.
- Wire all three into composite.
- Start generating Lens explanations via Claude.

### Phase 3 (3–4 weeks) — Options + Short dynamics
- Unusual Whales client (most expensive piece).
- Fintel short-interest client.
- Ship the expanded ring (8th segment) + tap-to-expand mini-ring.
- Backtest composite against 2022–2024 before enabling as default-
  weighted factor.

## Acceptance criteria

Smart Money must **measurably improve** forward 5-day and 20-day returns
on the signal set (vs. the 7-factor baseline). If it doesn't improve
forward IC, the weights are wrong — don't ship on aesthetics alone.

---

Source: spec received 2026-04-22. Out of scope for this week. Will be
tracked in `docs/SIGNALS_V3.md` §14 roadmap as a new §14.x entry when
work begins.
