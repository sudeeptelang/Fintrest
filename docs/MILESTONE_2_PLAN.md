# Milestone 2 — Feature Population: Plan

**Goal:** nightly 6:30 AM ET batch populates `features` and `feature_ranks` for all v3 A+B algorithms, against the dev Supabase first, then prod. Live signals continue to use v2 logic — **no scoring changes in M2.**

**Entry criteria:** M1 complete (schema applied, config merged, sector map merged).

**Exit criteria:** 30 consecutive green nightly runs on dev, feature coverage ≥ 98% across the universe, v2-carryover features match live v2 in-memory values within rounding tolerance.

---

## 1. Sub-Milestones

| Sub | Name | Duration | Depends on |
|---|---|---|---|
| **M2.1** | Scaffolding + v2 carryover features | 1 wk | M1 |
| **M2.2** | Phase A new features (6 algorithms) | 1–1.5 wks | M2.1 |
| **M2.3** | Phase B macro feature (FRED) | 3–4 days | M2.1 |
| **M2.4** | Nightly `feature_ranks` job | 3–4 days | M2.1 + at least one of M2.2/M2.3 |
| **M2.5** | Dry run + validation | 2–3 days | M2.1–M2.4 |

**Total: ~3 weeks.** M2.2 and M2.3 can run in parallel if you have bandwidth; otherwise sequential.

---

## 2. Decisions Needed Before Coding

### 2.1 Scheduler

**Answer (from repo):** Custom `IHostedService` + `Timer` pattern. The v2 scan runs inside `backend/Fintrest.Api/Services/Pipeline/DailyCronJob.cs` (6:30 AM ET Mon–Fri). Additional hosted services already live alongside it: `IntradayDriftJob`, `MorningBriefingJob`.

**Decision:** follow the same pattern for M2. Add a new `FeaturePopulationJob : IHostedService` that ticks every minute and fires at, say, 5:45 AM ET so it completes BEFORE the v2 scan at 6:30. That way the v2 scan at 6:30 can already read features from the store if any v3 wiring lands later.

No Hangfire / Quartz / Azure Functions — don't introduce a new scheduler.

---

### 2.2 Data access

**Answer (from repo):** EF Core via `AppDbContext` everywhere; no Dapper, no raw Npgsql `COPY` usage exists yet (confirmed via grep).

**Decision:**
- **Reads + small writes** (`ticker_earnings_profile`, `regime_history`, config lookups) → keep EF Core
- **Bulk writes** (`features` ~28k rows/night, `feature_ranks` same) → introduce Npgsql `COPY` via a new `FeatureBulkRepository` in `Services/Scoring/V3/`

Adding bulk COPY doesn't require a new package — `Npgsql.EntityFrameworkCore.PostgreSQL` already pulls `Npgsql` transitively, so we get `NpgsqlBinaryImporter` for free.

---

### 2.3 Project layout

**Answer:** Single project `backend/Fintrest.Api`. No separate solution structure. All v3 work lives under `Services/Scoring/V3/`:

```
backend/Fintrest.Api/
  Services/
    Scoring/
      V3/
        FeatureStore.cs          ← M1
        SectorMap.cs             ← M1
        AsOfTsResolver.cs        ← M1
        # M2 adds:
        FeatureBulkRepository.cs    ← Npgsql COPY bulk writer
        FeaturePopulationJob.cs     ← IHostedService @ 5:45 AM ET
        FeatureComputationContext.cs ← passed to every IFeature
        IFeature.cs                  ← interface every algo implements
        Features/
          Momentum/Roc5d.cs, Roc20d.cs, Roc60d.cs, Rsi14.cs, ...
          Volume/RelativeVolume.cs, VolumeZScore.cs, ...
          Revisions/EpsRevisionBreadth.cs           ← Phase A
          Sector/SectorRelativeStrength.cs          ← Phase A
          Risk/EwmaVolatility.cs                    ← Phase A (see 2.4)
          Catalyst/TickerEarningsDriftPattern.cs    ← Phase A
          Sentiment/ShortInterestSqueeze.cs         ← Phase A (may defer, see §4.3)
          Trend/AnchoredVwap.cs                     ← Phase A
          Macro/MacroRegimeSignal.cs                ← Phase B
        Ranks/
          CrossSectionalRankJob.cs                  ← M2.4
        Observability/
          FeatureRunLog.cs + model                  ← M2.1 supplemental migration
```

