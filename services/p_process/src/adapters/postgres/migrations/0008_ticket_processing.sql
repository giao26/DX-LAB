ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS workflow_snapshot jsonb;
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS calendar_snapshot jsonb;
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS processing_steps jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS processing_result text;
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS sla_due_at timestamptz;
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS sla_overdue boolean NOT NULL DEFAULT false;
UPDATE dx_core.tickets SET closed_at = updated_at WHERE status = 'CLOSED' AND closed_at IS NULL;
