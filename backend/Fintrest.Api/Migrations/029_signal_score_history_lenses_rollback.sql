-- Rollback for migration 029
ALTER TABLE signal_score_history
    DROP COLUMN IF EXISTS composite_score,
    DROP COLUMN IF EXISTS quality_score;
