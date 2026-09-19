-- =============================================================================
-- DX-LAB (DX-OS) - Demo Profile Initial Metadata Fixture (Placeholder)
-- Story 1.2 / AR-14 / AR-24
-- 
-- Rules:
-- 1. Idempotent: Can be run multiple times without duplicating data (ON CONFLICT DO NOTHING)
-- 2. Clearly labeled as demo fixture
-- Copyright (C) 2026 DX-LAB Development Team
-- License: AGPL-3.0
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS dx_core;

-- Demo metadata initialization marker
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
    'a0000000-0000-0000-0000-000000000002',
    'system-initializer',
    '2026-09-19T08:00:00Z',
    'DEMO_FIXTURE_INITIALIZED',
    'system_metadata',
    'dx-demo-init',
    'c0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    NULL,
    '{"status": "INITIALIZED", "profile": "demo"}',
    '{"is_demo": true, "environment": "demo", "label": "DEMO_PROFILE_FIXTURE", "story": "1.2"}'
) ON CONFLICT (id) DO NOTHING;
