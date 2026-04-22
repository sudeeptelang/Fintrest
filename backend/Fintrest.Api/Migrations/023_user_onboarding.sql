-- ============================================================================
-- Fintrest — User onboarding state + preferences
-- Migration: 023_user_onboarding
-- Target:    PostgreSQL 14+ (Supabase-compatible)
-- Purpose:   MVP Blocker 1 — the post-signup flow asks users to pick
--            interests (sectors + risk appetite + experience level) and
--            optionally upload a portfolio CSV. These columns back that
--            state so the frontend can know who has completed onboarding
--            and personalize Today / signal filters accordingly.
-- Rollback:  023_user_onboarding_rollback.sql
-- ============================================================================

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS onboarding_completed_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS onboarding_skipped        BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS experience_level          VARCHAR(20),
    ADD COLUMN IF NOT EXISTS risk_appetite             VARCHAR(20),
    ADD COLUMN IF NOT EXISTS preferred_sectors         JSONB;

COMMENT ON COLUMN users.onboarding_completed_at IS
    'Timestamp when the user finished the 3-step onboarding funnel, or null if not yet.';
COMMENT ON COLUMN users.onboarding_skipped IS
    'True if the user explicitly skipped onboarding rather than completing it.';
COMMENT ON COLUMN users.experience_level IS
    'Self-reported: beginner | intermediate | advanced. Used to pitch Lens explanation depth.';
COMMENT ON COLUMN users.risk_appetite IS
    'Self-reported: conservative | balanced | aggressive. Used for Today-page signal defaults.';
COMMENT ON COLUMN users.preferred_sectors IS
    'Array of GICS sector names the user wants to see first. [] = show all.';

COMMIT;
