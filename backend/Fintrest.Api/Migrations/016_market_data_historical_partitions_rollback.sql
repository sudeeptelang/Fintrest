-- ============================================================================
-- Rollback for 016_market_data_historical_partitions
-- Drops the 2023/2024/2025 partitions. Any rows already loaded into them
-- will be deleted. v2 scoring is unaffected since it only reads partitions
-- from 2026-Q1 onward.
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS market_data_2025;
DROP TABLE IF EXISTS market_data_2024;
DROP TABLE IF EXISTS market_data_2023;

COMMIT;
