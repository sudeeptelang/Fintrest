-- ============================================================================
-- Fintrest — Job state tracking for cron robustness
-- Migration: 018_job_state
-- Target:    PostgreSQL 14+ (Supabase-compatible)
-- Purpose:   persist "did this job run today?" across backend restarts. The
--            current in-process jobs (DailyCronJob, MorningBriefingJob, etc.)
--            check Hour==X && Minute==Y exactly; if the backend restarts
--            after that minute window, the day's run silently skips. This
--            table lets each job say "I haven't run today yet, and it's past
--            my scheduled time — catch up now."
-- Rollback:  018_job_state_rollback.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS job_state (
    job_name             VARCHAR(100) PRIMARY KEY,
    last_success_date    DATE,                     -- ET date of the last successful run
    last_success_at      TIMESTAMPTZ,              -- UTC timestamp of last success
    last_error_at        TIMESTAMPTZ,
    last_error_message   TEXT,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE job_state IS
    'Persisted last-run state per scheduled job so missed windows don''t cause silent skip-a-day behaviour.';
COMMENT ON COLUMN job_state.last_success_date IS
    'ET (America/New_York) calendar date of the last successful run. Jobs compare today''s ET date against this to decide whether to fire.';

ALTER TABLE job_state ENABLE ROW LEVEL SECURITY;

COMMIT;
