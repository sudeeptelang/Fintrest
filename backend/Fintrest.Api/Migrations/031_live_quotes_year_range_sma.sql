-- Migration 031: extend live_quotes with the rest of FMP /batch-quote.
-- We were already storing price, prevClose, change, dayHigh/Low, volume —
-- this adds yearHigh, yearLow, priceAvg50, priceAvg200, open, marketCap so
-- the screener can read 52-week range and SMAs directly from FMP rather
-- than re-deriving from market_data bars (per the direct-endpoints rule).

ALTER TABLE live_quotes
    ADD COLUMN IF NOT EXISTS open          numeric(18, 4),
    ADD COLUMN IF NOT EXISTS year_high     numeric(18, 4),
    ADD COLUMN IF NOT EXISTS year_low      numeric(18, 4),
    ADD COLUMN IF NOT EXISTS price_avg50   numeric(18, 4),
    ADD COLUMN IF NOT EXISTS price_avg200  numeric(18, 4),
    ADD COLUMN IF NOT EXISTS market_cap    numeric(20, 2);
