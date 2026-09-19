---
title: 'Đồng bộ tài liệu kiến trúc và triển khai'
type: 'chore'
created: '2026-09-19'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/TECHNOLOGY-SOURCES.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Vấn đề:** Ba tài liệu trong `docs/` vẫn mô tả kiến trúc skeleton cũ, khiến người triển khai có thể giao quyền sở hữu nghiệp vụ cho Node-RED, dùng luồng API không còn hợp lệ hoặc làm theo hướng dẫn cài đặt không an toàn.

**Cách thực hiện:** Đồng bộ `docs/architecture/hpdi_architecture.md`, `docs/api/hpdi_api_spec.md` và `docs/installation.md` với Architecture Spine, Technology Sources và Story 1.1–1.2; đồng thời phân biệt rõ trạng thái repository hiện tại với kiến trúc đích chưa được triển khai.

</frozen-after-approval>

## Implementation Notes

- Đã viết lại ba tài liệu kỹ thuật bằng tiếng Việt UTF-8 và liên kết tới Architecture Spine cùng Technology Sources.
- Đã tách rõ skeleton hiện tại với kiến trúc đích của Story 1.1–1.2; không tuyên bố các thư mục hoặc profile chưa tồn tại là đã hoạt động.
- Đã loại bỏ quyền sở hữu nghiệp vụ của Node-RED, các endpoint/bảng placeholder, mật khẩu mẫu, cổng đặc quyền công khai và hướng dẫn dùng model alias trôi nổi.
- Không sửa `sprint-status.yaml` đang có thay đổi từ trước, cũng không sửa các tài liệu nguồn lập kế hoạch.
- Sau review, đã bổ sung quy tắc concurrency, retry/dead-letter/checkpoint, bảo vệ trình duyệt, callback AI, provenance báo cáo, cô lập môi trường, di trú schema và runbook phục hồi.

## Review Triage Log

- `medium — defer`: `README.md` và `BUILD.md` vẫn mô tả stack cũ; đây là lỗi có trước và nằm ngoài ba tài liệu trong Intent, đã ghi vào `deferred-work.md`.
- `medium — patch`: thiếu kiểm thử `412` cho phiên bản cũ và `409` cho xung đột nghiệp vụ; đã bổ sung quy ước và tiêu chí kiểm thử.
- `medium — patch`: thiếu retry giới hạn, dead-letter và checkpoint consumer; đã bổ sung vào quy tắc sự kiện và kiểm thử hợp đồng.
- `high — patch`: thiếu mã phiên mờ đã ký, CSRF/origin và rate limit; đã bổ sung vào ranh giới Web/BFF và API.
- `high — patch`: callback từ I chưa yêu cầu command P xác thực, idempotent; đã bổ sung hợp đồng và kiểm thử callback lặp/thiếu xác thực.
- `medium — patch`: snapshot thiếu provenance và mục tiêu cập nhật 60 giây; đã bổ sung toàn bộ trường và giới hạn độ mới.
- `medium — patch`: môi trường chưa tách secret, database, volume, hostname và identity; đã bổ sung yêu cầu cô lập và chuyển môi trường không sửa source.
- `medium — patch`: di trú chưa yêu cầu inventory, migration có phiên bản và cấm tạo sớm schema; đã bổ sung vào trình tự chuyển đổi.
- `medium — patch`: phần sao lưu thiếu metadata vận hành và quy trình phục hồi có kiểm chứng; đã bổ sung trạng thái thành phần, retention an toàn, cảnh báo, môi trường cô lập, bộ xác minh và bằng chứng.
