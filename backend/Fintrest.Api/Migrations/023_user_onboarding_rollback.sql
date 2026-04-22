BEGIN;

ALTER TABLE users
    DROP COLUMN IF EXISTS preferred_sectors,
    DROP COLUMN IF EXISTS risk_appetite,
    DROP COLUMN IF EXISTS experience_level,
    DROP COLUMN IF EXISTS onboarding_skipped,
    DROP COLUMN IF EXISTS onboarding_completed_at;

COMMIT;
