-- =============================================================================
-- DX-LAB (DX-OS) - AI Profile Initial Metadata Fixture (Placeholder)
-- Story 1.2 / AR-14 / AR-24
-- 
-- Rules:
-- 1. Idempotent: Can be run multiple times without duplicating data (ON CONFLICT DO NOTHING)
-- 2. Clearly labeled as demo/ai fixture
-- Copyright (C) 2026 DX-LAB Development Team
-- License: AGPL-3.0
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS dx_core;

-- AI metadata initialization marker
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
    'a0000000-0000-0000-0000-000000000003',
    'system-initializer',
    '2026-09-19T08:00:00Z',
    'AI_FIXTURE_INITIALIZED',
    'system_metadata',
    'dx-ai-init',
    'c0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003',
    NULL,
    '{"status": "INITIALIZED", "profile": "ai"}',
    '{"is_demo": true, "environment": "demo", "label": "AI_PROFILE_FIXTURE", "story": "1.2"}'
) ON CONFLICT (id) DO NOTHING;
