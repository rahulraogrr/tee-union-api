-- =============================================================================
--  TEE 1104 Union — Migration v8
--  Apply all 8 schema fixes identified from DDL review.
--  Run in DataGrip against your Railway PostgreSQL database.
--  Safe to re-run — each statement is wrapped in a DO block or uses IF EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fix #1  venue/location (frontend-only — no DB change needed)
--   Frontend: UnionEvent.venue renamed to UnionEvent.location in types/index.ts
--   The DB column has always been `location` — this was purely a type mismatch.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Fix #2  Add UNIQUE constraint on t_push_tokens.token
--   Prevents the same FCM/APNs token being stored multiple times,
--   which caused duplicate push notifications to the same device.
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 't_push_tokens_token_key'
      AND conrelid = 't_push_tokens'::regclass
  ) THEN
    -- Deduplicate first: keep the most recent row per token
    DELETE FROM t_push_tokens pt1
    USING t_push_tokens pt2
    WHERE pt1.token = pt2.token
      AND pt1.created_at < pt2.created_at;

    ALTER TABLE t_push_tokens ADD CONSTRAINT t_push_tokens_token_key UNIQUE (token);
    RAISE NOTICE 'Fix #2: UNIQUE constraint added to t_push_tokens.token';
  ELSE
    RAISE NOTICE 'Fix #2: UNIQUE constraint already exists on t_push_tokens.token — skipping';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Fix #3  Remove redundant employee_id from t_members
--   t_members.employee_id duplicates t_users.employee_id (reachable via FK user_id).
--   Removing it eliminates the risk of the two values drifting out of sync.
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 't_members' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE t_members DROP COLUMN employee_id;
    RAISE NOTICE 'Fix #3: employee_id dropped from t_members';
  ELSE
    RAISE NOTICE 'Fix #3: employee_id not found on t_members — skipping';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Fix #4  Add missing index on t_tickets(work_unit_id)
--   The service filters/groups tickets by work_unit_id when auto-assigning reps.
--   Without this index every lookup is a full scan on t_tickets.
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_t_tickets_work_unit_id
  ON t_tickets (work_unit_id);

-- -----------------------------------------------------------------------------
-- Fix #5  Add missing index on t_notifications(reference_id)
--   Notifications are frequently fetched by reference_id (e.g. "show ticket
--   notifications for ticket X"). Without the index this is a sequential scan.
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_t_notifications_reference_id
  ON t_notifications (reference_id);

-- -----------------------------------------------------------------------------
-- Fix #6  Enforce max_capacity at DB level for t_events
--   A BEFORE INSERT trigger on t_event_registrations rejects registrations
--   when the event is already at capacity, providing a hard DB-level guard.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_check_event_capacity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_max_capacity  INT;
  v_current_count INT;
BEGIN
  SELECT max_capacity
    INTO v_max_capacity
    FROM t_events
   WHERE id = NEW.event_id;

  -- NULL max_capacity means unlimited — allow the registration
  IF v_max_capacity IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO v_current_count
    FROM t_event_registrations
   WHERE event_id = NEW.event_id;

  IF v_current_count >= v_max_capacity THEN
    RAISE EXCEPTION
      'Event is at full capacity (% / %)', v_current_count, v_max_capacity;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_event_capacity ON t_event_registrations;

CREATE TRIGGER trg_check_event_capacity
  BEFORE INSERT ON t_event_registrations
  FOR EACH ROW EXECUTE FUNCTION fn_check_event_capacity();

-- -----------------------------------------------------------------------------
-- Fix #7  Remove mobile_no from t_users
--   Phone numbers belong to the person's profile (t_members / t_staff_profiles),
--   not to the authentication record. Removing it from t_users eliminates the
--   dual-source-of-truth problem where numbers could diverge.
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 't_users' AND column_name = 'mobile_no'
  ) THEN
    ALTER TABLE t_users DROP COLUMN mobile_no;
    RAISE NOTICE 'Fix #7: mobile_no dropped from t_users';
  ELSE
    RAISE NOTICE 'Fix #7: mobile_no not found on t_users — skipping';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Fix #8  Document t_rep_assignments as reserved / currently unused
--   Rep coverage is derived automatically from t_members (workUnitId / districtId
--   where user.role = rep). This table is kept for future admin-managed territory
--   overrides but must not be populated until that feature is built.
-- -----------------------------------------------------------------------------

COMMENT ON TABLE t_rep_assignments IS
  'Reserved for future admin-managed rep territory overrides. '
  'Currently UNUSED — rep coverage is derived automatically from '
  't_members.work_unit_id / district_id where users.role = rep.';

-- -----------------------------------------------------------------------------
-- VERIFY — confirm structural changes
-- -----------------------------------------------------------------------------

SELECT
  'push_token_unique' AS check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 't_push_tokens_token_key'
      AND conrelid = 't_push_tokens'::regclass
  ) THEN 'OK' ELSE 'MISSING' END AS result

UNION ALL

SELECT
  'members_no_employee_id',
  CASE WHEN NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 't_members' AND column_name = 'employee_id'
  ) THEN 'OK' ELSE 'COLUMN STILL EXISTS' END

UNION ALL

SELECT
  'tickets_work_unit_idx',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 't_tickets' AND indexname = 'idx_t_tickets_work_unit_id'
  ) THEN 'OK' ELSE 'MISSING' END

UNION ALL

SELECT
  'notifications_reference_idx',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 't_notifications' AND indexname = 'idx_t_notifications_reference_id'
  ) THEN 'OK' ELSE 'MISSING' END

UNION ALL

SELECT
  'event_capacity_trigger',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_check_event_capacity'
  ) THEN 'OK' ELSE 'MISSING' END

UNION ALL

SELECT
  'users_no_mobile_no',
  CASE WHEN NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 't_users' AND column_name = 'mobile_no'
  ) THEN 'OK' ELSE 'COLUMN STILL EXISTS' END;
