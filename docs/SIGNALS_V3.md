# Fintrest.ai — Signal Scoring Engine v3

> Upgrade spec for `docs/SIGNALS.md`.
> Builds on v2 (7 factors, 10 algorithms). Fully backward-compatible: v2 scores
> remain the baseline; v3 features are additive and can be rolled out in phases.
>
> **Design goal:** more realistic signals by adding context (regime, cross-section,
> macro, revisions) that v2 lacks, without requiring an expensive data stack
> rewrite. Phase A & B add **zero new cost**. Phase C is optional.

---

## What's Changing vs v2

| | v2 | v3 |
|---|---|---|
| Factors | 7 | **10** (add: Cross-Sectional Rank, Estimate Revisions, Macro Context) |
| Algorithms | 10 | **18** (add: 8 new, see §3) |
| Scoring | Weighted sum | Weighted sum → **regime-gated weights** → optional ML meta-learner (Phase D) |
| Data sources | Polygon, FMP, Finnhub, Supabase | Same + **FRED (free)** + optional Polygon Options |
| Universe | S&P 500 (468) | S&P 500 + **sector-normalized rankings** |
| Lookahead protection | Ad hoc | **Enforced via `as_of_ts` column** in every feature |

---

## 1. Rollout Phases

| Phase | Scope | New Cost | Effort | Lift estimate |
|---|---|---|---|---|
| **A** | Expand factors using existing data only (Polygon + FMP + Finnhub) | $0 | 2–3 wks | Moderate |
| **B** | Add Macro Context factor via FRED | $0 (free API) | 1 wk | Moderate (regime-dependent) |
| **C** | Add Options Flow factor (Polygon Options add-on) | ~$99/mo | 2 wks | High for short-horizon signals |
| **D** | Replace weighted sum with LightGBM ensemble + meta-learner | Compute only | 4–6 wks | High (but requires ≥1 yr labeled history) |

Ship A and B before D. Don't train ML on weak features.

---

## 2. Factor Weights (v3)

Ten factors, weights sum to 100%. Regime-gated (§4): weights shift with market state.

| Factor | Base Weight | Bull | Bear | Chop | New in v3 |
|---|---|---|---|---|---|
| Momentum | 18% | 22% | 10% | 16% | |
| Volume | 10% | 12% | 8% | 10% | |
| News Catalyst | 12% | 13% | 10% | 14% | |
| Fundamentals | 15% | 12% | 20% | 16% | |
| Sentiment | 8% | 9% | 8% | 8% | |
| Trend | 10% | 12% | 6% | 8% | |
| Risk | 10% | 6% | 16% | 12% | |
| **Cross-Sectional Rank** | **7%** | 7% | 8% | 8% | ✅ |
| **Estimate Revisions** | **6%** | 5% | 8% | 5% | ✅ |
| **Macro Context** | **4%** | 2% | 6% | 3% | ✅ (Phase B) |

Weights are config-driven in `backend/config/scoring_weights.yaml` so you can tune
per regime without a code release.

---

## 3. New Algorithms (11 → 18)

### 11. EPS Estimate Revision Breadth ⭐ *(Phase A, high-alpha)*
Count analyst EPS estimate upgrades vs downgrades over last 30d and 90d. Net revision
ratio = (up − down) / total. This is one of the most persistent alpha factors
documented in academic literature (Stickel 1991, Chan Jegadeesh Lakonishok 1996) —
and it's underused by retail platforms. **Data:** FMP `/stable/analyst-estimates`
with date cursor. Compute breadth delta week-over-week.

### 12. Multi-Timeframe RSI Consensus *(Phase A)*
v2 uses one RSI. v3 uses RSI at 5 / 14 / 50 periods. A signal is only strong when at
least 2 of 3 agree. Prevents whipsaws from 14-period RSI alone.

### 13. VWAP Deviation & Anchored VWAP *(Phase A)*
Distance from session VWAP, 5d VWAP, and VWAPs anchored from last earnings, 52-week
high, 52-week low. Anchored VWAPs are where institutions calculate P&L — they act as
real support/resistance and often beat raw price levels for entry zones.

### 14. Sector-Relative Strength *(Phase A)*
Stock return − sector ETF return, 5d / 20d / 60d. A stock up 2% when its sector is up
5% is **weak**. v2 misses this entirely. Requires ticker → sector ETF mapping
(XLK/XLF/XLE/etc.), stored in `backend/data/sector_map.json`.

