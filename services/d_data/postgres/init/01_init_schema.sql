-- =============================================================================
-- DX-LAB (DX-OS) - PostgreSQL Initial Database Schema
-- Defines dx_core schema and technical foundation tables:
--   - audit_logs (AD-12)
--   - outbox_events (AD-3, AD-21)
--   - idempotency_keys (AD-3)
-- Matches services/p_process/src/adapters/postgres/migrations/0001_initial_technical_schema.sql
-- Copyright (C) 2026 DX-LAB Development Team
-- License: AGPL-3.0
-- =============================================================================

-- Database for Keycloak IAM (AD-4, AD-5)
SELECT 'CREATE DATABASE dxlab_keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dxlab_keycloak')\gexec

CREATE SCHEMA IF NOT EXISTS dx_core;

-- Table 1: Immutable Audit Logs (AD-12)
CREATE TABLE IF NOT EXISTS dx_core.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_sub VARCHAR(255) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    action VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    correlation_id VARCHAR(255) NOT NULL,
    causation_id VARCHAR(255) NOT NULL,
    before_state JSONB,
    after_state JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at ON dx_core.audit_logs(occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_aggregate ON dx_core.audit_logs(aggregate_type, aggregate_id);

-- Table 2: Transactional Outbox Events (AD-3, AD-21)
CREATE TABLE IF NOT EXISTS dx_core.outbox_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_version INTEGER NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actor_sub VARCHAR(255) NOT NULL,
    correlation_id VARCHAR(255) NOT NULL,
    causation_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    last_attempted_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_status ON dx_core.outbox_events(status, created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_events_aggregate ON dx_core.outbox_events(aggregate_id, aggregate_version);

-- Table 3: Idempotency Keys (AD-3)
CREATE TABLE IF NOT EXISTS dx_core.idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    target_endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64),
    response_status INTEGER,
    response_headers JSONB,
    response_body JSONB,
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON dx_core.idempotency_keys(expires_at);

-- Story 1.3 business schema. Keep this bootstrap aligned with migration 0002.
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

-- Story 1.4: outbox notifications for confirmation emails. Keep this bootstrap aligned with migration 0004.
CREATE TABLE IF NOT EXISTS dx_core.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    ticket_id UUID NOT NULL REFERENCES dx_core.tickets(id),
    recipient_email VARCHAR(254) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD_LETTER')),
    retry_count INTEGER DEFAULT 0 NOT NULL,
    max_retries INTEGER DEFAULT 3 NOT NULL,
    last_error TEXT,
    provider_response JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_ticket_id ON dx_core.notifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON dx_core.notifications(status, created_at);

