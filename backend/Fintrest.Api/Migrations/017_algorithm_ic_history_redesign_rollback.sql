-- ============================================================================
-- Rollback for 017_algorithm_ic_history_redesign
-- Reverts to the migration-014 shape: (trade_date, algorithm, regime) PK with
-- ic_5d / ic_21d / n_tickers columns.
-- ============================================================================

BEGIN;

TRUNCATE TABLE algorithm_ic_history;

ALTER TABLE algorithm_ic_history DROP CONSTRAINT IF EXISTS algorithm_ic_history_pkey;

DROP INDEX IF EXISTS idx_algo_ic_algorithm_date;
DROP INDEX IF EXISTS idx_algo_ic_sector_date;
DROP INDEX IF EXISTS idx_algo_ic_horizon;

ALTER TABLE algorithm_ic_history
    DROP COLUMN IF EXISTS sector,
    DROP COLUMN IF EXISTS horizon_days,
    DROP COLUMN IF EXISTS rank_ic,
    DROP COLUMN IF EXISTS ic_pvalue,
    DROP COLUMN IF EXISTS turnover;

ALTER TABLE algorithm_ic_history
    ADD COLUMN IF NOT EXISTS ic_5d  NUMERIC,
    ADD COLUMN IF NOT EXISTS ic_21d NUMERIC;

ALTER TABLE algorithm_ic_history
    ADD CONSTRAINT algorithm_ic_history_pkey
    PRIMARY KEY (trade_date, algorithm, regime);

COMMIT;
