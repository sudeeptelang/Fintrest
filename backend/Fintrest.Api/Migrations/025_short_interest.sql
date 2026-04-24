-- Migration 025: Short interest snapshots
-- Feeds the Smart Money "Short dynamics" sub-signal. FINRA publishes bi-monthly;
-- FMP's /stable/short-interest returns the latest settlement per ticker. We store
-- each (ticker, settlement_date) snapshot so we can compute trend deltas later.

CREATE TABLE IF NOT EXISTS short_interest_snapshots (
    id BIGSERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    settlement_date DATE NOT NULL,
    short_interest_shares BIGINT,
    float_shares BIGINT,
    short_pct_float NUMERIC(8, 4),  -- percent (e.g. 12.45 means 12.45% of float)
    days_to_cover NUMERIC(8, 2),
    avg_daily_volume BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_short_interest_ticker_settlement
    ON short_interest_snapshots (ticker, settlement_date);

CREATE INDEX IF NOT EXISTS ix_short_interest_settlement
    ON short_interest_snapshots (settlement_date DESC);
