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
    group_id VARCHAR(100),
    assigned_sub VARCHAR(255),
    contact_review_required BOOLEAN DEFAULT FALSE NOT NULL,
    received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_customer ON dx_core.tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status_received ON dx_core.tickets(status, received_at);
CREATE INDEX IF NOT EXISTS idx_tickets_group_received ON dx_core.tickets(group_id, received_at, id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_sub ON dx_core.tickets(assigned_sub) WHERE assigned_sub IS NOT NULL;

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

-- Story 1.5: only metadata is stored in PostgreSQL; bytes live in a private volume.
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

-- Story 1.7: fair ticket assignment and staff roster schema
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
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS workflow_snapshot jsonb;
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS calendar_snapshot jsonb;
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS processing_steps jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS processing_result text;
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS sla_due_at timestamptz;
ALTER TABLE dx_core.tickets ADD COLUMN IF NOT EXISTS sla_overdue boolean NOT NULL DEFAULT false;
UPDATE dx_core.tickets SET closed_at = updated_at WHERE status = 'CLOSED' AND closed_at IS NULL;

-- Story 2.2: Resources knowledge library (SOP/FAQ)
CREATE TABLE IF NOT EXISTS dx_core.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('sop', 'faq')),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'superseded')),
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    approver_name VARCHAR(120),
    published_at TIMESTAMPTZ,
    summary TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_resources_code_version UNIQUE (code, version)
);

CREATE INDEX IF NOT EXISTS idx_resources_status_effective
  ON dx_core.resources(status, effective_date);

CREATE INDEX IF NOT EXISTS idx_resources_type_status
  ON dx_core.resources(type, status);

