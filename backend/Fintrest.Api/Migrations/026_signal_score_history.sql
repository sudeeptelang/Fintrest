-- Migration 026: Signal score history
-- Per-ticker daily score snapshots. Powers the real sparklines on the
-- Today rows + ticker hero, and real "delta vs yesterday" on the
-- ScoreGradeChip. One row per (ticker, as_of_date); population happens
-- at scan-time (each completed scan writes a history row per signal).

CREATE TABLE IF NOT EXISTS signal_score_history (
    id BIGSERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    as_of_date DATE NOT NULL,
    score_total NUMERIC(5, 2) NOT NULL,
    signal_type VARCHAR(20),
    scan_run_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_signal_score_history_ticker_date
    ON signal_score_history (ticker, as_of_date);

CREATE INDEX IF NOT EXISTS ix_signal_score_history_as_of
    ON signal_score_history (as_of_date DESC);
