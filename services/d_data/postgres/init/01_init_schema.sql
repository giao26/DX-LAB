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
