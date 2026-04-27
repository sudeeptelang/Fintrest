-- Rename market_firehose_snapshot → market_firehose_snapshots so it
-- matches the EF naming convention (plural DbSet name → plural table).
-- The original migration 020 created the singular form, but every
-- query in MarketController, FirehoseIngestJob, and CongressSignalService
-- uses the plural name and got "relation does not exist".
ALTER TABLE IF EXISTS market_firehose_snapshot RENAME TO market_firehose_snapshots;