---

### 2.4 GARCH vs EWMA volatility forecast

**Decision: EWMA (RiskMetrics λ=0.94).** 20 LOC, no numerical-optimization risk, captures ~85% of GARCH's value.

Action item: rename `garch_volatility_forecast` to `ewma_volatility_forecast` in `Config/scoring_weights_v3.yaml` when M2.2 lands. Revisit GARCH only if EWMA IC is weak after 90 days of tracking.

---

### 2.5 Backfill depth

One-time backfill on first M2 deploy. Depth per feature:

| Feature | Minimum lookback |
|---|---|
| EPS revision breadth | 90 days of FMP analyst estimates |
| Sector-relative strength | 60 days of sector ETF bars |
| EWMA volatility | 60 days of returns |
| Anchored VWAP | back to last earnings / 52-week high / low |
| Short interest squeeze | 2 cycles of Finnhub short-interest |
| **Earnings drift profile** | **8 earnings releases (~2 years)** — largest |
| Macro regime signal | 90 days of FRED series |

**Backfill window:** 2 years. Polygon Starter gives exactly 2 years of history; FMP Premier has 30+ years so won't be the constraint. Backfill is a separate CLI-invocable task, not scheduled.

---

### 2.6 Feature versioning + recomputation

- **Bug fix to existing feature** → recompute history over the window the bug affected (option b from the original plan)
- **Breaking semantic change** → bump version suffix: `rsi_14` → `rsi_14_v2`. Keep old values so IC history isn't contaminated (option c)

Every `IFeature` declares a `const string Version` — bumping it triggers a backfill.

---

### 2.7 Observability

New table via M2.1 supplemental migration (`015_feature_run_log.sql`):

```sql
CREATE TABLE feature_run_log (
    run_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    universe_size   INT,
    rows_written    JSONB,       -- { "rsi_14": 468, "eps_revisions_30d": 465, ... }
    error_count     JSONB,       -- { "feature_name": count }
    sector_fallbacks INT,         -- unresolved sector labels → SPY
    provider_calls  JSONB,       -- { "polygon": N, "fmp": N, "finnhub": N, "fred": N }
    status          TEXT         -- 'running' | 'green' | 'yellow' | 'red'
);
```

Green threshold: every feature has `rows_written ≥ 0.98 × universe_size` AND `error_count ≤ 5`.

---

## 3. Sub-Milestone Detail

### M2.1 — Scaffolding + v2 carryover

- `IFeature` interface, `FeatureValue` record, `FeatureComputationContext`
- `FeatureBulkRepository` via Npgsql `COPY BINARY`
- `FeaturePopulationJob : IHostedService` tick @ 5:45 AM ET
- `015_feature_run_log.sql` supplemental migration
- ~20 v2-carryover features: ROC 5/20/60, RSI 14, ATR 14, ADX 14, MA50, MA200, BB width, volume z-scores, 52w high/low distance, etc.
- CLI command: `dotnet run -- features populate --date YYYY-MM-DD --ticker XXX`
- Dry run on dev: one trade date, full universe, all carryover features

**Exit:** v2 carryover features match v2 in-memory scorer output within rounding tolerance. This is the critical correctness check.

### M2.2 — Phase A new features

