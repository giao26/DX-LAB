-- Story 1.7: Fair ticket assignment and staff roster schema
CREATE TABLE IF NOT EXISTS dx_core.staff_roster (
    sub VARCHAR(255) PRIMARY KEY,
    group_id VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    official_assignment_count INTEGER DEFAULT 0 NOT NULL,
    last_assigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_roster_group_active
  ON dx_core.staff_roster(group_id, is_active, official_assignment_count, last_assigned_at, sub);

CREATE INDEX IF NOT EXISTS idx_tickets_assigned_sub_active
  ON dx_core.tickets(assigned_sub, status) WHERE assigned_sub IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_fifo_queue
  ON dx_core.tickets(group_id, received_at, id) WHERE assigned_sub IS NULL AND status = 'WAITING';

-- Initial staff roster seed for complaints, consulting, warranty
INSERT INTO dx_core.staff_roster (sub, group_id, is_active, official_assignment_count)
VALUES
    ('11111111-1111-4111-8111-111111111111', 'warranty', TRUE, 0),
    ('22222222-2222-4222-8222-222222222222', 'warranty', TRUE, 0),
    ('44444444-4444-4444-8444-444444444441', 'complaints', TRUE, 0),
    ('44444444-4444-4444-8444-444444444442', 'complaints', TRUE, 0),
    ('55555555-5555-4555-8555-555555555551', 'consulting', TRUE, 0),
    ('55555555-5555-4555-8555-555555555552', 'consulting', TRUE, 0)
ON CONFLICT (sub) DO NOTHING;
