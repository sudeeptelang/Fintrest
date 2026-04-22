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
