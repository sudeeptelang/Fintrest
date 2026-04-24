-- Rollback for migration 025
DROP INDEX IF EXISTS ix_short_interest_settlement;
DROP INDEX IF EXISTS ix_short_interest_ticker_settlement;
DROP TABLE IF EXISTS short_interest_snapshots;
