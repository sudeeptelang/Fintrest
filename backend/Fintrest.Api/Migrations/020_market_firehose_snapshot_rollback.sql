-- ============================================================================
-- Rollback for 020_market_firehose_snapshot
-- ============================================================================

BEGIN;
DROP TABLE IF EXISTS market_firehose_snapshot;
COMMIT;
