-- ============================================================================
-- Migration 015: feature_run_log
-- ============================================================================
-- Observability table for the nightly FeaturePopulationJob (Milestone 2).
-- One row per run. JSONB columns let us add new features without schema churn.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS feature_run_log (
    run_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_date         DATE        NOT NULL,
    started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at           TIMESTAMPTZ,
    universe_size      INT,
    rows_written       JSONB       NOT NULL DEFAULT '{}'::jsonb,   -- { "rsi_14": 468, ... }
    error_count        JSONB       NOT NULL DEFAULT '{}'::jsonb,   -- { "feature_name": count }
    sector_fallbacks   INT         NOT NULL DEFAULT 0,             -- unresolved sector → SPY
    provider_calls     JSONB       NOT NULL DEFAULT '{}'::jsonb,   -- { "polygon": N, "fmp": N, ... }
    status             VARCHAR(16) NOT NULL DEFAULT 'running'      -- 'running' | 'green' | 'yellow' | 'red'
);

CREATE INDEX IF NOT EXISTS idx_feature_run_log_date ON feature_run_log (trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_feature_run_log_status ON feature_run_log (status, started_at DESC);

ALTER TABLE feature_run_log ENABLE ROW LEVEL SECURITY;

COMMIT;
