-- Story 1.3: public ticket intake business tables.
CREATE SEQUENCE IF NOT EXISTS dx_core.ticket_code_seq START WITH 1;

CREATE TABLE IF NOT EXISTS dx_core.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_normalized VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    contact_review_required BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS dx_core.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES dx_core.customers(id),
    description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 4000),
    status VARCHAR(20) DEFAULT 'WAITING' NOT NULL CHECK (status IN ('WAITING', 'IN_PROGRESS', 'CLOSED')),
    provisional_type VARCHAR(30) NOT NULL CHECK (provisional_type IN ('Khiếu nại', 'Tư vấn', 'Bảo hành')),
    contact_review_required BOOLEAN DEFAULT FALSE NOT NULL,
    received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_customer ON dx_core.tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status_received ON dx_core.tickets(status, received_at);
