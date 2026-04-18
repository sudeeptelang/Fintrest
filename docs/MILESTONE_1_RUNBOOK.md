# Milestone 1 — Foundation: Runbook

**Scope:** Schema + config + sector map. No touch to live scoring. Low-risk, unblocks M2–M5.

**Phases committed:** A (existing-data factors) + B (macro via FRED). Phase C (options flow) and Phase D (ML meta-learner) are deferred.

---

## 1. File Placement

| File | Destination in repo |
|---|---|
| `001_feature_store.sql` | `db/migrations/001_feature_store.sql` |
| `scoring_weights.yaml` | `backend/Fintrest.Api/Config/scoring_weights.yaml` *(or wherever existing `appsettings.*` configs live)* |
| `sector_etf_map.json` | `backend/Fintrest.Api/Config/sector_etf_map.json` |

If your .NET project uses `appsettings.json`-only configs, the YAML can be converted — contents are a pure POCO shape. Let me know and I'll emit a C# `ScoringWeightsOptions` class bound to an `IOptions<T>`.

---

## 2. Apply Order

1. **Back up Supabase Postgres** (full snapshot).
2. **Apply `001_feature_store.sql`** against your Supabase dev project first. It's additive — no existing v2 tables are touched.
3. **Verify tables exist** (see §4).
4. **Commit the YAML and JSON** to the repo; don't wire them to the live scorer yet — that's M3.
5. **Apply migration to Supabase prod** only after dev validation and after M2 population jobs pass dry-run.

---

## 3. What This Does NOT Do

- Does not read from any data provider
- Does not compute any feature
- Does not change the v2 scoring output
- Does not affect signals currently published to users

It's a schema + config landing pad. The nightly jobs that populate it come in M2.

---

## 4. Validation — Run After Migration

All queries should return rows / zero errors:

```sql
-- Tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'features','feature_ranks','algorithm_ic_history',
    'ticker_earnings_profile','regime_history'
  );
-- Expected: 5 rows

-- Lookahead trigger is armed
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_features_asof_check';
-- Expected: 1 row

-- Lookahead trigger actually rejects bad inserts (should ERROR)
INSERT INTO features (ticker, trade_date, feature_name, value, as_of_ts, source)
VALUES ('TEST', CURRENT_DATE, 'unit_test', 1.0,
        (CURRENT_DATE + INTERVAL '2 days')::timestamptz, 'computed');
-- Expected: ERROR — "Lookahead violation: as_of_ts (...) > session close ..."

-- Legal insert passes
INSERT INTO features (ticker, trade_date, feature_name, value, as_of_ts, source)
VALUES ('TEST', CURRENT_DATE - 5, 'unit_test', 1.0,
        (CURRENT_DATE - 5)::timestamptz + INTERVAL '15 hours', 'computed');
-- Expected: INSERT 0 1

DELETE FROM features WHERE ticker = 'TEST';
```

---

## 5. Done Criteria

- [ ] Migration applied successfully to Supabase dev
- [ ] All 5 tables present
- [ ] Lookahead trigger rejects future-dated inserts (error shown above)
- [ ] `scoring_weights.yaml` merged to main, CI validates each regime block sums to 1.0
- [ ] `sector_etf_map.json` merged to main, CI validates all 11 GICS sectors present
- [ ] Migration applied to Supabase prod with before/after snapshot diff reviewed

**CI validation sketch** (add to existing pipeline — language-agnostic, can be a Python or shell script or a .NET xUnit test):

```python
# Regime weight sum check
import yaml, sys
cfg = yaml.safe_load(open("scoring_weights.yaml"))
for name, block in cfg["regimes"].items():
    total = round(sum(block.values()), 6)
    assert total == 1.0, f"Regime '{name}' weights sum to {total}, expected 1.0"
print("OK: all regimes sum to 1.0")
```

---

## 6. Open Questions to Resolve Before M2

1. **FMP `fillingDate` coverage** — spot-check 20 random S&P 500 tickers in `/stable/income-statement`. How many return `fillingDate` vs null? If > 10% null, plan the `+45 day` estimated-lag fallback now.
2. **Supabase `stocks.sector` cleanliness** — run `SELECT DISTINCT sector FROM stocks;`. Any values that don't appear in `sector_etf_map.json` either as a canonical key or an alias need to be added to `label_aliases` in the JSON.
3. **FRED API key** — register for free at fred.stlouisfed.org. Store in existing secrets manager (same place as Polygon / FMP / Finnhub keys).

---

## 7. Next — Milestone 2 Preview

**M2: Feature Population** (2–3 weeks)

Wire the nightly 6:30 AM ET batch to populate `features` with v2's existing 10-algorithm inputs first — prove the store works end-to-end against known values. Then layer in v3 Phase A algorithms (EPS revision breadth, sector-relative strength, GARCH vol, anchored VWAP, short interest squeeze, earnings drift profile). Phase B (macro via FRED) comes last in M2 since it's the simplest.

No live scoring changes yet. Live signals still use v2 logic.

Tell me when M1 is green and I'll draft M2 with the feature computation modules (in C# against your .NET stack this time).
