-- Story 1.6: additive responsibility scope used by SQL-scoped reads.
ALTER TABLE dx_core.tickets
  ADD COLUMN IF NOT EXISTS group_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS assigned_sub VARCHAR(255);

-- Existing tickets intentionally remain group_id = NULL and are denied by every read query.
-- Operators must assign an explicit, reviewed group_id; category/description inference is forbidden.

CREATE INDEX IF NOT EXISTS idx_tickets_group_received
  ON dx_core.tickets(group_id, received_at, id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_sub
  ON dx_core.tickets(assigned_sub) WHERE assigned_sub IS NOT NULL;
