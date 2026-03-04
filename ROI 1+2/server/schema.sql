-- Planted ESG Assessment – Database Schema
-- Run once: psql $DATABASE_URL -f server/schema.sql

CREATE TABLE IF NOT EXISTS assessments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        VARCHAR(20) NOT NULL DEFAULT 'draft',      -- draft | submitted
  progress_pct  INTEGER     DEFAULT 0,
  company_name  VARCHAR(500),
  write_token   VARCHAR(100) NOT NULL,
  payload_json  JSONB,
  outputs_json  JSONB,
  validation_errors_json JSONB
);

CREATE TABLE IF NOT EXISTS events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID        REFERENCES assessments(id) ON DELETE CASCADE,
  at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type           VARCHAR(50),
  diff_json      JSONB
);

CREATE INDEX IF NOT EXISTS idx_assessments_status    ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_created   ON assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_assessment_id  ON events(assessment_id);
