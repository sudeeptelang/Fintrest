-- Rollback for migration 030
ALTER TABLE signal_breakdowns
    DROP COLUMN IF EXISTS smart_money_score;