### 15. GARCH(1,1) Volatility Forecast *(Phase A)*
1-day-ahead vol forecast beats realized vol for risk scaling. Use `arch` Python
library. Feed forecast into the Risk factor to widen stops during expected vol
expansion. Cheap to compute (<1ms per ticker).

### 16. Earnings Drift Pattern (per-ticker) *(Phase A)*
v2 has generic PEAD. v3 computes each ticker's **historical** post-earnings drift
pattern (last 8 quarters): does this specific stock drift 3 days / 10 days / 60 days
after a beat? Some tickers don't drift. Stores pattern in Supabase
`ticker_earnings_profile` table.

### 17. Short Interest Squeeze Detector *(Phase A)*
Days-to-cover (short interest / avg daily volume) combined with price % from 50-day
high. High short interest + breakout from base = squeeze candidate. **Data:**
Finnhub `/stock/short-interest` (may require upgrade to Finnhub paid tier — check
current plan).

### 18. Macro Regime Signal *(Phase B, free)*
Composite of 4 macro inputs, all free via FRED:
- UST 10Y yield level + 1-week change (`DGS10`)
- 2s10s curve (`T10Y2Y`) — recession canary
- DXY 20-day trend (`DTWEXBGS`)
- High-yield credit spread (`BAMLH0A0HYM2`) — early risk-off signal

Emits a single `macro_regime` score ∈ {−2 … +2} that's used directly in the Macro
Context factor and **also** adjusts the regime classifier (§4).

---

## 4. Regime-Aware Scoring

v2 has "Market Regime Awareness" as algorithm #8 (SPY MA50/MA200). v3 promotes regime
to a **first-class gating layer** that affects weights, thresholds, and confidence.

```
Regime Classifier inputs:
  - SPY trend (MA50 vs MA200)                    [v2 already has]
  - VIX level + VIX term structure (VIX/VIX9D)   [new, Polygon or FRED]
  - Market breadth (% S&P 500 above 50d MA)      [computed in-engine]
  - HY credit spread trend                       [Phase B / FRED]

Regimes: trending_bull, trending_bear, chop_low_vol, chop_high_vol
```

Effects:
- **Weights shift** (§2 table)
- **BUY_TODAY threshold raises** to 82 in `trending_bear` and `chop_high_vol`
- **Confidence penalty** of −15% for signals emitted within 3 trading days of a
  regime transition (most signal failures happen here)

---

## 5. Cross-Sectional Ranking (new factor)

Every numeric feature gets a second representation: its percentile rank within
sector on that date. Absolute values mislead across sectors (a 15 P/E is cheap for
tech, expensive for utilities).

**Implementation:**
```sql
-- After nightly feature compute, populate:
INSERT INTO feature_ranks (ticker, date, feature, sector_rank, market_rank)
SELECT
  ticker, date, feature,
  PERCENT_RANK() OVER (PARTITION BY sector, date ORDER BY value) AS sector_rank,
  PERCENT_RANK() OVER (PARTITION BY date ORDER BY value)         AS market_rank
FROM features
WHERE date = CURRENT_DATE;
```

Cross-Sectional Rank factor score = composite of sector-rank percentiles for
momentum, volume, fundamentals, and revisions. Rewards stocks that look strong
**relative to peers**, not just on absolute numbers.

---

## 6. Feature Store Discipline *(non-negotiable in v3)*

Every feature row carries an `as_of_ts` = the timestamp at which the value would
have been knowable in real time.

- Fundamentals from FMP → `as_of_ts` = filing date (NOT fiscal period end)
- News sentiment → `as_of_ts` = publish timestamp
- Analyst revisions → `as_of_ts` = revision date
- OHLCV → `as_of_ts` = 16:00 ET on the bar date

Backtests must filter on `as_of_ts <= backtest_date` or the backtest is lying.
This is the single most common failure mode in retail signal platforms.

Schema:
```sql
CREATE TABLE features (
  ticker        VARCHAR(10) NOT NULL,
  date          DATE        NOT NULL,
  feature_name  VARCHAR(64) NOT NULL,
  value         NUMERIC,
  as_of_ts      TIMESTAMPTZ NOT NULL,
  source        VARCHAR(32),
  PRIMARY KEY (ticker, date, feature_name)
);
CREATE INDEX idx_features_asof ON features (as_of_ts);
```

---

## 7. Updated Signal Thresholds

| Score | Signal Type | v2 | v3 | Notes |
|---|---|---|---|---|
| ≥ 80 | BUY_TODAY | ≥78 | **≥80** (≥82 in bear/high-vol) | Raised — v3 has more factors, easier to hit high scores |
| 60–79 | WATCH | 58–77 | 60–79 | |
| 40–59 | HIGH_RISK | 38–57 | — | Not published |
| < 40 | AVOID | <38 | — | Not published |

