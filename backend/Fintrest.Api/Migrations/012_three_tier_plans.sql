-- Migration 012: Consolidate plan tiers to 3 (free / pro / elite)
-- Drops the old Starter + Premium tiers and rewrites the CHECK constraint to match
-- the new PlanType enum. Run this in Supabase SQL Editor.

BEGIN;

-- 1. Migrate any existing users on the dropped tiers:
--    - starter users stay on a paid tier at 'pro' (closest feature match, upgrade path)
--    - premium users move to 'elite' (that's the rename)
UPDATE users SET plan = 'pro'   WHERE plan = 'starter';
UPDATE users SET plan = 'elite' WHERE plan = 'premium';

-- 2. Same migration for the subscriptions table.
UPDATE subscriptions SET plan = 'pro'   WHERE plan = 'starter';
UPDATE subscriptions SET plan = 'elite' WHERE plan = 'premium';

-- 3. Replace the CHECK constraint on users.plan.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check
    CHECK (plan IN ('free', 'pro', 'elite'));

-- 4. Replace the CHECK constraint on subscriptions.plan (if present).
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
    CHECK (plan IN ('free', 'pro', 'elite'));

COMMIT;
