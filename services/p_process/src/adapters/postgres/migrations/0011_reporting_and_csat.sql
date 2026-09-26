-- Migration 0011: Reporting and CSAT ratings (Story 3.1)
-- Creates csat_ratings table, v_reporting_tickets_v1 view without PII,
-- and configures read-only reporting role dxlab_reporter.

CREATE TABLE IF NOT EXISTS dx_core.csat_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES dx_core.tickets(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_csat_ratings_ticket_id ON dx_core.csat_ratings(ticket_id);
CREATE INDEX IF NOT EXISTS idx_csat_ratings_score ON dx_core.csat_ratings(score);

CREATE OR REPLACE VIEW dx_core.v_reporting_tickets_v1 AS
SELECT
  t.id,
  t.code,
  t.status,
  t.provisional_type,
  t.group_id,
  t.assigned_sub,
  t.received_at,
  t.closed_at,
  t.sla_due_at,
  t.sla_overdue,
  t.processing_steps,
  c.id AS csat_id,
  c.score AS csat_score,
  c.created_at AS csat_created_at,
  t.created_at,
  t.updated_at
FROM dx_core.tickets t
LEFT JOIN dx_core.csat_ratings c ON t.id = c.ticket_id;

-- Role dxlab_reporter with read-only permission on reporting view only (AR-4, AR-10)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dxlab_reporter') THEN
    CREATE ROLE dxlab_reporter WITH LOGIN PASSWORD 'dxlab_reporter_pass';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END
$$;

DO $$
BEGIN
  GRANT USAGE ON SCHEMA dx_core TO dxlab_reporter;
  GRANT SELECT ON dx_core.v_reporting_tickets_v1 TO dxlab_reporter;
  REVOKE ALL ON dx_core.customers FROM dxlab_reporter;
  REVOKE ALL ON dx_core.ticket_attachments FROM dxlab_reporter;
  REVOKE ALL ON dx_core.audit_logs FROM dxlab_reporter;
  REVOKE ALL ON dx_core.outbox_events FROM dxlab_reporter;
  REVOKE ALL ON dx_core.idempotency_keys FROM dxlab_reporter;
  REVOKE ALL ON dx_core.notifications FROM dxlab_reporter;
  REVOKE ALL ON dx_core.staff_roster FROM dxlab_reporter;
  REVOKE ALL ON dx_core.tickets FROM dxlab_reporter;
  REVOKE ALL ON dx_core.csat_ratings FROM dxlab_reporter;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END
$$;
