---
title: 'Đồng bộ README và hướng dẫn build'
type: 'chore'
created: '2026-09-19'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md'
  - '{project-root}/docs/architecture/hpdi_architecture.md'
  - '{project-root}/docs/installation.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Vấn đề:** `README.md` và `BUILD.md` đang giới thiệu Node-RED là lõi P, công bố các cổng đặc quyền và hướng dẫn chạy Compose skeleton như một stack đã được hỗ trợ, trái với kiến trúc đã chốt.

**Cách thực hiện:** Viết lại hai điểm vào bằng tiếng Việt để mô tả đúng H–P–D–I, phân biệt trạng thái skeleton với kiến trúc đích Story 1.1–1.2, ngừng quảng bá lệnh triển khai chưa an toàn và dọn mục công việc hoãn tương ứng sau khi hoàn tất.

</frozen-after-approval>

## Implementation Notes

- Đã viết lại `README.md` và `BUILD.md` bằng tiếng Việt UTF-8, bỏ tuyên bố PoF 100% khi chưa có bằng chứng và không còn quảng bá stack skeleton như bản chạy được hỗ trợ.
- Đã mô tả P là lõi TypeScript/Fastify; Node-RED chỉ lập lịch và chuyển giao, đồng thời nêu rõ cấu trúc đích chưa tồn tại.
- Đã loại bỏ bảng cổng đặc quyền và Quick Start cũ; thay bằng điều kiện Story 1.1–1.2 và các cổng chất lượng trước khi công bố lệnh.
- Đã xóa `deferred-work.md` vì mục hoãn duy nhất đã được xử lý trong thay đổi này.
- Sau review, đã bổ sung đường Superset qua Caddy/BFF với guest token RLS, hoàn thiện cây cấu trúc đích, cảnh báo CONTRIBUTING cũ và mở rộng cổng replay-safety.

## Review Triage Log

- `medium — patch`: README trỏ tới CONTRIBUTING còn dựa trên skeleton cũ; đã cảnh báo rõ không dùng hướng dẫn build/Node-RED trong tài liệu đó trước Story 1.1–1.2.
- `medium — patch`: sơ đồ thiếu đường tới Superset và ranh giới guest token/RLS; đã bổ sung Caddy `/analytics/*` và BFF cấp scope.
- `medium — patch`: cây đích thiếu notification, reporting, exports và fixtures; đã bổ sung và ghi rõ đây là bản rút gọn, Architecture Spine mới là cây đầy đủ.
- `high — patch`: cổng chất lượng chưa bao phủ idempotency, concurrency, outbox và delivery trùng/đảo thứ tự; đã bổ sung toàn bộ điều kiện cùng side effect nghiệp vụ.
- `false`: trạng thái `in-progress` là trạng thái bắt buộc trong lúc triển khai; workflow chỉ chuyển spec sang `done` sau khi review hoàn tất, và bước này đã thực hiện việc chuyển trạng thái.
