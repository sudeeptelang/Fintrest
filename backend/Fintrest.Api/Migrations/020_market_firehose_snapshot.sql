-- ============================================================================
-- Fintrest — Write-through cache for FMP insider + congress firehoses
-- Migration: 020_market_firehose_snapshot
-- Target:    PostgreSQL 14+ (Supabase-compatible)
-- Purpose:   Kill the "load-time FMP dependency" on /insiders and /congress.
--            The nightly FirehoseIngestJob writes rows here; controllers read
--            from here. If FMP hiccups tomorrow, users see yesterday's data
--            instead of a blank table.
-- Rollback:  020_market_firehose_snapshot_rollback.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS market_firehose_snapshot (
    id                BIGSERIAL PRIMARY KEY,
    kind              VARCHAR(16)  NOT NULL,    -- 'insider' | 'senate' | 'house'
    ticker            VARCHAR(10),               -- null on congress rows without symbol lookup
    transaction_date  DATE,
    disclosure_date   DATE,
    filing_date       DATE,
    actor_name        VARCHAR(200),              -- reporting_name (insider) / representative (congress)
    actor_role        VARCHAR(200),              -- type_of_owner (insider) / office (congress)
    chamber           VARCHAR(10),               -- 'senate' | 'house' | null
    transaction_type  VARCHAR(100),
    shares            NUMERIC,                   -- insider only
    price             NUMERIC,                   -- insider only
    total_value       NUMERIC,                   -- insider only (shares × price, may be null)
    amount_range      VARCHAR(100),              -- congress only (disclosed as bucketed ranges)
    asset_description TEXT,                      -- congress only
    source_url        TEXT,                      -- congress: FMP-provided filing URL
    payload_json      JSONB,                     -- raw provider row — future-proofs against schema drift
    captured_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE market_firehose_snapshot IS
    'Daily cache of insider + senate + house trade firehoses pulled from FMP. Controllers read from here instead of calling FMP live; nightly FirehoseIngestJob refreshes rows.';

CREATE INDEX IF NOT EXISTS idx_mfs_kind_captured
    ON market_firehose_snapshot (kind, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfs_captured
    ON market_firehose_snapshot (captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfs_ticker
    ON market_firehose_snapshot (ticker) WHERE ticker IS NOT NULL;

ALTER TABLE market_firehose_snapshot ENABLE ROW LEVEL SECURITY;

COMMIT;
