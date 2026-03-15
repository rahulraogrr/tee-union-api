-- =============================================================================
-- MIGRATION V9  —  Split full_name → first_name / middle_name / last_name
-- Tables: t_members, t_staff_profiles
--
-- Strategy:
--   1. Add three new nullable columns
--   2. Migrate existing data  (first word → first_name,
--                              last word  → last_name,
--                              everything in between → middle_name)
--   3. Apply NOT NULL to first_name and last_name
--   4. Drop old full_name column
-- =============================================================================

BEGIN;

-- ─── t_members ───────────────────────────────────────────────────────────────

ALTER TABLE t_members
  ADD COLUMN IF NOT EXISTS first_name  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name   VARCHAR(100);

UPDATE t_members
SET
  first_name  = split_part(trim(full_name), ' ', 1),

  last_name   = CASE
                  WHEN trim(full_name) ~ '\s'
                    THEN regexp_replace(trim(full_name), '^.* ', '')
                  ELSE trim(full_name)
                END,

  middle_name = CASE
                  WHEN array_length(string_to_array(trim(full_name), ' '), 1) > 2
                    THEN array_to_string(
                           (string_to_array(trim(full_name), ' '))[2 :
                             array_length(string_to_array(trim(full_name), ' '), 1) - 1],
                           ' ')
                  ELSE NULL
                END;

ALTER TABLE t_members
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name  SET NOT NULL;

ALTER TABLE t_members
  DROP COLUMN IF EXISTS full_name;

-- ─── t_staff_profiles ────────────────────────────────────────────────────────

ALTER TABLE t_staff_profiles
  ADD COLUMN IF NOT EXISTS first_name  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name   VARCHAR(100);

UPDATE t_staff_profiles
SET
  first_name  = split_part(trim(full_name), ' ', 1),

  last_name   = CASE
                  WHEN trim(full_name) ~ '\s'
                    THEN regexp_replace(trim(full_name), '^.* ', '')
                  ELSE trim(full_name)
                END,

  middle_name = CASE
                  WHEN array_length(string_to_array(trim(full_name), ' '), 1) > 2
                    THEN array_to_string(
                           (string_to_array(trim(full_name), ' '))[2 :
                             array_length(string_to_array(trim(full_name), ' '), 1) - 1],
                           ' ')
                  ELSE NULL
                END;

ALTER TABLE t_staff_profiles
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name  SET NOT NULL;

ALTER TABLE t_staff_profiles
  DROP COLUMN IF EXISTS full_name;

-- ─── VERIFY ──────────────────────────────────────────────────────────────────

SELECT 'members first_name NOT NULL'   AS check, COUNT(*) AS rows FROM t_members   WHERE first_name IS NULL;
SELECT 'members last_name NOT NULL'    AS check, COUNT(*) AS rows FROM t_members   WHERE last_name  IS NULL;
SELECT 'staff first_name NOT NULL'     AS check, COUNT(*) AS rows FROM t_staff_profiles WHERE first_name IS NULL;
SELECT 'staff last_name NOT NULL'      AS check, COUNT(*) AS rows FROM t_staff_profiles WHERE last_name  IS NULL;
SELECT 'members sample'                AS check, first_name, middle_name, last_name FROM t_members LIMIT 3;

COMMIT;
