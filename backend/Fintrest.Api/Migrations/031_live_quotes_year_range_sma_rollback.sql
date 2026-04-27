-- Rollback for migration 031.

ALTER TABLE live_quotes
    DROP COLUMN IF EXISTS open,
    DROP COLUMN IF EXISTS year_high,
    DROP COLUMN IF EXISTS year_low,
    DROP COLUMN IF EXISTS price_avg50,
    DROP COLUMN IF EXISTS price_avg200,
    DROP COLUMN IF EXISTS market_cap;
