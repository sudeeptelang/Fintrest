-- Migration 027: Live intraday quotes cache
-- FMP /quote endpoint returns today's price + changePct per ticker.
-- Our market_data table only stores EOD bars, so without this cache the
-- screener always shows yesterday's close until the trading day ends.
--
-- One row per ticker (overwritten on refresh). Refreshed via
-- LiveQuoteRefreshJob during market hours; the screener overlays this
-- onto EOD rows so users see today's move in real time.

CREATE TABLE IF NOT EXISTS live_quotes (
    ticker VARCHAR(20) PRIMARY KEY,
    price NUMERIC(18, 4),
    previous_close NUMERIC(18, 4),
    change_value NUMERIC(18, 4),
    change_pct NUMERIC(10, 4),
    day_high NUMERIC(18, 4),
    day_low NUMERIC(18, 4),
    volume BIGINT,
    as_of TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_live_quotes_as_of ON live_quotes (as_of DESC);
