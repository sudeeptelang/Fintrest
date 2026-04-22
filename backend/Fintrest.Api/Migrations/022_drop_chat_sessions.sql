-- ============================================================================
-- Fintrest — Remove the Ask Lens chat feature (MVP scope cut)
-- Migration: 022_drop_chat_sessions
-- Target:    PostgreSQL 14+ (Supabase-compatible)
-- Purpose:   Chat was removed for MVP (see docs/MVP_PUNCHLIST.md §6). The
--            feature carried per-Pro-user Claude variable cost with no
--            matching value — Fintrest's product is research + published
--            outcome, not conversational Q&A. Thesis generation on the
--            signal page (AthenaThesisService) stays and is unaffected.
-- Rollback:  022_drop_chat_sessions_rollback.sql — recreates the table
--            shell; chat history is not recoverable.
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS chat_sessions CASCADE;

COMMIT;
