-- =============================================================================
--  Migration v10: role → roles[] (multi-role support)
--  Allows a single user to hold multiple roles simultaneously.
--  e.g. a small-district officer can be both rep + zonal_officer
-- =============================================================================

-- 1. Add the new roles array column (empty by default)
ALTER TABLE t_users
  ADD COLUMN IF NOT EXISTS roles user_role[] NOT NULL DEFAULT '{}';

-- 2. Migrate existing single-role values into the new array
UPDATE t_users SET roles = ARRAY[role] WHERE role IS NOT NULL;

-- 3. Drop the old single-role column
ALTER TABLE t_users DROP COLUMN IF EXISTS role;

-- 4. Drop the old single-column index (no longer needed; GIN index below replaces it)
DROP INDEX IF EXISTS t_users_role_idx;

-- 5. Add GIN index for efficient array membership queries
--    e.g. WHERE 'admin' = ANY(roles)
CREATE INDEX IF NOT EXISTS t_users_roles_gin ON t_users USING GIN (roles);

-- =============================================================================
--  Verify
-- =============================================================================
SELECT
  employee_id,
  roles
FROM t_users
ORDER BY employee_id
LIMIT 10;
