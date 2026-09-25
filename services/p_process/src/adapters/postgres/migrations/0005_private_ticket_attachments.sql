-- Story 1.5: private attachment metadata. File bytes remain in private storage.
CREATE TABLE IF NOT EXISTS dx_core.ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID UNIQUE NOT NULL REFERENCES dx_core.tickets(id) ON DELETE CASCADE,
    storage_key UUID UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
    detected_mime VARCHAR(100) NOT NULL CHECK (detected_mime IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
    checksum_sha256 CHAR(64) NOT NULL CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON dx_core.ticket_attachments(ticket_id);
