-- Migration 013: Lock down every application table with Row Level Security
-- ============================================================================
-- By default, Supabase tables created via raw SQL have RLS DISABLED, which
-- means the PUBLIC anon key (embedded in your frontend) can hit Supabase's
-- auto-generated REST API and read/write every row directly. That bypasses
-- every [Authorize] / [RequiresPlan] check in the backend.
--
-- This migration:
--   1. Enables RLS on every app table.
--   2. Creates NO policies — the anon key gets zero access by default.
--   3. The backend keeps working because it connects as the `postgres`
--      superuser (via connection string), which bypasses RLS.
--
-- Net effect: all data access MUST go through the .NET backend, which enforces
-- auth + plan gates. Attackers using the public anon key are locked out.
-- ============================================================================
--
-- Re-runnable: `ENABLE ROW LEVEL SECURITY` is idempotent on already-enabled
-- tables (no-op). Safe to run even if some tables already had RLS on.
--
-- Run this in Supabase SQL Editor.

ALTER TABLE users                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundamentals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_runs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_breakdowns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_deliveries            ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_tracking        ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_articles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_health             ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_trace_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_risk_metrics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE athena_theses               ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Verify: this query should return every table with rowsecurity=true.
-- Any row showing rowsecurity=false means that table is still wide open.
-- ============================================================================
-- SELECT tablename, rowsecurity
--   FROM pg_tables
--  WHERE schemaname = 'public'
--  ORDER BY tablename;
