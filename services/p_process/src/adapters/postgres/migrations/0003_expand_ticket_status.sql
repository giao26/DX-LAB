-- Keep existing Story 1.3 installations compatible with the documented lifecycle.
ALTER TABLE dx_core.tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE dx_core.tickets
  ADD CONSTRAINT tickets_status_check CHECK (status IN ('WAITING', 'IN_PROGRESS', 'CLOSED'));
