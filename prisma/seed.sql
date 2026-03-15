-- =============================================================================
--  TEE 1104 Union — Seed Data
--  Telangana Electricity Employees Union
--  Run this in DataGrip against your Railway PostgreSQL database
--  Safe to re-run — uses ON CONFLICT DO NOTHING where possible
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. UNION IDENTITY
-- -----------------------------------------------------------------------------

INSERT INTO t_union (
  id, name, short_name, description, union_type,
  registration_number, founded_date,
  ho_phone, ho_email, ho_address,
  logo_url, primary_color, updated_at
)
VALUES (
  gen_random_uuid(),
  'Telangana Electricity Employees 1104'' Union',
  'TEE 1104'' UNION',
  'A registered trade union representing electricity employees across Telangana state under TSGENCO, TSTRANSCO, TSSPDCL and TSNPDCL.',
  'Trade Union',
  '1104',
  '1960-01-01',
  '+914023456789',
  'tee1104union@gmail.com',
  '{"line1": "Union Bhavan", "city": "Hyderabad", "state": "Telangana", "pin": "500001"}',
  null,
  '#C62828',
  now()
);

-- -----------------------------------------------------------------------------
-- 1. COUNTRY & STATE
-- -----------------------------------------------------------------------------

INSERT INTO t_countries (id, name, code)
VALUES (gen_random_uuid(), 'India', 'IN')
ON CONFLICT (code) DO NOTHING;

INSERT INTO t_states (id, country_id, name, code)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM t_countries WHERE code = 'IN'),
  'Telangana',
  'TS'
)
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. ALL 33 TELANGANA DISTRICTS
-- -----------------------------------------------------------------------------

INSERT INTO t_districts (id, state_id, name) VALUES
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Adilabad'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Bhadradri Kothagudem'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Hyderabad'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Jagtial'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Jangaon'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Jayashankar Bhupalpally'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Jogulamba Gadwal'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Kamareddy'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Karimnagar'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Khammam'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Kumuram Bheem Asifabad'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Mahabubabad'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Mahabubnagar'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Mancherial'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Medak'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Medchal-Malkajgiri'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Mulugu'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Nagarkurnool'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Nalgonda'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Narayanpet'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Nirmal'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Nizamabad'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Peddapalli'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Rajanna Sircilla'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Rangareddy'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Sangareddy'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Siddipet'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Suryapet'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Vikarabad'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Wanaparthy'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Warangal Rural'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Warangal Urban'),
  (gen_random_uuid(), (SELECT id FROM t_states WHERE code = 'TS'), 'Yadadri Bhuvanagiri');

-- -----------------------------------------------------------------------------
-- 3. EMPLOYERS (all 4 Telangana electricity companies)
-- -----------------------------------------------------------------------------

INSERT INTO t_employers (id, state_id, name, short_name) VALUES
  (
    gen_random_uuid(),
    (SELECT id FROM t_states WHERE code = 'TS'),
    'Telangana State Power Generation Corporation Limited',
    'TSGENCO'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM t_states WHERE code = 'TS'),
    'Telangana State Transmission Corporation Limited',
    'TSTRANSCO'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM t_states WHERE code = 'TS'),
    'Telangana Southern Power Distribution Company Limited',
    'TSSPDCL'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM t_states WHERE code = 'TS'),
    'Telangana Northern Power Distribution Company Limited',
    'TSNPDCL'
  );

-- -----------------------------------------------------------------------------
-- 4. DESIGNATIONS
-- -----------------------------------------------------------------------------

INSERT INTO t_designations (id, name) VALUES
  (gen_random_uuid(), 'Lineman'),
  (gen_random_uuid(), 'Junior Lineman'),
  (gen_random_uuid(), 'Assistant Engineer'),
  (gen_random_uuid(), 'Junior Engineer'),
  (gen_random_uuid(), 'Sub Engineer'),
  (gen_random_uuid(), 'Helper');

-- -----------------------------------------------------------------------------
-- 5. WORK UNITS (one per district for Hyderabad — expand as needed)
-- -----------------------------------------------------------------------------

INSERT INTO t_work_units (id, district_id, name, unit_type) VALUES
  (
    gen_random_uuid(),
    (SELECT id FROM t_districts WHERE name = 'Hyderabad'),
    'Hyderabad Central Circle',
    'circle'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM t_districts WHERE name = 'Hyderabad'),
    'Hyderabad North Zone',
    'zone'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM t_districts WHERE name = 'Karimnagar'),
    'Karimnagar Circle',
    'circle'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM t_districts WHERE name = 'Warangal Urban'),
    'Warangal Circle',
    'circle'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM t_districts WHERE name = 'Nizamabad'),
    'Nizamabad Circle',
    'circle'
  );

-- -----------------------------------------------------------------------------
-- 6. MEMBER ROWS FOR TEST USERS
--    Creates one Member per test user so profile endpoints work.
--    Each user gets a different employer/designation/district to test filters.
-- -----------------------------------------------------------------------------

