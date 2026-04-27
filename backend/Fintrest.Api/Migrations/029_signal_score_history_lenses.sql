-- Migration 029: Add Composite + Quality lens scores to signal_score_history.
-- Phase 2 of multi-lens scoring (see ScoringOptions.cs FactorWeights.Composite/Quality).
-- The existing score_total column carries the Setup score (current swing-trade
-- formula). composite_score is the balanced "good investment overall" lens;
-- quality_score is the fundamentals-led "would I hold this long-term" lens.
-- Both are nullable so older rows pre-Phase-2 stay valid without backfill.

ALTER TABLE signal_score_history
    ADD COLUMN IF NOT EXISTS composite_score NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS quality_score   NUMERIC(5, 2);
