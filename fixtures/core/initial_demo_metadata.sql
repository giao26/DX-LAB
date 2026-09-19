-- =============================================================================
-- DX-LAB (DX-OS) - Core Profile Initial Demo Metadata Fixture
-- Story 1.2 AC 3 / AR-14 / AR-24
-- 
-- Rules:
-- 1. Idempotent: Can be run multiple times without duplicating data (ON CONFLICT DO NOTHING)
-- 2. Stable IDs: Uses deterministic UUIDs and keys for testing and verification
-- 3. Clearly labeled: All records explicitly tagged with demo metadata
-- 4. Technical scope only: Only populates dx_core foundation tables (audit_logs, outbox_events, idempotency_keys)
--    NO premature business tables (tickets, assignments, etc.)
-- Copyright (C) 2026 DX-LAB Development Team
-- License: AGPL-3.0
-- =============================================================================

-- Ensure technical schema exists
CREATE SCHEMA IF NOT EXISTS dx_core;

-- 1. Sample Technical Audit Log (labeled as demo)
INSERT INTO dx_core.audit_logs (
    id,
    actor_sub,
    occurred_at,
    action,
    aggregate_type,
    aggregate_id,
    correlation_id,
    causation_id,
    before_state,
    after_state,
    metadata
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'system-initializer',
    '2026-09-19T08:00:00Z',
    'CORE_FIXTURE_INITIALIZED',
    'system_metadata',
    'dx-core-init',
    'c0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    NULL,
    '{"status": "INITIALIZED", "fixture_version": "1.2.0"}',
    '{"is_demo": true, "environment": "demo", "label": "DEMO_CORE_FIXTURE", "story": "1.2"}'
) ON CONFLICT (id) DO NOTHING;

-- 2. Sample Technical Outbox Event (labeled as demo)
INSERT INTO dx_core.outbox_events (
    event_id,
    event_type,
    aggregate_id,
    aggregate_version,
    occurred_at,
    actor_sub,
    correlation_id,
    causation_id,
    payload,
    status,
    retry_count
) VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'system.core.initialized.v1',
    'dx-core-init',
    1,
    '2026-09-19T08:00:00Z',
    'system-initializer',
    'c0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    '{"service": "p_process", "event": "core_ready", "is_demo": true, "label": "DEMO_CORE_FIXTURE"}',
    'PROCESSED',
    0
) ON CONFLICT (event_id) DO NOTHING;

-- 3. Sample Technical Idempotency Key (labeled as demo)
INSERT INTO dx_core.idempotency_keys (
    key,
    target_endpoint,
    request_hash,
    response_status,
    response_headers,
    response_body,
    locked_at,
    expires_at
) VALUES (
    'demo-idempotency-key-00000001',
    '/api/v1/system/init',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    200,
    '{"content-type": "application/json"}',
    '{"status": "ok", "is_demo": true, "label": "DEMO_CORE_FIXTURE"}',
    NULL,
    '2026-12-31T23:59:59Z'
) ON CONFLICT (key) DO NOTHING;
