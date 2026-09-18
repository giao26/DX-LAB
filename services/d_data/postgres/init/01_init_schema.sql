-- =============================================================================
-- DX-LAB (DX-OS) - PostgreSQL Initial Database Schema
-- Copyright (C) 2026 DX-LAB Development Team
-- License: AGPL-3.0
-- =============================================================================

-- Tạo schema riêng biệt cho hệ điều hành số DX-OS
CREATE SCHEMA IF NOT EXISTS dx_core;

-- Bảng 1: Nhật ký kiểm toán hệ thống (Audit Log)
CREATE TABLE IF NOT EXISTS dx_core.audit_logs (
    id SERIAL PRIMARY KEY,
    source_layer VARCHAR(10) NOT NULL, -- H, P, D, I
    event_name VARCHAR(100) NOT NULL,
    actor_id VARCHAR(50),
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 2: Chỉ số vận hành số (Operational Metrics) phục vụ Apache Superset
CREATE TABLE IF NOT EXISTS dx_core.system_metrics (
    id SERIAL PRIMARY KEY,
    metric_key VARCHAR(100) NOT NULL,
    metric_value NUMERIC(12, 4) NOT NULL,
    department VARCHAR(50),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 3: Hàng đợi đồng bộ tri thức từ Odoo sang Vector DB (Qdrant)
CREATE TABLE IF NOT EXISTS dx_core.knowledge_sync_queue (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_text TEXT NOT NULL,
    sync_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSED, FAILED
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tạo chỉ mục tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON dx_core.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON dx_core.system_metrics(recorded_at);
