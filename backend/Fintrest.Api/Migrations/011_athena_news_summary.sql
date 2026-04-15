-- Migration 011: Athena news summaries cached inline on news_items
-- Adds two columns that hold Claude-generated 2-3 sentence takes on each headline.
-- First news-reader click populates them; subsequent views serve from cache.
-- Safe to re-run.

ALTER TABLE news_items
    ADD COLUMN IF NOT EXISTS athena_summary TEXT,
    ADD COLUMN IF NOT EXISTS athena_summary_at TIMESTAMPTZ;
