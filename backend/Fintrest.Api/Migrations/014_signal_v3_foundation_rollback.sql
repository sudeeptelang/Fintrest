-- ============================================================================
-- Rollback for 014_signal_v3_foundation
-- Safe to run at any time. Drops the five v3 tables + the lookahead trigger.
-- v2 scoring is unaffected.
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_features_asof_check ON features;
DROP FUNCTION IF EXISTS check_features_as_of_ts();

DROP TABLE IF EXISTS regime_history;
DROP TABLE IF EXISTS ticker_earnings_profile;
DROP TABLE IF EXISTS algorithm_ic_history;
DROP TABLE IF EXISTS feature_ranks;
DROP TABLE IF EXISTS features;

COMMIT;
