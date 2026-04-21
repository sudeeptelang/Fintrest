-- ============================================================================
-- Fintrest — Quality / Profitability / Growth sub-model scores
-- Migration: 021_fundamental_subscores
-- Target:    PostgreSQL 14+ (Supabase-compatible)
-- Purpose:   First step of §14.1 in docs/SIGNALS_V3.md — decompose the
--            single "fundamentals" score into three sub-scores, each
--            sector-normalized. Today's v2 fundamentals score is a flat
--            composite of FMP snapshot fields; this table lets the scoring
--            engine (a later commit) blend three independent factor views
--            and show the user *why* the fundamentals number is what it is.
-- Rollback:  021_fundamental_subscores_rollback.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS fundamental_subscore (
    ticker            VARCHAR(10) NOT NULL,
    as_of_date        DATE        NOT NULL,
    sector            VARCHAR(48),

    -- Raw 0..100 scores before sector ranking
    quality_raw       NUMERIC,
    profitability_raw NUMERIC,
    growth_raw        NUMERIC,

    -- Sector-normalized percentile ranks 0..1 (1 = best in sector)
    quality_rank       NUMERIC,
    profitability_rank NUMERIC,
    growth_rank        NUMERIC,

    -- Final 0..100 composite = blend of raw and rank
    quality_score       NUMERIC,
    profitability_score NUMERIC,
    growth_score        NUMERIC,

    -- Which underlying FMP fields were available (for debugging gaps)
    inputs_available_json JSONB,

    computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (ticker, as_of_date)
);

COMMENT ON TABLE fundamental_subscore IS
    'Per-ticker, per-day Quality / Profitability / Growth sub-scores feeding the §14.1 fundamentals decomposition. Raw + sector-ranked + final composite for each. Populated by FundamentalSubscoreJob; read by the scoring engine.';

CREATE INDEX IF NOT EXISTS idx_fund_subscore_date_sector
    ON fundamental_subscore (as_of_date, sector);
CREATE INDEX IF NOT EXISTS idx_fund_subscore_ticker_date
    ON fundamental_subscore (ticker, as_of_date DESC);

ALTER TABLE fundamental_subscore ENABLE ROW LEVEL SECURITY;

COMMIT;
