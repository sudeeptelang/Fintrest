-- ============================================================================
-- Fintrest — widen sector VARCHAR columns
-- Migration: 028_widen_sector_columns
-- Target:    PostgreSQL 14+ (Supabase-compatible)
-- Purpose:   FundamentalSubscoreJob was hitting 22001 "value too long for
--            type character varying(48)" because some FMP sector/industry
--            strings (notably when a ticker's sector is actually an
--            industry slug like "Semiconductors — Specialized") exceed 48
--            characters. Widen to 128 everywhere the column holds a
--            human-readable sector label.
-- Rollback:  028_widen_sector_columns_rollback.sql
-- ============================================================================

BEGIN;

ALTER TABLE fundamental_subscore ALTER COLUMN sector TYPE VARCHAR(128);

COMMIT;
