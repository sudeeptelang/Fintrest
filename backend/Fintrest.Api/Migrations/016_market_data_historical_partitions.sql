-- ============================================================================
-- Migration 016: Historical market_data partitions (2023, 2024, 2025)
-- ============================================================================
-- market_data is range-partitioned by `ts`; partitions only existed from
-- 2026-Q1 onward, which is why DataIngestionService.IngestMarketDataAsync
-- has a hard-coded `partitionStart = 2026-01-01` gate. That in turn blocks
-- the v3 features ma_200 (needs 200 bars) and week52_range_pct (needs 252).
--
-- This migration adds annual partitions covering 2023, 2024, and 2025 so
-- ingestion can backfill ~3 years of history via FMP Premier's daily-bars
-- endpoint. Combined with the gate relaxation in a follow-up code push,
-- a single /seed/ingest run will pull enough history to unblock those
-- features.
--
-- Indexes on the parent table are inherited automatically (Postgres 12+).
-- RLS policies too.
--
-- Safe to re-run (IF NOT EXISTS). Rollback drops the new partitions
-- without touching the parent table or any other partition.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS market_data_2023 PARTITION OF market_data
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE IF NOT EXISTS market_data_2024 PARTITION OF market_data
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE IF NOT EXISTS market_data_2025 PARTITION OF market_data
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

COMMIT;
