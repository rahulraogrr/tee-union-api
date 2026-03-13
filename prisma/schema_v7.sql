-- =============================================================================
--  TEE 1104 Union — Complete DDL  (schema_v7)
--  Telangana Electricity Employees Union
--  PostgreSQL 15+
--  Generated: March 2026
--  Includes: union_id FK on t_members (added during testing phase)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'admin',
  'zonal_officer',
  'rep',
  'member'
);

CREATE TYPE marital_status_type AS ENUM (
  'single',
  'married',
  'widowed',
  'divorced'
);

CREATE TYPE ticket_priority AS ENUM (
  'standard',
  'urgent',
  'critical'
);

CREATE TYPE ticket_status AS ENUM (
  'open',
  'in_progress',
  'escalated',
  'resolved',
  'closed'
);

CREATE TYPE notification_type AS ENUM (
  'ticket_update',
  'news',
  'event',
  'system'
);

CREATE TYPE platform_type AS ENUM (
  'ios',
  'android'
);

CREATE TYPE audit_action AS ENUM (
  'INSERT',
  'UPDATE',
  'DELETE'
);

CREATE TYPE unit_type AS ENUM (
  'circle',
  'branch',
  'depot',
  'division',
  'zone',
  'section'
);

-- ---------------------------------------------------------------------------
-- 1. LANGUAGES
-- ---------------------------------------------------------------------------

