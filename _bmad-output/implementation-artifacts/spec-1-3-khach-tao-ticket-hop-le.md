---
title: 'Story 1.3: Khách tạo ticket hợp lệ'
type: 'feature'
created: '2026-09-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '6e3ef3a3d761f72f615f60a1b6544ae83dcad1e4'
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** DX-LAB chưa có form web, API hay bảng nghiệp vụ để tiếp nhận ticket. Hợp đồng khung còn yêu cầu `title` trái Story 1.3 và thiếu loại yêu cầu, chuẩn hóa điện thoại, lỗi theo trường, chống gửi trùng.

**Approach:** Tạo lát cắt Next.js/BFF → P → PostgreSQL: kiểm tra ở UI và nơi ghi, nối khách theo điện thoại chuẩn hóa, tạo ticket `WAITING` cùng mã/thời gian máy chủ trong một transaction, ghi outbox và replay `Idempotency-Key`.

## Boundaries & Constraints

**Always:** Form chỉ có họ tên, điện thoại, email, `Khiếu nại | Tư vấn | Bảo hành` và mô tả; không thêm tiêu đề. Dữ liệu sai không tạo khách, ticket, audit hay outbox. Mã duy nhất khi đồng thời; thời gian UTC từ máy chủ. Trùng điện thoại tái dùng khách; tên/email xung đột chỉ bật cờ rà soát, không ghi đè. Cùng key/payload replay phản hồi đầu; cùng key/khác payload trả `409`. Form giữ dữ liệu, focus error summary hoặc xác nhận, dùng bàn phím và không cuộn ngang tại 320 CSS px/zoom 200%.

**Quyết định chuẩn hóa điện thoại:** Dùng quy tắc Việt Nam: bỏ khoảng trắng, dấu chấm và dấu gạch; đổi tiền tố `+84` hoặc `84` thành `0`; sau chuẩn hóa chỉ chấp nhận 10–11 chữ số bắt đầu bằng `0`.

**Never:** Không gửi email (1.4), nhận tệp (1.5), phân quyền (1.6), phân công/AI/SLA/CSAT. Browser không gọi DB/dịch vụ nội bộ trực tiếp; không ghi PII vào log/lỗi; mã ticket không phải bí mật truy cập.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Hợp lệ, số mới | Đủ năm trường, key mới | Tạo customer, ticket `WAITING`, audit/outbox; trả `201`, mã, `receivedAt` | Transaction nguyên tử |
| Ticket hợp lệ, số đã có | Phone chuẩn hóa khớp hồ sơ | Tái dùng customer; không tạo trùng | Xung đột tên/email bật `contactReviewRequired`, giữ dữ liệu cũ |
| Không hợp lệ | Thiếu trường, email/phone/type sai | Không tạo dữ liệu; UI giữ giá trị, focus error summary | `400` có `errors[field]` |
| Gửi lại | Cùng key và cùng payload | Trả cùng status/body/mã ticket | Khác payload với cùng key trả `409` |
| Gửi đồng thời | Hai request hợp lệ | Mã ticket không trùng; mỗi key tạo tối đa một ticket | Constraint/transaction xử lý race |

</frozen-after-approval>

## Code Map

- `contracts/openapi/p-api.yaml`, `contracts/events/ticket-created.v1.schema.json` — năm trường, enum, field errors, replay `200/201`; bỏ `title`/PII không cần khỏi event.
- `services/p_process/src/domain/` — quy tắc ticket/customer/phone/conflict/mã; không phụ thuộc Fastify/Drizzle.
- `services/p_process/src/application/` — create use case và ports repository/unit-of-work/idempotency/audit/outbox.
- `services/p_process/src/adapters/postgres/{schema.ts,migrations/0002_ticket_intake.sql}` — customers, tickets, sequence và transaction; đồng bộ init SQL.
- `services/p_process/src/adapters/http/routes/tickets.ts`, `app.ts` — POST tickets, validation/RFC 9457 và dependency injection.
- `apps/web/` — Next.js 16/React 19 BFF và form tiếng Việt: labels, error focus, pending guard, success status.
- `docker-compose.yml`, `infra/caddy/Caddyfile` — web trong demo và định tuyến qua ingress, không mở cổng nội bộ.
- `services/p_process/test/`, `apps/web/` tests, CI, `scripts/test-architecture.py` — unit/integration/contract/UI/a11y và cập nhật gate bảng nghiệp vụ.