-- EMP-MEMBER → member role → TSSPDCL, Lineman, Hyderabad
INSERT INTO t_members (
  id, user_id, union_id,
  employer_id, designation_id,
  full_name, district_id,
  member_since, mobile_no,
  is_active, profile_complete
)
SELECT
  gen_random_uuid(),
  u.id,
  (SELECT id FROM t_union WHERE short_name = 'TEE 1104'' UNION'),
  (SELECT id FROM t_employers WHERE short_name = 'TSSPDCL'),
  (SELECT id FROM t_designations WHERE name = 'Lineman'),
  'Test Member',
  (SELECT id FROM t_districts WHERE name = 'Hyderabad'),
  '2020-01-01',
  '9000000001',
  true,
  false
FROM t_users u
WHERE u.employee_id = 'EMP-MEMBER'
ON CONFLICT (user_id) DO NOTHING;

-- EMP-REP → rep role → TSNPDCL, Junior Engineer, Karimnagar
INSERT INTO t_members (
  id, user_id, union_id,
  employer_id, designation_id,
  full_name, district_id,
  member_since, mobile_no,
  is_active, profile_complete
)
SELECT
  gen_random_uuid(),
  u.id,
  (SELECT id FROM t_union WHERE short_name = 'TEE 1104'' UNION'),
  (SELECT id FROM t_employers WHERE short_name = 'TSNPDCL'),
  (SELECT id FROM t_designations WHERE name = 'Junior Engineer'),
  'Test Rep',
  (SELECT id FROM t_districts WHERE name = 'Karimnagar'),
  '2018-06-01',
  '9000000002',
  true,
  false
FROM t_users u
WHERE u.employee_id = 'EMP-REP'
ON CONFLICT (user_id) DO NOTHING;

-- EMP-ZONAL → zonal_officer role → TSTRANSCO, Assistant Engineer, Warangal Urban
INSERT INTO t_members (
  id, user_id, union_id,
  employer_id, designation_id,
  full_name, district_id,
  member_since, mobile_no,
  is_active, profile_complete
)
SELECT
  gen_random_uuid(),
  u.id,
  (SELECT id FROM t_union WHERE short_name = 'TEE 1104'' UNION'),
  (SELECT id FROM t_employers WHERE short_name = 'TSTRANSCO'),
  (SELECT id FROM t_designations WHERE name = 'Assistant Engineer'),
  'Test Zonal Officer',
  (SELECT id FROM t_districts WHERE name = 'Warangal Urban'),
  '2015-03-15',
  '9000000003',
  true,
  false
FROM t_users u
WHERE u.employee_id = 'EMP-ZONAL'
ON CONFLICT (user_id) DO NOTHING;

-- EMP-ADMIN → admin role → TSGENCO, Sub Engineer, Nizamabad
INSERT INTO t_members (
  id, user_id, union_id,
  employer_id, designation_id,
  full_name, district_id,
  member_since, mobile_no,
  is_active, profile_complete
)
SELECT
  gen_random_uuid(),
  u.id,
  (SELECT id FROM t_union WHERE short_name = 'TEE 1104'' UNION'),
  (SELECT id FROM t_employers WHERE short_name = 'TSGENCO'),
  (SELECT id FROM t_designations WHERE name = 'Sub Engineer'),
  'Test Admin',
  (SELECT id FROM t_districts WHERE name = 'Nizamabad'),
  '2012-07-01',
  '9000000004',
  true,
  false
FROM t_users u
WHERE u.employee_id = 'EMP-ADMIN'
ON CONFLICT (user_id) DO NOTHING;

-- EMP-SUPERADMIN → super_admin role → TSGENCO, Assistant Engineer, Hyderabad
INSERT INTO t_members (
  id, user_id, union_id,
  employer_id, designation_id,
  full_name, district_id,
  member_since, mobile_no,
  is_active, profile_complete
)
SELECT
  gen_random_uuid(),
  u.id,
  (SELECT id FROM t_union WHERE short_name = 'TEE 1104'' UNION'),
  (SELECT id FROM t_employers WHERE short_name = 'TSGENCO'),
  (SELECT id FROM t_designations WHERE name = 'Assistant Engineer'),
  'Test Super Admin',
  (SELECT id FROM t_districts WHERE name = 'Hyderabad'),
  '2010-01-01',
  '9000000005',
  true,
  false
FROM t_users u
WHERE u.employee_id = 'EMP-SUPERADMIN'
ON CONFLICT (user_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. TICKET CATEGORIES
-- -----------------------------------------------------------------------------

INSERT INTO t_ticket_categories (id, name, is_active) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Salary',          true),
  ('a1000000-0000-0000-0000-000000000002', 'Provident Fund',  true),
  ('a1000000-0000-0000-0000-000000000003', 'Transfer',        true),
  ('a1000000-0000-0000-0000-000000000004', 'Medical',         true),
  ('a1000000-0000-0000-0000-000000000005', 'Other',           true)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. VERIFY — run these SELECTs to confirm everything was inserted
-- -----------------------------------------------------------------------------

SELECT 'districts'  AS table_name, COUNT(*) AS row_count FROM t_districts
UNION ALL
SELECT 'employers'  AS table_name, COUNT(*) AS row_count FROM t_employers
UNION ALL
SELECT 'designations' AS table_name, COUNT(*) AS row_count FROM t_designations
UNION ALL
SELECT 'work_units' AS table_name, COUNT(*) AS row_count FROM t_work_units
UNION ALL
SELECT 'members'    AS table_name, COUNT(*) AS row_count FROM t_members
UNION ALL
SELECT 'users'      AS table_name, COUNT(*) AS row_count FROM t_users;
