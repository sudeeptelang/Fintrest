-- ============================================================================
-- Fintrest — SEC EDGAR Form 4 insider trading data + scores (Smart Money Phase 1)
-- Migration: 024_insider_transactions
-- Target:    PostgreSQL 14+ (Supabase-compatible)
-- Purpose:   Phase 1 of Smart Money (the 8th factor) per
--            docs/SMART_MONEY_BUILD_SPEC.md. EDGAR Form 4 is free data
--            and highest-weight (35%) of the Smart Money composite.
--            Two tables: raw transactions (ingested nightly from EDGAR),
--            derived ticker-level scores (computed from transactions
--            using open-market purchases only, 30-day rolling window).
-- Rollback:  024_insider_transactions_rollback.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS insider_transactions (
    id                BIGSERIAL PRIMARY KEY,
    accession_number  TEXT NOT NULL,
    company_cik       TEXT NOT NULL,
    ticker            TEXT NOT NULL,
    insider_cik       TEXT NOT NULL,
    insider_name      TEXT NOT NULL,
    insider_title     TEXT,
    is_officer        BOOLEAN NOT NULL DEFAULT FALSE,
    is_director       BOOLEAN NOT NULL DEFAULT FALSE,
    is_10pct_owner    BOOLEAN NOT NULL DEFAULT FALSE,
    transaction_date  DATE NOT NULL,
    filing_date       DATE NOT NULL,
    transaction_code  CHAR(1) NOT NULL,
    shares            NUMERIC(18, 4) NOT NULL,
    price_per_share   NUMERIC(18, 4),
    total_value       NUMERIC(18, 2),
    shares_owned_after NUMERIC(18, 4),
    is_10b5_1         BOOLEAN NOT NULL DEFAULT FALSE,
    is_open_market    BOOLEAN NOT NULL DEFAULT TRUE,
    raw_xml_url       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (accession_number, insider_cik, transaction_date, shares, transaction_code)
);

COMMENT ON TABLE insider_transactions IS
    'Raw Form 4 transactions from SEC EDGAR. Scoring filters for transaction_code=P '
    '+ is_10b5_1=FALSE + is_open_market=TRUE — all three conditions are required to '
    'count as discretionary insider buying.';

CREATE INDEX IF NOT EXISTS idx_insider_ticker_date
    ON insider_transactions (ticker, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_insider_filing_date
    ON insider_transactions (filing_date DESC);
-- Partial index — we only query by code for P and S (buy/sell). A/M/F/D/G are
-- filtered out during scoring and don't need an index.
CREATE INDEX IF NOT EXISTS idx_insider_code
    ON insider_transactions (transaction_code)
    WHERE transaction_code IN ('P', 'S');

ALTER TABLE insider_transactions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS insider_scores (
    ticker            TEXT NOT NULL,
    as_of_date        DATE NOT NULL,
    score             NUMERIC(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
    net_dollar_flow_30d NUMERIC(18, 2),
    cluster_count_30d INTEGER,
    officer_buy_count INTEGER,
    director_buy_count INTEGER,
    largest_purchase_value NUMERIC(18, 2),
    largest_purchaser_name TEXT,
    largest_purchaser_title TEXT,
    largest_purchaser_history_note TEXT,
    methodology_version TEXT NOT NULL,
    computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (ticker, as_of_date)
);

COMMENT ON TABLE insider_scores IS
    'Per-ticker insider-activity score 0-100. Composite of net dollar flow (50%), '
    'distinct-insider cluster count (30%), and officer vs director seniority (20%). '
    'Window: 30-day rolling. Refreshed nightly by InsiderScoreJob.';

CREATE INDEX IF NOT EXISTS idx_insider_scores_asof
    ON insider_scores (as_of_date DESC);

ALTER TABLE insider_scores ENABLE ROW LEVEL SECURITY;

COMMIT;
