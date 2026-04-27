-- Migration 030: Smart Money 8th factor.
-- Adds smart_money_score to signal_breakdowns. Smart Money is a family
-- composite of Insider activity (35%), Institutional flow (25%), Short
-- dynamics (15%), Congressional trades (15%), Options positioning (10%).
-- Weight in the final composite is 25% (matches TipRanks Smart Score
-- ceiling — the most aggressive mainstream consumer-product comp).
--
-- Defaults to 50.0 (neutral) so existing breakdown rows pre-migration
-- still produce sensible totals when re-rendered. Real values land
-- starting with the next scan after Pass B (smart-money rollup) ships.

ALTER TABLE signal_breakdowns
    ADD COLUMN IF NOT EXISTS smart_money_score DOUBLE PRECISION NOT NULL DEFAULT 50.0;