CREATE TABLE t_languages (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(10)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  native_name VARCHAR(100) NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. UNION IDENTITY
-- ---------------------------------------------------------------------------

CREATE TABLE t_union (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(200) NOT NULL,
  short_name          VARCHAR(50)  NOT NULL,
  description         TEXT,
  union_type          VARCHAR(100) NOT NULL,
  registration_number VARCHAR(100),
  founded_date        DATE,
  ho_phone            VARCHAR(15),
  ho_email            VARCHAR(150),
  ho_address          JSONB,
  logo_url            VARCHAR(500),
  primary_color       VARCHAR(10)  NOT NULL DEFAULT '#C62828',
  default_language_id UUID         REFERENCES t_languages(id),
  updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. TRANSLATIONS
-- ---------------------------------------------------------------------------

CREATE TABLE t_translations (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL,
  entity_id   UUID         NOT NULL,
  language_id UUID         NOT NULL REFERENCES t_languages(id),
  field       VARCHAR(100) NOT NULL,
  value       TEXT         NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),

  UNIQUE (entity_type, entity_id, language_id, field)
);

CREATE INDEX idx_t_translations_entity ON t_translations(entity_type, entity_id, language_id);

-- ---------------------------------------------------------------------------
-- 4. GEOGRAPHY
-- ---------------------------------------------------------------------------

CREATE TABLE t_countries (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  code       VARCHAR(10)  NOT NULL UNIQUE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE t_states (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID         NOT NULL REFERENCES t_countries(id),
  name       VARCHAR(100) NOT NULL,
  code       VARCHAR(10)  NOT NULL UNIQUE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE t_districts (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id   UUID         NOT NULL REFERENCES t_states(id),
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE t_work_units (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID      NOT NULL REFERENCES t_districts(id),
  name        VARCHAR(150) NOT NULL,
  unit_type   unit_type NOT NULL,
  is_active   BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_t_work_units_district ON t_work_units(district_id);

CREATE TABLE t_employers (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id   UUID         NOT NULL REFERENCES t_states(id),
  name       VARCHAR(200) NOT NULL,
  short_name VARCHAR(50)  NOT NULL,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. AUTHENTICATION & USERS
-- ---------------------------------------------------------------------------

CREATE TABLE t_users (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id        VARCHAR(50) NOT NULL UNIQUE,
  mobile_no          VARCHAR(15) NOT NULL,
  email              VARCHAR(150),
  pin_hash           VARCHAR(255) NOT NULL,
  one_time_pin_hash  VARCHAR(255),
  role               user_role   NOT NULL,
  is_pin_changed     BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by         UUID        REFERENCES t_users(id),
  last_login_at      TIMESTAMP,
  telegram_chat_id   BIGINT      UNIQUE,
  telegram_linked_at TIMESTAMP,
  created_at         TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_t_users_employee_id ON t_users(employee_id);
CREATE INDEX idx_t_users_role        ON t_users(role);

CREATE TABLE t_staff_profiles (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL UNIQUE REFERENCES t_users(id),
  full_name   VARCHAR(150) NOT NULL,
  mobile_no   VARCHAR(15)  NOT NULL,
  designation VARCHAR(100),
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 6. MEMBERS
-- ---------------------------------------------------------------------------

CREATE TABLE t_designations (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(150) NOT NULL,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE t_members (
  id                       UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID                NOT NULL UNIQUE REFERENCES t_users(id),
  union_id                 UUID                NOT NULL REFERENCES t_union(id),
  employee_id              VARCHAR(50)         NOT NULL,
  employer_id              UUID                NOT NULL REFERENCES t_employers(id),
  designation_id           UUID                NOT NULL REFERENCES t_designations(id),
  full_name                VARCHAR(200)        NOT NULL,
  district_id              UUID                NOT NULL REFERENCES t_districts(id),
  work_unit_id             UUID                REFERENCES t_work_units(id),
  member_since             DATE                NOT NULL,
  date_of_birth            DATE,
  mobile_no                VARCHAR(15)         NOT NULL,
  marital_status           marital_status_type,
  marriage_anniversary_date DATE,
  current_address          JSONB,
  permanent_address        JSONB,
  profile_complete         BOOLEAN             NOT NULL DEFAULT FALSE,
  is_active                BOOLEAN             NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMP           NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMP           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_t_members_union_id       ON t_members(union_id);
CREATE INDEX idx_t_members_district_id    ON t_members(district_id);
CREATE INDEX idx_t_members_work_unit_id   ON t_members(work_unit_id);
CREATE INDEX idx_t_members_employer_id    ON t_members(employer_id);
CREATE INDEX idx_t_members_designation_id ON t_members(designation_id);
CREATE INDEX idx_t_members_is_active      ON t_members(is_active);

CREATE TABLE t_member_designation_history (
  id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID      NOT NULL REFERENCES t_members(id),
  designation_id UUID      NOT NULL REFERENCES t_designations(id),
  employer_id    UUID      NOT NULL REFERENCES t_employers(id),
  work_unit_id   UUID      REFERENCES t_work_units(id),
  district_id    UUID      REFERENCES t_districts(id),
  valid_from     DATE      NOT NULL,
  valid_to       DATE,
  changed_by     UUID      NOT NULL REFERENCES t_users(id),
  notes          TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (member_id, valid_from)
);

CREATE INDEX idx_t_member_desig_history_member     ON t_member_designation_history(member_id);
CREATE INDEX idx_t_member_desig_history_member_from ON t_member_designation_history(member_id, valid_from);
CREATE INDEX idx_t_member_desig_history_valid_to    ON t_member_designation_history(valid_to);

CREATE TABLE t_rep_assignments (
  id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID      NOT NULL REFERENCES t_users(id),
  district_id  UUID      NOT NULL REFERENCES t_districts(id),
  work_unit_id UUID      REFERENCES t_work_units(id),
  assigned_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  assigned_by  UUID      REFERENCES t_users(id),
  is_active    BOOLEAN   NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_t_rep_assignments_district ON t_rep_assignments(district_id, is_active);
CREATE INDEX idx_t_rep_assignments_user     ON t_rep_assignments(user_id, is_active);

-- ---------------------------------------------------------------------------
-- 7. TICKETING & GRIEVANCES
-- ---------------------------------------------------------------------------

CREATE TABLE t_ticket_categories (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(150) NOT NULL,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE t_tickets (
  id                        UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id                 UUID            NOT NULL REFERENCES t_members(id),
  assigned_rep_id           UUID            REFERENCES t_users(id),
  assigned_zonal_officer_id UUID            REFERENCES t_users(id),
  category_id               UUID            REFERENCES t_ticket_categories(id),
  title                     VARCHAR(200)    NOT NULL,
  description               TEXT,
  priority                  ticket_priority NOT NULL DEFAULT 'standard',
  status                    ticket_status   NOT NULL DEFAULT 'open',
  district_id               UUID            REFERENCES t_districts(id),
  work_unit_id              UUID            REFERENCES t_work_units(id),
  sla_deadline              TIMESTAMP       NOT NULL,
  resolved_at               TIMESTAMP,
  created_at                TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_t_tickets_status         ON t_tickets(status);
CREATE INDEX idx_t_tickets_member         ON t_tickets(member_id);
CREATE INDEX idx_t_tickets_rep            ON t_tickets(assigned_rep_id);
CREATE INDEX idx_t_tickets_zonal          ON t_tickets(assigned_zonal_officer_id);
CREATE INDEX idx_t_tickets_sla            ON t_tickets(sla_deadline);
CREATE INDEX idx_t_tickets_district       ON t_tickets(district_id);
CREATE INDEX idx_t_tickets_created        ON t_tickets(created_at);

CREATE TABLE t_ticket_comments (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID      NOT NULL REFERENCES t_tickets(id),
  user_id     UUID      NOT NULL REFERENCES t_users(id),
  comment     TEXT      NOT NULL,
  is_internal BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_t_ticket_comments_ticket ON t_ticket_comments(ticket_id);

CREATE TABLE t_ticket_status_history (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID          NOT NULL REFERENCES t_tickets(id),
  changed_by   UUID          NOT NULL REFERENCES t_users(id),
  old_status   ticket_status NOT NULL,
  new_status   ticket_status NOT NULL,
  notes        TEXT,
  changed_at   TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_t_ticket_status_history_ticket     ON t_ticket_status_history(ticket_id);
CREATE INDEX idx_t_ticket_status_history_changed_at ON t_ticket_status_history(changed_at);

-- ---------------------------------------------------------------------------
-- 8. NEWS & EVENTS
-- ---------------------------------------------------------------------------

CREATE TABLE t_news (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en      VARCHAR(250) NOT NULL,
  title_te      VARCHAR(250),
  body_en       TEXT         NOT NULL,
  body_te       TEXT,
  published_by  UUID         REFERENCES t_users(id),
  is_published  BOOLEAN      NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMP,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_t_news_published ON t_news(is_published, published_at);

CREATE TABLE t_events (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en       VARCHAR(250) NOT NULL,
  title_te       VARCHAR(250),
  description_en TEXT,
  description_te TEXT,
  event_date     TIMESTAMP    NOT NULL,
  location       VARCHAR(300),
  max_capacity   INTEGER,
  is_virtual     BOOLEAN      NOT NULL DEFAULT FALSE,
  district_id    UUID         REFERENCES t_districts(id),
  created_by     UUID         REFERENCES t_users(id),
  is_published   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_t_events_date     ON t_events(event_date);
CREATE INDEX idx_t_events_district ON t_events(district_id);

CREATE TABLE t_event_registrations (
  id            UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID      NOT NULL REFERENCES t_events(id),
  member_id     UUID      NOT NULL REFERENCES t_members(id),
  registered_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (event_id, member_id)
);

-- ---------------------------------------------------------------------------
-- 9. NOTIFICATIONS
-- ---------------------------------------------------------------------------

CREATE TABLE t_notifications (
  id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID              NOT NULL REFERENCES t_users(id),
  title         VARCHAR(200)      NOT NULL,
  body          TEXT              NOT NULL,
  type          notification_type NOT NULL,
  reference_id  UUID,
  is_read       BOOLEAN           NOT NULL DEFAULT FALSE,
  sent_at       TIMESTAMP         NOT NULL DEFAULT NOW(),
  read_at       TIMESTAMP,
  fcm_sent      BOOLEAN           NOT NULL DEFAULT FALSE,
  telegram_sent BOOLEAN           NOT NULL DEFAULT FALSE,
  sms_sent      BOOLEAN           NOT NULL DEFAULT FALSE,
  delivered_via VARCHAR(20),
  is_critical   BOOLEAN           NOT NULL DEFAULT FALSE,
  is_urgent     BOOLEAN           NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_t_notifications_user_read ON t_notifications(user_id, is_read);
CREATE INDEX idx_t_notifications_sent_at   ON t_notifications(sent_at);
CREATE INDEX idx_t_notifications_fcm       ON t_notifications(fcm_sent, is_read, sent_at);

CREATE TABLE t_telegram_link_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES t_users(id),
  token      VARCHAR(10) NOT NULL UNIQUE,
  expires_at TIMESTAMP   NOT NULL,
  used_at    TIMESTAMP,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_t_telegram_link_tokens_token   ON t_telegram_link_tokens(token);
CREATE INDEX idx_t_telegram_link_tokens_user_id ON t_telegram_link_tokens(user_id);

CREATE TABLE t_notification_jobs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID        NOT NULL REFERENCES t_notifications(id),
  channel         VARCHAR(20) NOT NULL,
  scheduled_at    TIMESTAMP   NOT NULL,
  processed_at    TIMESTAMP,
  skipped         BOOLEAN     NOT NULL DEFAULT FALSE,
  skip_reason     VARCHAR(50),
  created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_t_notification_jobs_notification ON t_notification_jobs(notification_id);

CREATE TABLE t_push_tokens (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES t_users(id),
  token       TEXT          NOT NULL,
  platform    platform_type NOT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP
);

CREATE INDEX idx_t_push_tokens_user ON t_push_tokens(user_id);

-- ---------------------------------------------------------------------------
-- 10. AUDIT LOG
-- ---------------------------------------------------------------------------

CREATE TABLE t_audit_logs (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name   VARCHAR(100) NOT NULL,
  record_id    UUID         NOT NULL,
  action       audit_action NOT NULL,
  changed_by   UUID         REFERENCES t_users(id),
  old_values   JSONB,
  new_values   JSONB,
  ip_address   VARCHAR(45),
  user_agent   VARCHAR(500),
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_t_audit_logs_table_record ON t_audit_logs(table_name, record_id);
CREATE INDEX idx_t_audit_logs_changed_by   ON t_audit_logs(changed_by);
CREATE INDEX idx_t_audit_logs_created_at   ON t_audit_logs(created_at);
CREATE INDEX idx_t_audit_logs_table_name   ON t_audit_logs(table_name);