| Feature | Notable complexity |
|---|---|
| EPS revision breadth | FMP analyst-estimates pagination; net revision ratio 30d / 90d |
| Sector-relative strength | Cache XL* + SPY bars once per run; pass to each ticker's context |
| EWMA volatility | Pure compute |
| Anchored VWAP | 3 anchors (earnings, 52w high, 52w low) |
| Short interest squeeze | Finnhub access pending (see §4.3) |
| Ticker earnings drift profile | Backfill 2 yrs × 8 releases × 468 tickers → `ticker_earnings_profile` |

### M2.3 — Phase B macro feature

- `FredClient` typed HttpClient with 4-hour cache
- Pull DGS10, T10Y2Y, DTWEXBGS, BAMLH0A0HYM2
- Composite `macro_regime_signal` ∈ [−2, +2]
- Also writes daily `regime_history.hy_spread`

### M2.4 — Nightly `feature_ranks` job

- Fires after M2.1–M2.3 complete
- One SQL statement: `PERCENT_RANK() OVER (PARTITION BY sector, trade_date ORDER BY value)` and same partitioned by `trade_date` only for market rank
- ~30 seconds for 28k rows

### M2.5 — Dry run + validation

- 30-day green streak on dev
- `feature_coverage_report` query — coverage % per feature per day
- Manual recompute of 10 random (ticker, date, feature) tuples vs stored
- Green → schedule prod apply for weekend

---

## 4. Risks

1. **FMP `fillingDate` coverage** — still open from M1. If > 10% null, the `+45d estimated-lag` fallback needs unit tests + README note. Spot-check before M2.2 starts.

2. **FMP analyst estimates endpoint** — wrap in retry with exponential backoff; cache 24h.

3. **Finnhub short-interest** — NOT currently called in our Finnhub provider (confirmed via grep — we only hit `/company-news`, `/stock/insider-transactions`, `/stock/recommendation`). Free tier almost certainly lacks `/stock/short-interest`. Decision: tag `short_interest_squeeze` as OPTIONAL in M2.2; ship without if Finnhub plan blocks it. Add later via a paid tier upgrade or Quiver Quant.

4. **Parallel.ForEachAsync + `COPY`** — parallelism in compute, single-thread bulk write. `IFeatureRepository.BulkInsert` takes a pre-built batch, not per-ticker calls.

5. **Sector ETF bars caching** — pull XL* + SPY once at top of run, pass into each ticker's context. Don't re-fetch 468 times.

---

## 5. Answers to Open Questions (from repo scan)

| # | Question | Answer |
|---|---|---|
| 1 | Scheduler in use? | Custom `IHostedService` + `Timer`, e.g. `DailyCronJob`. Follow same pattern. No new scheduler. |
| 2 | Data access library? | EF Core everywhere today. **Introduce Npgsql `COPY`** for bulk feature writes (already transitive via Npgsql.EFCore.PG). |
| 3 | Project layout? | Single project `backend/Fintrest.Api`. V3 work stays under `Services/Scoring/V3/`. |
| 4 | FMP `fillingDate` spot-check % populated? | **PENDING** — user to spot-check. Script: `SELECT COUNT(*) FILTER (WHERE filling_date IS NULL) * 100.0 / COUNT(*) FROM fundamentals;` |
| 5 | `stocks.sector` labels outside 11 + aliases? | **PENDING** — user to run: `SELECT sector, COUNT(*) FROM stocks WHERE active GROUP BY sector ORDER BY 2 DESC;` |
| 6 | Finnhub plan / short-interest access? | **PENDING user confirm.** Currently unused. Likely free-tier blocked. If blocked, defer `short_interest_squeeze`. |
| 7 | FRED API key registered? | **PENDING.** Free at https://fred.stlouisfed.org/docs/api/api_key.html. Add to `appsettings.Development.json` as `Providers:Fred:ApiKey`. |
| 8 | Backfill window? | 2 years. Polygon Starter = 2yr history (constraint), FMP Premier = 30yr (not a constraint). |

Once 4, 5, 6, 7 are answered, M2.1 can start with concrete interfaces.