## Tasks & Acceptance

**Execution:**
- [x] `contracts/` — chốt contract request/response/event và lỗi theo trường trước khi viết adapters.
- [x] `services/p_process/src/domain`, `src/application` — validation, chuẩn hóa, customer match/conflict, mã và create use case nguyên tử/idempotent.
- [x] PostgreSQL adapters/init — migration, repositories, constraints và concurrency tests.
- [x] `services/p_process/src/adapters/http` — nối POST route, Problem Details và replay semantics; thêm API tests.
- [x] `apps/web`, Compose, Caddy — dựng form/BFF đáp ứng và ingress.
- [x] CI và architecture tests — chạy build/lint/test/contract/UI, bảo vệ ranh giới.

**Acceptance Criteria:**
- Given payload hợp lệ, when gửi form, then đúng một ticket `WAITING` có mã/thời gian máy chủ và focus tới xác nhận.
- Given payload sai, when gửi, then không có dữ liệu/side effect; form giữ giá trị và focus tóm tắt liên kết lỗi.
- Given phone đã có, when tạo ticket, then dùng customer cũ; tên/email khác bật cờ rà soát, không ghi đè.
- Given cùng key được thử lại hoặc gửi đồng thời, when xử lý, then cùng payload nhận cùng ticket và payload khác bị `409`.
- Given viewport 320 CSS px, zoom 200% hoặc chỉ bàn phím, when hoàn tất form, then không cuộn ngang và mọi nhãn, lỗi, focus, điều khiển đều dùng được.

## Implementation Notes

- Tạo lát cắt Next.js/BFF → Fastify P → PostgreSQL; P tự áp dụng migration đã version hóa khi khởi động và Compose đợi PostgreSQL healthy.
- Idempotency dùng UUID, hash payload chuẩn định thứ tự khóa, TTL 24 giờ, replay an toàn khi đồng thời và `409` cho payload khác kể cả payload sai validation.
- Customer được định danh bằng điện thoại chuẩn hóa; dữ liệu chuẩn không bị ghi đè, response trả hồ sơ đã lưu và bật cờ rà soát khi xung đột.
- Audit/outbox nằm cùng transaction, event không chứa PII; form có client/server validation, giữ dữ liệu lỗi, focus summary/xác nhận và khóa control lúc pending.

## Spec Change Log

## Review Triage Log