Additional filter: **BUY_TODAY requires Cross-Sectional Rank ≥ 70** (must be top
30% of sector). Prevents emitting "high score but weak vs peers" signals.

---

## 8. Trade Zone v3 — Volatility-Adaptive

Existing ATR logic is kept. Three refinements:

1. **Stop uses GARCH-forecasted ATR**, not trailing ATR, when forecast > trailing.
   Protects against vol expansion after a catalyst.
2. **Entry zone snaps to nearest Anchored VWAP** if within 0.5 × ATR of it — these
   are natural institutional entry levels.
3. **Target ladders**: instead of one target, emit T1 / T2 / T3 at 1R / 2R / 3R.
   Lets the UI show a scale-out plan, not a single "sell here" line.

---

## 9. Per-Algorithm Information Coefficient Tracking

New table: `algorithm_ic_history`. Every trading day, after market close, compute
the information coefficient (Spearman rank correlation between algorithm score and
forward 5-day return) for each of the 18 algorithms, per regime.

```sql
CREATE TABLE algorithm_ic_history (
  date       DATE NOT NULL,
  algorithm  VARCHAR(64) NOT NULL,
  regime     VARCHAR(32) NOT NULL,
  ic_5d      NUMERIC,
  ic_21d     NUMERIC,
  n_tickers  INT,
  PRIMARY KEY (date, algorithm, regime)
);
```

After 90 days of history, auto-suggest weight adjustments in a weekly report.
After 1 year, you have the labeled dataset needed for Phase D (ML meta-learner).

---

## 10. Phase D Preview — ML Meta-Learner (later)

Once Phase A–C are shipped and you have ≥6 months of IC history:

- Keep the 18 algorithm scores as **base features**
- Train LightGBM to predict P(forward 5d return > 1.5 × ATR), **per regime**
- Blend with v3 weighted sum 50/50 for first 60 days to de-risk cutover
- Validate with **walk-forward** + **purged cross-validation** (López de Prado).
  Never k-fold on time-series data.
- Report Sharpe, Sortino, max drawdown, Calmar, and **hit-rate by regime**

Don't start D until A–C are stable and producing ≥6 months of clean feature store
data. ML on bad features amplifies bad signals.

---

## 11. Migration Checklist

- [ ] Create `features` and `feature_ranks` tables with `as_of_ts`
- [ ] Backfill 2 years of v2 features into new schema (one-off job)
- [ ] Implement algorithms 11–14 (Phase A, no new data)
- [ ] Add `ticker → sector ETF` mapping config
- [ ] Implement algorithms 15–17 (Phase A, existing APIs)
- [ ] Add FRED client for algorithm 18 (Phase B)
- [ ] Wire regime classifier into scoring pipeline
- [ ] Update BUY_TODAY threshold + cross-sectional rank filter
- [ ] Ship target ladders (T1/T2/T3) to Next.js signal card UI
- [ ] Stand up `algorithm_ic_history` nightly job
- [ ] Add scoring_weights.yaml + per-regime weight tuning
- [ ] Evaluate Polygon Options add-on (Phase C decision)
- [ ] Collect 6 months of IC data before attempting Phase D

---

## 12. File / Module Layout (suggested)

```
backend/
  scoring/
    engine.py              # orchestrator (replaces v2 scorer)
    regime.py              # regime classifier
    factors/
      momentum.py
      volume.py
      catalyst.py
      fundamentals.py
      sentiment.py
      trend.py
      risk.py
      cross_sectional.py   # NEW
      revisions.py         # NEW
      macro.py             # NEW (Phase B)
    algorithms/
      # ...existing 10 modules + 8 new modules
  features/
    store.py               # as_of_ts enforcement
    compute.py             # nightly feature job
    ranks.py               # cross-sectional ranking
  data/
    fred_client.py         # NEW (Phase B)
    sector_map.json        # NEW
  config/
    scoring_weights.yaml   # NEW, regime-aware weights
```

---

## 13. What v3 Will Feel Like for Users

- Signals are **fewer but stronger** — 15–25 per scan vs 20–30
- Signal cards show **why** (top 3 contributing algorithms + regime context)
- During bear/high-vol regimes, watch-list grows, buy-today shrinks
- Target ladders give a real trade plan, not a single exit price
- "Strong vs sector" badge on signals with Cross-Sectional Rank ≥ 80
- Weekly regime update posted to the feed by Athena
