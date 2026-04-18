-- ============================================================================
-- Fintrest Signal Engine v3 — Milestone 1: Feature Store Foundation
-- Migration: 001_feature_store
-- Target:    PostgreSQL 14+ (Supabase-compatible)
-- Applies:   additive only, no changes to existing v2 tables
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- features
-- Every numerical feature, keyed by (ticker, trade_date, feature_name).
-- as_of_ts is the REAL-TIME KNOWABILITY TIMESTAMP — when this value would have
-- been available to the engine if it were running live on `trade_date`. This
-- column is the single most important lookahead defence in the system.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS features (
    ticker        VARCHAR(10)    NOT NULL,
    trade_date    DATE           NOT NULL,
    feature_name  VARCHAR(64)    NOT NULL,
    value         NUMERIC,
    as_of_ts      TIMESTAMPTZ    NOT NULL,
    source        VARCHAR(32)    NOT NULL,      -- 'polygon' | 'fmp' | 'fmp_estimated_lag' | 'finnhub' | 'fred' | 'computed'
    computed_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (ticker, trade_date, feature_name)
);

COMMENT ON COLUMN features.as_of_ts IS
    'Timestamp at which this value would have been knowable in real time. For FMP fundamentals use fillingDate; if fillingDate is NULL, use period_end + 45 days and set source = fmp_estimated_lag. For OHLCV use 16:00 ET on the bar date. For news use publish timestamp.';

CREATE INDEX IF NOT EXISTS idx_features_asof
    ON features (as_of_ts);
CREATE INDEX IF NOT EXISTS idx_features_date_name
    ON features (trade_date, feature_name);
CREATE INDEX IF NOT EXISTS idx_features_ticker_name
    ON features (ticker, feature_name);


-- ----------------------------------------------------------------------------
-- feature_ranks
-- Cross-sectional percentile ranks for each feature, within sector and within
-- the full universe. Populated by a nightly job AFTER features is loaded.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_ranks (
    ticker        VARCHAR(10)  NOT NULL,
    trade_date    DATE         NOT NULL,
    feature_name  VARCHAR(64)  NOT NULL,
    sector        VARCHAR(48),                     -- GICS sector label from stocks.sector
    sector_rank   NUMERIC,                          -- 0.0 – 1.0 percentile within sector
    market_rank   NUMERIC,                          -- 0.0 – 1.0 percentile within full universe
    computed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (ticker, trade_date, feature_name)
);

CREATE INDEX IF NOT EXISTS idx_feature_ranks_date_name
    ON feature_ranks (trade_date, feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_ranks_sector_date
    ON feature_ranks (sector, trade_date);


-- ----------------------------------------------------------------------------
-- algorithm_ic_history
-- Daily information coefficient (Spearman rank correlation) between each
-- algorithm score and forward return, computed per regime. Feeds the weekly
-- weight-tuning report and, eventually, the Phase-D ML meta-learner.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS algorithm_ic_history (
    trade_date    DATE         NOT NULL,
    algorithm     VARCHAR(64)  NOT NULL,
    regime        VARCHAR(32)  NOT NULL,
    ic_5d         NUMERIC,
    ic_21d        NUMERIC,
    n_tickers     INT,
    computed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (trade_date, algorithm, regime)
);


-- ----------------------------------------------------------------------------
-- ticker_earnings_profile
-- Per-ticker historical post-earnings drift pattern (algorithm 16).
-- Updated after each earnings release; drift windows measured on last 8 beats.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticker_earnings_profile (
    ticker           VARCHAR(10)  PRIMARY KEY,
    drift_3d_mean    NUMERIC,
    drift_10d_mean   NUMERIC,
    drift_60d_mean   NUMERIC,
    drift_3d_stddev  NUMERIC,
    drift_10d_stddev NUMERIC,
    beat_rate        NUMERIC,                 -- 0.0 – 1.0 over sample_size
    sample_size      INT,
    last_earnings    DATE,
    last_updated     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ----------------------------------------------------------------------------
-- regime_history
-- Daily regime classification output, one row per trade_date. Keep forever —
-- this is the dataset the Phase-D ML retraining will regime-stratify on.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regime_history (
    trade_date      DATE         PRIMARY KEY,
    regime          VARCHAR(32)  NOT NULL,       -- trending_bull | trending_bear | chop_low_vol | chop_high_vol
    spy_trend       VARCHAR(16),                 -- up | down | flat
    vix_level       NUMERIC,
    vix_term_ratio  NUMERIC,                     -- VIX / VIX9D
    breadth_pct     NUMERIC,                     -- fraction of S&P 500 above 50-day MA
    hy_spread       NUMERIC,                     -- HY OAS from FRED BAMLH0A0HYM2
    is_transition   BOOLEAN      NOT NULL DEFAULT FALSE,
    computed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ----------------------------------------------------------------------------
-- Safety: refuse inserts where as_of_ts postdates the trade_date close.
-- Prevents the #1 backtest leak (using future-dated feature values).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_features_as_of_ts()
RETURNS TRIGGER AS $$
DECLARE
    session_close TIMESTAMPTZ;
BEGIN
    -- 16:00 America/New_York on the trade_date
    session_close := (NEW.trade_date::text || ' 16:00:00 America/New_York')::timestamptz;
    IF NEW.as_of_ts > session_close THEN
        RAISE EXCEPTION
            'Lookahead violation: as_of_ts (%) > session close for trade_date (%) = %',
            NEW.as_of_ts, NEW.trade_date, session_close;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_features_asof_check ON features;
CREATE TRIGGER trg_features_asof_check
    BEFORE INSERT OR UPDATE ON features
    FOR EACH ROW EXECUTE FUNCTION check_features_as_of_ts();

COMMIT;

-- ============================================================================
-- Rollback (save separately as 001_feature_store_rollback.sql):
--
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_features_asof_check ON features;
-- DROP FUNCTION IF EXISTS check_features_as_of_ts();
-- DROP TABLE IF EXISTS regime_history;
-- DROP TABLE IF EXISTS ticker_earnings_profile;
-- DROP TABLE IF EXISTS algorithm_ic_history;
-- DROP TABLE IF EXISTS feature_ranks;
-- DROP TABLE IF EXISTS features;
-- COMMIT;
-- ============================================================================
