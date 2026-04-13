-- Migration 008: Stock Profile / TTM Metrics
-- Adds slow-changing per-stock fields populated by FMP /profile, /key-metrics-ttm,
-- /ratios-ttm, /price-target-consensus, /earning_calendar.
-- Run this in Supabase SQL Editor.

ALTER TABLE stocks
    ADD COLUMN IF NOT EXISTS beta DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS analyst_target_price DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS next_earnings_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS forward_pe DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS peg_ratio DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS price_to_book DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS return_on_equity DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS return_on_assets DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS operating_margin DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS metrics_updated_at TIMESTAMPTZ;

-- Optional: index on next earnings date for upcoming-earnings queries
CREATE INDEX IF NOT EXISTS idx_stocks_next_earnings_date
    ON stocks(next_earnings_date)
    WHERE next_earnings_date IS NOT NULL;
