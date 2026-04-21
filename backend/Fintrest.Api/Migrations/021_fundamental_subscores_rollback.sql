-- ============================================================================
-- Rollback for 021_fundamental_subscores
-- ============================================================================

BEGIN;
DROP TABLE IF EXISTS fundamental_subscore;
COMMIT;
