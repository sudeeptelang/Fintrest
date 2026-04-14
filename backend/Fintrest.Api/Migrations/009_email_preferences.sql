-- Migration 009: Email preferences per user
-- Adds opt-in flags for the 3 email types (morning briefing, signal alerts, weekly newsletter).
-- All default to true — users can opt out from /settings page.
-- Run this in Supabase SQL Editor.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS receive_morning_briefing BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS receive_signal_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS receive_weekly_newsletter BOOLEAN NOT NULL DEFAULT TRUE;
