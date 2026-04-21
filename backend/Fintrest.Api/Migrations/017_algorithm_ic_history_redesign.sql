-- ============================================================================
-- Fintrest Signal Engine v3 — IC history schema redesign for §14.0
-- Migration: 017_algorithm_ic_history_redesign
-- Target:    PostgreSQL 14+ (Supabase-compatible)
-- Applies:   reshapes algorithm_ic_history — adds sector / horizon_days as
--            first-class columns, adds ic_pvalue + turnover, collapses
--            ic_5d / ic_21d into a single per-horizon rank_ic row.
-- Rollback:  017_algorithm_ic_history_redesign_rollback.sql
-- Safety:    table was created empty by migration 014 and nothing writes to
--            it yet (AlgorithmIcTrackingJob is still a stub). TRUNCATE at the
--            top defends against manual test rows.
-- ============================================================================

BEGIN;

TRUNCATE TABLE algorithm_ic_history;

-- Drop coarse multi-horizon columns — replaced by (horizon_days, rank_ic).
ALTER TABLE algorithm_ic_history DROP COLUMN IF EXISTS ic_5d;
ALTER TABLE algorithm_ic_history DROP COLUMN IF EXISTS ic_21d;

-- New columns. `sector` + `horizon_days` land with defaults so the ALTER is
-- idempotent against partial prior attempts; defaults are dropped below so
-- future inserts must be explicit.
ALTER TABLE algorithm_ic_history
    ADD COLUMN IF NOT EXISTS sector       VARCHAR(48) NOT NULL DEFAULT 'ALL',
    ADD COLUMN IF NOT EXISTS horizon_days INT         NOT NULL DEFAULT 21,
    ADD COLUMN IF NOT EXISTS rank_ic      NUMERIC,
    ADD COLUMN IF NOT EXISTS ic_pvalue    NUMERIC,
    ADD COLUMN IF NOT EXISTS turnover     NUMERIC;

-- Re-key from (trade_date, algorithm, regime) to the full §14.0 composite key.
ALTER TABLE algorithm_ic_history DROP CONSTRAINT IF EXISTS algorithm_ic_history_pkey;
ALTER TABLE algorithm_ic_history
    ADD CONSTRAINT algorithm_ic_history_pkey
    PRIMARY KEY (trade_date, algorithm, sector, regime, horizon_days);

-- Defaults served their purpose as migration-time bootstrapping; drop them so
-- application-level inserts must set sector + horizon explicitly.
ALTER TABLE algorithm_ic_history ALTER COLUMN sector DROP DEFAULT;
ALTER TABLE algorithm_ic_history ALTER COLUMN horizon_days DROP DEFAULT;

-- Supporting indexes for the common queries the dashboard + weight-tuning
-- report will run: rolling window by algorithm, sector slice by date.
CREATE INDEX IF NOT EXISTS idx_algo_ic_algorithm_date
    ON algorithm_ic_history (algorithm, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_algo_ic_sector_date
    ON algorithm_ic_history (sector, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_algo_ic_horizon
    ON algorithm_ic_history (horizon_days);

COMMENT ON COLUMN algorithm_ic_history.sector IS
    'GICS sector label from stocks.sector, or the literal string ''ALL'' for the cross-sectional IC row.';
COMMENT ON COLUMN algorithm_ic_history.horizon_days IS
    'Forward-return horizon in trading days. Current usage: 5, 21, 60. One row per (algorithm × sector × regime × horizon).';
COMMENT ON COLUMN algorithm_ic_history.rank_ic IS
    'Spearman rank correlation between algorithm score at (trade_date - horizon) and realised forward return over that horizon.';
COMMENT ON COLUMN algorithm_ic_history.ic_pvalue IS
    'Two-sided p-value for the rank correlation. Null when n_tickers < 30 (sample too small for a meaningful test).';
COMMENT ON COLUMN algorithm_ic_history.turnover IS
    'Top-quintile churn on trade_date — fraction of the prior day''s top-20% that dropped out. High turnover erodes after-cost IC.';

COMMIT;
