CREATE TABLE IF NOT EXISTS dx_core.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('company', 'group')),
  target_group VARCHAR(100),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_scope ON dx_core.announcements(scope);
CREATE INDEX IF NOT EXISTS idx_announcements_target_group ON dx_core.announcements(target_group);

INSERT INTO dx_core.announcements (title, body, scope, target_group, published_at)
VALUES
  ('Chào mừng đến DX-OS – hệ thống quản lý vận hành số',
   'DX-OS là nền tảng số hóa quy trình vận hành doanh nghiệp. Truy cập Portal để khám phá các không gian làm việc H, P, D, I và bắt đầu sử dụng các công cụ hỗ trợ.',
   'company', NULL, NOW() - INTERVAL '7 days'),
  ('Lịch bảo trì hệ thống tháng 10/2026',
   'Hệ thống sẽ bảo trì định kỳ vào ngày 05/10/2026 từ 22:00 đến 02:00. Vui lòng lưu công việc trước thời gian bảo trì.',
   'group', 'Kỹ thuật', NOW() - INTERVAL '3 days'),
  ('Quy trình onboarding nhân viên mới cập nhật',
   'Quy trình onboarding đã được cập nhật với các bước mới. Vui lòng xem chi tiết tại thư viện Resources và chuẩn bị tài liệu cho nhân viên mới.',
   'group', 'Nhân sự', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;