| Nguồn | Verdict | Route | Bằng chứng |
|---|---|---|---|
| Verification 1 | medium | patch | Integration chưa truy vấn audit/outbox; xóa hai INSERT vẫn không làm test thất bại. |
| Verification 2 | medium | patch | Test chỉ nhìn response, chưa chứng minh tên/email chuẩn trong customer không bị ghi đè. |
| Verification 3 | medium | patch | Replay cùng key mới chạy tuần tự; contention cùng key chưa được kiểm tra. |
| Verification 4 | medium | patch | Component mock fetch và Playwright chưa gửi form; handler BFF chưa có test chuyển tiếp. |
| Verification 5 | medium | patch | Gate chỉ đọc SQL; chưa tự động chạy chuỗi nâng cấp 0001 → 0002. |
| Blind 1 | medium | patch | Volume đã có không chạy init SQL và P chưa có migration runner, nên bảng 0002 có thể thiếu. |
| Blind 2 | medium | patch | CHECK status chỉ cho WAITING sẽ chặn IN_PROGRESS/CLOSED ở các story kế tiếp. |
| Blind 3 | medium | patch | expires_at được ghi nhưng không được xét; key hiện sống vô hạn. |
| Blind 4 | false | reject | Hiện chỉ create-ticket dùng idempotency; chưa có endpoint thứ hai có thể va chạm key. |
| Blind 5 | medium | patch | Validation chạy trước tra key nên same-key/different invalid payload trả 400 thay vì 409. |
| Blind 6 | medium | patch | Response conflict lấy tên/email đầu vào dù DB giữ hồ sơ customer hiện hữu. |
| Blind 7 | medium | patch | BFF làm mất Location, Idempotency-Replayed và Retry-After của P. |
| Blind 8 | low | patch | Location trỏ tới GET chưa được triển khai trong phạm vi story; bỏ header cho tới story đọc ticket. |
| Blind 9 | medium | patch | Success cũ không được xóa khi người dùng bắt đầu yêu cầu mới. |
| Blind 10 | medium | patch | OpenAPI yêu cầu UUID nhưng route/tests chấp nhận chuỗi tùy ý. |
| Blind 11 | medium | patch | depends_on chưa đợi PostgreSQL sẵn sàng; health P không kiểm tra DB. |
| Blind 12 | medium | patch | Playwright chỉ kiểm tra trang ban đầu, trùng bằng chứng Verification 4. |
| Blind 13 | low | patch | Audit sau tạo thiếu các trường nghiệp vụ an toàn customerId/type/review flag. |
| Blind 14 | low | patch | tsconfig.tsbuildinfo là cache sinh tự động và chưa được gitignore. |
| Edge 1 | medium | patch | Route không thực thi format UUID đã công bố, cùng nguyên nhân Blind 10. |
| Edge 2 | medium | patch | Row hết hạn vẫn replay/conflict, cùng nguyên nhân Blind 3. |
| Edge 3 | maybe-false | reject | Cần một transaction bị treo thực tế để chứng minh cạn pool; lock bình thường tự giải phóng khi request đầu commit. |
| Edge 4 | false | reject | lpad đặt độ rộng tối thiểu; spec chỉ yêu cầu mã duy nhất, không giới hạn đúng sáu chữ số. |
| Edge 5 | low | patch | So sánh tên chưa NFC nên hai biểu diễn Unicode tương đương có thể bật cờ rà soát. |
| Edge 6 | medium | patch | request.text() đọc toàn body trước validation, cho phép body lớn gây áp lực bộ nhớ BFF. |
| Edge 7 | medium | patch | BFF không chuyển tiếp header semantics, cùng nguyên nhân Blind 7. |
| Edge 8 | medium | patch | Xác nhận cũ và lỗi mới có thể cùng xuất hiện, cùng nguyên nhân Blind 9. |
| Edge 9 | medium | patch | Control vẫn sửa được lúc pending và success sau đó xóa các chỉnh sửa chưa gửi. |

## Design Notes

- API không nhận `title`. BFF tạo một key mỗi lần gửi logic và giữ key khi retry; P quyết định replay. Migration chỉ bổ sung bảng/index/sequence, cần test clean install và upgrade từ `0001`.

## Verification

**Commands:**
- `npm test --prefix services/p_process` và integration test PostgreSQL — domain/API/transaction/idempotency PASS.
- `npm test --prefix apps/web` và kiểm tra Playwright/axe — form, focus, keyboard, 320 px và zoom 200% PASS.
- `python scripts/test-architecture.py` — contracts, profiles, ingress và ownership PASS.
- `docker compose --profile demo config` — web/P/PostgreSQL nối đúng mạng và chỉ Caddy mở cổng host.

**Kết quả 2026-09-23:** P 10/10 test; Web 6/6 test; Playwright/axe 3/3; Next production build PASS; architecture gate PASS; PostgreSQL integration matrix PASS; Web BFF integration PASS; clean install và nâng cấp 0001→0003 PASS; `npm audit` production Web/P không có lỗ hổng.
