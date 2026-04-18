-- Migration 014: Signal Engine v3 — Foundation
-- ============================================================================
-- Adds four tables that power the v3 scoring upgrade (docs/SIGNALS_V3.md):
--
--   1. features               — time-series feature store. Every row carries
--                               `as_of_ts` — the timestamp the value would have
--                               been knowable in real time. This is the single
--                               most important column for honest backtesting.
--
--   2. feature_ranks          — cross-sectional percentile ranks per feature,
--                               both sector-relative and market-wide. Rewards
--                               stocks that look strong vs peers, not just on
--                               absolute numbers.
--
--   3. ticker_earnings_profile — per-ticker historical post-earnings drift
--                                pattern (3d / 10d / 60d). Replaces v2's
--                                generic PEAD with a per-stock profile.
--
--   4. algorithm_ic_history   — nightly Information Coefficient (Spearman rank
--                               correlation between algo score and forward
--                               return) per algorithm, per regime. Feeds weekly
--                               weight-tuning reports and future ML meta-learner.
--
-- Shipping this migration DOES NOT change live scoring behavior. The v2 engine
-- continues to run unchanged. Tables are empty until Milestone 2+ writes to
-- them. Safe to roll back by dropping the four tables.
--
-- Run in Supabase SQL Editor. Idempotent via IF NOT EXISTS.
-- ============================================================================


-- 1. features — time-series feature store with as_of_ts enforcement
CREATE TABLE IF NOT EXISTS features (
    ticker        VARCHAR(12)  NOT NULL,
    date          DATE         NOT NULL,
    feature_name  VARCHAR(64)  NOT NULL,
    value         NUMERIC,
    as_of_ts      TIMESTAMPTZ  NOT NULL,
    source        VARCHAR(32),
    PRIMARY KEY (ticker, date, feature_name)
);
CREATE INDEX IF NOT EXISTS idx_features_asof         ON features (as_of_ts);
CREATE INDEX IF NOT EXISTS idx_features_date_feature ON features (date, feature_name);
CREATE INDEX IF NOT EXISTS idx_features_ticker_date  ON features (ticker, date DESC);
ALTER TABLE features ENABLE ROW LEVEL SECURITY;


-- 2. feature_ranks — sector + market percentile ranks per feature per date
CREATE TABLE IF NOT EXISTS feature_ranks (
    ticker        VARCHAR(12)  NOT NULL,
    date          DATE         NOT NULL,
    feature_name  VARCHAR(64)  NOT NULL,
    sector_rank   NUMERIC,      -- 0.0 .. 1.0 percentile within sector on this date
    market_rank   NUMERIC,      -- 0.0 .. 1.0 percentile across full universe
    PRIMARY KEY (ticker, date, feature_name)
);
CREATE INDEX IF NOT EXISTS idx_feature_ranks_date_feature ON feature_ranks (date, feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_ranks_ticker_date  ON feature_ranks (ticker, date DESC);
ALTER TABLE feature_ranks ENABLE ROW LEVEL SECURITY;


-- 3. ticker_earnings_profile — per-ticker historical drift pattern
CREATE TABLE IF NOT EXISTS ticker_earnings_profile (
    ticker            VARCHAR(12) NOT NULL PRIMARY KEY,
    beats_count       INT         NOT NULL DEFAULT 0,
    misses_count      INT         NOT NULL DEFAULT 0,
    avg_drift_3d      NUMERIC,   -- avg 3-day return after earnings beat (%)
    avg_drift_10d     NUMERIC,   -- avg 10-day return after earnings beat (%)
    avg_drift_60d     NUMERIC,   -- avg 60-day return after earnings beat (%)
    drift_consistency NUMERIC,   -- 0..1 — fraction of beats that drifted positive
    last_earnings_at  TIMESTAMPTZ,
    sample_quarters   INT         NOT NULL DEFAULT 0,  -- how many quarters computed from
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ticker_earnings_profile_updated ON ticker_earnings_profile (updated_at DESC);
ALTER TABLE ticker_earnings_profile ENABLE ROW LEVEL SECURITY;


-- 4. algorithm_ic_history — nightly IC per algorithm per regime
CREATE TABLE IF NOT EXISTS algorithm_ic_history (
    date          DATE         NOT NULL,
    algorithm     VARCHAR(64)  NOT NULL,   -- e.g. "momentum_roc_20", "eps_revision_breadth"
    regime        VARCHAR(32)  NOT NULL,   -- "trending_bull" | "trending_bear" | "chop_low_vol" | "chop_high_vol"
    ic_5d         NUMERIC,                  -- Spearman corr between score and 5-day forward return
    ic_21d        NUMERIC,                  -- Spearman corr between score and 21-day forward return
    n_tickers     INT          NOT NULL,   -- sample size backing the IC
    PRIMARY KEY (date, algorithm, regime)
);
CREATE INDEX IF NOT EXISTS idx_algo_ic_algorithm_date ON algorithm_ic_history (algorithm, date DESC);
CREATE INDEX IF NOT EXISTS idx_algo_ic_regime_date    ON algorithm_ic_history (regime, date DESC);
ALTER TABLE algorithm_ic_history ENABLE ROW LEVEL SECURITY;
