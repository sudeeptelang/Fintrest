-- Rollback for migration 027
DROP INDEX IF EXISTS ix_live_quotes_as_of;
DROP TABLE IF EXISTS live_quotes;
