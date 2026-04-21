-- ============================================================================
-- Fintrest — Morning briefing + weekly newsletter send history
-- Migration: 019_briefing_run
-- Target:    PostgreSQL 14+ (Supabase-compatible)
-- Purpose:   closes the visibility gap flagged in SystemHealthService —
--            AlertDispatcher.DispatchMorningBriefingsAsync currently emails
--            users but writes no row, so the admin dashboard can't tell
--            whether "scan completed" actually translated into sent mail.
-- Rollback:  019_briefing_run_rollback.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS briefing_run (
    id             BIGSERIAL PRIMARY KEY,
    kind           VARCHAR(32)  NOT NULL,     -- 'morning' | 'weekly'
    started_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at   TIMESTAMPTZ,
    scan_run_id    BIGINT,                     -- FK to scan_runs(id) — the scan these briefings reference
    audience_size  INT          NOT NULL DEFAULT 0,  -- users with the relevant opt-in flag
    sent_count     INT          NOT NULL DEFAULT 0,
    failed_count   INT          NOT NULL DEFAULT 0,
    status         VARCHAR(20)  NOT NULL DEFAULT 'running', -- running | completed | failed
    error_message  TEXT
);

COMMENT ON TABLE briefing_run IS
    'One row per briefing dispatch. Lets the admin dashboard answer "did today''s morning email actually send?" and "how many failed?".';
COMMENT ON COLUMN briefing_run.kind IS
    'Which dispatcher fired this row. ''morning'' = DispatchMorningBriefingsAsync; ''weekly'' = DispatchWeeklyNewsletterAsync.';
COMMENT ON COLUMN briefing_run.scan_run_id IS
    'Scan run whose top signals were included in the email. Null if no scan completed before the send (still logged so the gap is visible).';

CREATE INDEX IF NOT EXISTS idx_briefing_run_kind_started
    ON briefing_run (kind, started_at DESC);

ALTER TABLE briefing_run ENABLE ROW LEVEL SECURITY;

COMMIT;
