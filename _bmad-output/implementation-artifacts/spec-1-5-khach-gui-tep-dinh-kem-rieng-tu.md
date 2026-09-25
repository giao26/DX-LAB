---
title: 'Story 1.5: Khách gửi tệp đính kèm riêng tư'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'dispatch'
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
---

## Intent

Khách có thể gửi tối đa một ảnh hoặc PDF minh họa cùng biểu mẫu ticket. Lõi P là nơi xác minh tệp, tạo checksum, lưu metadata và liên kết với ticket; byte tệp nằm trong private storage ngoài web root bằng khóa UUID mờ.

## Boundaries & Constraints

**Always:**

- Chấp nhận một tệp JPG/JPEG, PNG, WebP hoặc PDF không quá 10 MiB; không đính kèm vẫn tạo ticket bình thường.
- P kiểm tra đồng thời extension, MIME khai báo, magic bytes, kích thước và SHA-256 trước khi ghi ticket.
- Metadata gồm tên hiển thị đã làm sạch, kích thước, MIME phát hiện, checksum và thời điểm tạo.
- Metadata, ticket, notification, audit, outbox và phản hồi idempotency nằm trong cùng transaction; file đã ghi được dọn nếu transaction rollback.
- Replay cùng `Idempotency-Key` và payload trả cùng ticket/cùng attachment, không tạo file hay metadata mới.
- UI giữ trường văn bản khi lỗi, focus tóm tắt lỗi và liên kết tới input tệp.

**Never:**

- Không đặt byte tệp trong PostgreSQL, web root, log, audit, response hoặc outbox.
- Không trả `storage_key` cho Web/khách và không mở đường tải công khai trước khi chính sách quyền Story 1.6 được áp dụng.
- Không tạo ticket nếu có nhiều tệp, tệp quá lớn hoặc extension/MIME/chữ ký không khớp.

## Implementation

- [x] Domain validator nhận diện JPEG, PNG, WebP và PDF theo chữ ký; tạo SHA-256.
- [x] Filesystem storage adapter ghi file mode `0600` dưới thư mục riêng bằng UUID mờ.
- [x] Migration `0005_private_ticket_attachments.sql` và bootstrap schema lưu metadata một-tệp-mỗi-ticket.
- [x] Transaction tạo ticket ghi attachment và dọn file khi rollback.
- [x] BFF nhận multipart có giới hạn kích thước; form hiển thị hướng dẫn, lỗi theo trường và giữ dữ liệu.
- [x] OpenAPI, Docker volume, biến môi trường và tài liệu vận hành được đồng bộ.
- [x] Unit/HTTP/UI/BFF tests bao phủ MIME giả, nhiều tệp, multipart và luồng không có tệp.

## Verification

- `npm test` tại `services/p_process` (hoặc `node --test --test-isolation=none ...` trên Windows sandbox): 27 tests pass.
- `npm test` tại `apps/web`: 12 tests pass.
- `npm run build` tại `services/p_process`: pass.
- `npm run lint` tại `apps/web`: pass.
- `npm run test:e2e` tại `apps/web`: 4 tests pass.
- `python scripts/test-architecture.py`: all checks pass.
- `docker compose config --quiet`: pass.

## Deferred Boundary

Endpoint tải tệp có xác thực và policy theo quan hệ phân công thuộc Story 1.6. Story 1.5 cố ý không phát hành endpoint đọc nào, vì mã ticket hoặc attachment ID không phải quyền truy cập.
