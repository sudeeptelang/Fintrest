-- Rollback for 028_widen_sector_columns.sql. Only safe if no stored
-- sector values exceed 48 characters — check first:
--   SELECT COUNT(*) FROM fundamental_subscore WHERE length(sector) > 48;

BEGIN;

ALTER TABLE fundamental_subscore ALTER COLUMN sector TYPE VARCHAR(48);

COMMIT;
