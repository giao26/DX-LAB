CREATE TABLE IF NOT EXISTS dx_core.ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL UNIQUE REFERENCES dx_core.tickets(id) ON DELETE RESTRICT,
    storage_key UUID NOT NULL UNIQUE,
    original_name VARCHAR(255) NOT NULL,
    detected_mime VARCHAR(128) NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
    sha256 CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON dx_core.ticket_attachments(ticket_id);