INSERT INTO dx_core.resources (
    id, code, type, title, status, version, effective_date, approver_name, published_at, summary, content
) VALUES
(
    '60000000-0000-4000-8000-000000000001',
    'SOP-TKT-001',
    'sop',
    'Quy trình tiếp nhận và phân công ticket',
    'published',
    '1.0.0',
    '2026-01-01',
    'Ban Giám đốc',
    '2026-01-01T08:00:00Z',
    'Quy định các bước tiếp nhận, phân loại và tự động phân công ticket khách hàng đến nhân viên phụ trách.',
    '# SOP-TKT-001: Quy trình tiếp nhận và phân công ticket

## 1. Mục đích
Quy định trình tự, trách nhiệm và tiêu chuẩn thời gian trong việc tiếp nhận thông tin yêu cầu từ khách hàng qua cổng thông tin trực tuyến và phân phối đến đúng bộ phận nghiệp vụ.

## 2. Phạm vi áp dụng
Áp dụng cho toàn bộ nhân viên thuộc các nhóm tiếp nhận và xử lý yêu cầu (Khiếu nại, Tư vấn, Bảo hành).

## 3. Các bước thực hiện
- **Bước 1 (Tiếp nhận):** Yêu cầu được gửi từ khách hàng sẽ tự động ghi nhận vào hệ thống với trạng thái `WAITING`.
- **Bước 2 (Chuẩn hóa thông tin):** Kiểm tra tính hợp lệ của số điện thoại, email và nội dung mô tả sự vụ.
- **Bước 3 (Phân công):** Thuật toán tự động phân bổ ticket theo hàng đợi công bằng (fair rotation) cho nhân viên đang hoạt động trong nhóm.
- **Bước 4 (Xử lý & Phản hồi):** Nhân viên được phân công tiến hành xử lý theo đúng cam kết thời gian SLA.

## 4. Trách nhiệm & Giám sát
Trưởng nhóm và Trưởng bộ phận chịu trách nhiệm giám sát tiến độ xử lý và chỉ số vi phạm SLA định kỳ hàng ngày.'
),
(
    '60000000-0000-4000-8000-000000000002',
    'SOP-WAR-001',
    'sop',
    'Quy trình kiểm tra và xử lý bảo hành',
    'published',
    '1.0.0',
    '2026-01-15',
    'Trưởng phòng Kỹ thuật',
    '2026-01-15T09:00:00Z',
    'Hướng dẫn chi tiết tiêu chuẩn tiếp nhận thiết bị, kiểm tra điều kiện bảo hành và quy trình sửa chữa/đổi mới.',
    '# SOP-WAR-001: Quy trình kiểm tra và xử lý bảo hành

## 1. Mục đích
Thiết lập chuẩn mực kỹ thuật trong việc thẩm định sản phẩm, xác định phạm vi bảo hành và thực hiện khắc phục sự cố phần cứng, phần mềm cho khách hàng.

## 2. Tiêu chuẩn tiếp nhận
- Sản phẩm có tem bảo hành nguyên vẹn, số serial trùng khớp với hồ sơ mua hàng.
- Không có dấu hiệu hư hỏng do tác động ngoại lực, vào nước hoặc can thiệp trái phép.

## 3. Quy trình 4 bước
1. **Kiểm tra ngoại quan và kích hoạt hồ sơ:** Ghi nhận hiện trạng vật lý, chụp ảnh đính kèm hồ sơ ticket.
2. **Chẩn đoán kỹ thuật:** Kỹ thuật viên kiểm tra lỗi chức năng trong vòng tối đa 04 giờ làm việc.
3. **Thông báo phương án khắc phục:** Trao đổi với khách hàng về phương án sửa chữa miễn phí hoặc chi phí phát sinh nếu từ chối bảo hành.
4. **Bàn giao và nghiệm thu:** Kiểm tra chất lượng lần cuối trước khi hoàn trả thiết bị cho khách hàng.'
),
(
    '60000000-0000-4000-8000-000000000003',
    'FAQ-GEN-001',
    'faq',
    'Hướng dẫn dành cho nhân viên mới và câu hỏi thường gặp',
    'published',
    '1.0.0',
    '2026-02-01',
    'Phòng Nhân sự',
    '2026-02-01T08:30:00Z',
    'Giải đáp các thắc mắc phổ biến về tài khoản, không gian làm việc số H/P/D/I và quyền hạn trong DX-OS.',
    '# FAQ-GEN-001: Hướng dẫn dành cho nhân viên mới và câu hỏi thường gặp

### Q1: Tôi cần liên hệ ai khi tài khoản bị khóa hoặc không đăng nhập được?
**Trả lời:** Vui lòng liên hệ quản trị viên hệ thống qua kênh nội bộ hoặc gửi yêu cầu tới Phòng Nhân sự kèm mã định danh nhân viên.

### Q2: Các không gian H, P, D, I trên Portal có ý nghĩa gì?
**Trả lời:**
- **H (Human - Con người):** Không gian văn hóa, thông báo nội bộ, tri thức và kết nối hệ thống điều hành tác nghiệp.
- **P (Process - Tiến trình):** Trung tâm điều phối quy trình số, tiếp nhận và phân công công việc.
- **D (Data - Dữ liệu):** Báo cáo quản trị, chỉ số vận hành và kho dữ liệu hợp nhất (dành cho cấp quản lý).
- **I (Intelligence - Trí tuệ):** Trợ lý hỗ trợ ra quyết định thông minh và tối ưu hóa vận hành.

### Q3: Tài liệu SOP và FAQ có giá trị hiệu lực như thế nào?
**Trả lời:** Mọi nhân viên phải tuân thủ đúng các phiên bản SOP/FAQ được công bố chính thức trên thư viện Resources. Bản nháp hoặc hướng dẫn chưa phê duyệt không có giá trị thi hành.'
),
(
    '60000000-0000-4000-8000-000000000004',
    'SOP-SEC-DRAFT',
    'sop',
    'Quy trình an toàn thông tin nội bộ - bản nháp',
    'draft',
    '0.1.0',
    '2026-10-01',
    'Chưa phê duyệt',
    NULL,
    'Tài liệu nháp về các tiêu chuẩn an toàn bảo mật và bảo vệ dữ liệu nội bộ.',
    '# SOP-SEC-DRAFT: Quy trình an toàn thông tin nội bộ - bản nháp

Tài liệu này đang trong quá trình soạn thảo, xin ý kiến đóng góp từ các phòng ban. Tuyệt đối không áp dụng trước khi có quyết định ban hành chính thức.'
)
ON CONFLICT (code, version) DO NOTHING;

