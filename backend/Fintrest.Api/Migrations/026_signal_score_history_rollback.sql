-- Rollback for migration 026
DROP INDEX IF EXISTS ix_signal_score_history_as_of;
DROP INDEX IF EXISTS ix_signal_score_history_ticker_date;
DROP TABLE IF EXISTS signal_score_history;
