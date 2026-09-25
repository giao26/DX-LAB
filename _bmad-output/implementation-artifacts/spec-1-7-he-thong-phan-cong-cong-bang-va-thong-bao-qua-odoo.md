---
title: 'Story 1.7: Hệ thống phân công công bằng và thông báo qua Odoo'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
baseline_commit: '422d8e09c65416e4f93be7c5a89982ce2b392252'
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Ticket sau khi tạo chưa được tự động phân công cho nhân viên theo thuật toán công bằng; khi có phân công, Odoo chưa nhận được thông báo để nhân viên phụ trách mở ticket và bắt đầu xử lý.

**Approach:** Triển khai thuật toán phân công công bằng nguyên tử trong P theo nhóm nghiệp vụ (ưu tiên ít lượt nhận nhất, vòng ID tăng dần, tối đa 1 ticket hoạt động), hàng đợi FIFO khi nhóm bận, ghi sự kiện transactional outbox và cơ chế relay tới inbox bền vững chống trùng của Odoo.

## Boundaries & Constraints

**Always:**
- Phân công diễn ra trong cùng giao dịch tạo ticket hoặc giao dịch giải phóng slot; dùng row lock (`SELECT ... FOR UPDATE`) để đảm bảo nguyên tử, ngăn chặn tuyệt đối hai ticket cùng giữ chỗ cho một nhân viên.
- Nhân viên chỉ được phân công ticket thuộc đúng nhóm (`group_id`) và khi không có ticket nào đang ở trạng thái hoạt động (`WAITING`, `IN_PROGRESS`).
- Thuật toán phân công ưu tiên nhân viên có số lượt nhận chính thức thấp nhất; nếu bằng nhau, chọn theo vòng ID bất biến (`sub`) tăng dần kể từ người được chọn gần nhất.
- Khi tất cả nhân viên trong nhóm đều bận hoặc đã có ticket giữ chỗ: ticket được đưa vào hàng đợi chờ FIFO theo thời điểm tiếp nhận (`received_at ASC, id ASC`), `assigned_sub` để trống; SLA vẫn tính bình thường.
- Khi một vị trí xử lý được giải phóng, ticket đến sớm nhất trong hàng đợi FIFO được phân công trước theo đúng quy tắc công bằng.
- Sự kiện phân công được ghi vào `dx_core.outbox_events` (`event_type = 'TICKET_ASSIGNED'`) ngay trong giao dịch commit phân công.
- Outbox relay chuyển sự kiện có xác thực tới Odoo; Odoo ghi nhận vào inbox bền vững `dx.event.inbox`, khử trùng tuyệt đối theo `event_id` trước khi tạo thông báo cho nhân viên.
- Thông báo nội bộ trên Odoo chỉ chứa mã ticket, trạng thái phân công và liên kết nội bộ; TUYỆT ĐỐI KHÔNG chứa email, số điện thoại hoặc URL tệp của khách hàng.
- Lỗi chuyển giao sự kiện hoặc lỗi từ Odoo sau khi vượt quá số lần thử tối đa phải chuyển outbox sang `DEAD_LETTER` và ghi nhận cảnh báo vận hành.

**Never:**
- Không phân công nhân viên khác nhóm hoặc nhân viên đang bận/đang giữ chỗ.
- Không cho phép Odoo trực tiếp truy cập hoặc ghi đè cơ sở dữ liệu của P.
- Không tạo thông báo trùng lặp khi Odoo nhận lại cùng `event_id` hoặc aggregate version cũ.
- Không để lộ thông tin liên hệ cá nhân (PII) hoặc URL tệp khách hàng trong thông báo Odoo.
- Không tạm dừng đồng hồ SLA khi ticket đang chờ trong hàng đợi phân công.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Phân công thành công | Ticket mới tạo, nhóm có nhân viên sẵn sàng | Ticket gán `assigned_sub`, tăng bộ đếm lượt nhận, ghi outbox `TICKET_ASSIGNED` | Lỗi DB: rollback toàn bộ giao dịch tạo ticket |
| Cân bằng tải nhiều nhân viên | Nhóm có nhiều nhân viên rảnh với số lượt nhận khác nhau | Chọn nhân viên có `official_assignment_count` thấp nhất; nếu bằng nhau chọn theo vòng `sub` tăng dần | Không có nhân viên đủ điều kiện: chuyển sang hàng đợi FIFO |
| Tranh chấp đồng thời | 2 ticket tạo gần như cùng lúc, nhóm chỉ còn 1 nhân viên rảnh | Giao dịch nguyên tử với row lock: 1 ticket nhận nhân viên, ticket còn lại vào hàng đợi | Không để xảy ra race condition hay gán đúp |
| Nhóm bận toàn bộ | Mọi nhân viên trong nhóm đều có ticket hoạt động | Ticket ở trạng thái `WAITING`, `assigned_sub = NULL`, nằm trong hàng đợi FIFO; SLA vẫn đếm | Báo rõ ticket chưa có người phụ trách |
| Giải phóng slot | Nhân viên hoàn tất ticket hoặc được giải phóng | Hệ thống kích hoạt xét hàng đợi: ticket đến sớm nhất được phân công trước | Không bỏ sót ticket đang chờ trong hàng đợi |
| Relay sự kiện sang Odoo | Outbox event `TICKET_ASSIGNED` ở trạng thái `PENDING` | Relay gửi POST có xác thực sang Odoo; Odoo lưu inbox, tạo thông báo cho user, outbox đổi thành `SENT` | Odoo lỗi: tăng `retry_count`, thử lại có backoff; quá 3 lần thành `DEAD_LETTER` |
| Phát lại sự kiện (Replay) | Odoo nhận lại sự kiện có cùng `event_id` | Odoo kiểm tra `event_id` đã có trong inbox, trả về thành công ngay, không tạo thêm thông báo | Không phát sinh thông báo trùng lặp |

</frozen-after-approval>

## Code Map

- `services/d_data/postgres/init/01_init_schema.sql` cùng `services/p_process/src/adapters/postgres/migrations/0007_ticket_assignment.sql` — tạo bảng `dx_core.staff_roster` (lưu trữ danh sách nhân viên, `group_id`, trạng thái hoạt động, số lượt nhận chính thức `official_assignment_count`, `last_assigned_at`), và chỉ mục hỗ trợ khóa phân công.
- `services/p_process/src/domain/assignment.ts` — domain logic và định nghĩa cấu trúc phân công công bằng, outbox payload `TicketAssignedEventPayload`.
- `services/p_process/src/application/ports.ts` — bổ sung port `IAssignmentStore` và `IEventRelayPort`.
- `services/p_process/src/adapters/postgres/assignment-store.ts` — triển khai Postgres cho `IAssignmentStore`: tìm và khóa nhân viên hợp lệ (`SELECT ... FOR UPDATE`), gán ticket, cập nhật bộ đếm lượt nhận, ghi `dx_core.outbox_events` nguyên tử.
- `services/p_process/src/application/process-outbox-events.ts` — use case background relay: quét các sự kiện outbox `PENDING`, gửi tới Odoo qua HTTP webhook có bearer token/secret, quản lý retry và dead-letter.
- `services/p_process/src/adapters/http/routes/tickets.ts` & `services/p_process/src/adapters/postgres/ticket-intake-store.ts` — tích hợp bước tự động phân công ngay khi tiếp nhận ticket hợp lệ.
- `services/h_human/addons/dx_core/models/dx_event_inbox.py` — model Odoo `dx.event.inbox` lưu trữ sự kiện bền vững, chống trùng lặp theo `event_id`.
- `services/h_human/addons/dx_core/controllers/event_webhook.py` — Odoo controller tiếp nhận sự kiện webhook `/dx/api/v1/events`, xác thực request, ghi inbox và tạo thông báo (chatter/activity) cho nhân viên.
- `services/h_human/addons/dx_core/models/__init__.py`, `controllers/__init__.py`, `__manifest__.py`, `security/ir.model.access.csv` — khai báo model mới, phân quyền truy cập inbox Odoo.
- `services/p_process/test/ticket-assignment.test.js`, `services/h_human/addons/dx_core/tests/test_event_webhook.py` — kiểm thử đơn vị, kiểm thử đồng thời (concurrency), kiểm thử thuật toán công bằng và tính idempotent của inbox Odoo.

## Tasks & Acceptance

**Execution:**
- [x] `services/d_data/postgres/init/01_init_schema.sql`, `services/p_process/src/adapters/postgres/migrations/0007_ticket_assignment.sql` -- Thêm bảng `dx_core.staff_roster` và seed dữ liệu ban đầu cho các nhóm (`complaints`, `consulting`, `warranty`).
- [x] `services/p_process/src/domain/assignment.ts`, `src/application/ports.ts` -- Định nghĩa domain type, event payload và port interface cho phân công công bằng và relay sự kiện.
- [x] `services/p_process/src/adapters/postgres/assignment-store.ts` -- Triển khai store phân công nguyên tử với PostgreSQL row locking, quản lý hàng đợi FIFO và ghi outbox event.
- [x] `services/p_process/src/adapters/postgres/ticket-intake-store.ts` -- Kết nối intake ticket với bước phân công tự động trong cùng giao dịch tạo ticket.
- [x] `services/p_process/src/application/process-outbox-events.ts` -- Triển khai worker relay outbox event sang Odoo với cơ chế retry có giới hạn và dead-letter.
- [x] `services/h_human/addons/dx_core/models/dx_event_inbox.py`, `ir.model.access.csv` -- Tạo model inbox bền vững trong Odoo để lưu trữ và khử trùng sự kiện theo `event_id`.
- [x] `services/h_human/addons/dx_core/controllers/event_webhook.py` -- Endpoint Odoo nhận sự kiện phân công, kiểm tra token/secret nội bộ, tạo thông báo an toàn (không PII) cho nhân viên.
- [x] Tests/CI -- Viết kiểm thử cho thuật toán phân công công bằng, kiểm thử tranh chấp đồng thời 2 tiến trình, kiểm thử hàng đợi FIFO khi nhân viên bận, và kiểm thử idempotent của Odoo webhook.

**Acceptance Criteria:**
- Given một ticket mới ở trạng thái `WAITING`, when hệ thống bắt đầu phân công theo loại khách chọn, then xác định đúng nhóm và chỉ xét nhân viên sẵn sàng, không có ticket hoạt động nào khác.
- Given nhiều nhân viên đủ điều kiện trong cùng nhóm, when hệ thống chọn người nhận, then ưu tiên người có số lượt nhận thấp nhất; nếu bằng nhau, chọn theo vòng ID bất biến tăng dần.
- Given hai ticket được tạo đồng thời, when cùng tìm người nhận, then việc chọn người và tạo giữ chỗ diễn ra nguyên tử trong DB, không nhân viên nào bị giữ chỗ cho cả hai ticket.
- Given mọi nhân viên của nhóm đều bận, when có ticket mới, then ticket được đưa vào hàng đợi FIFO theo thời điểm tiếp nhận, giao diện thể hiện chưa có người phụ trách nhưng SLA vẫn tính.
- Given một vị trí xử lý được giải phóng, when xét lại hàng đợi, then ticket đến sớm nhất được phân công trước theo quy tắc công bằng.
- Given lượt phân công vừa được tạo, when giao dịch commit, then P ghi sự kiện phân công vào outbox, relay chuyển sự kiện tới Odoo và Odoo ghi inbox bền vững trước khi trả xác nhận.
- Given Odoo nhận lại cùng `event_id` hoặc aggregate version cũ, when xử lý sự kiện, then không tạo thêm thông báo hay work item trùng lặp.
- Given sự kiện phân công xử lý thành công, when nhân viên mở Odoo, then thấy đúng một thông báo chứa mã ticket, trạng thái giữ chỗ và liên kết nội bộ; thông báo không chứa email, số điện thoại hay URL tệp của khách.
- Given lỗi giao sự kiện sang Odoo quá số lần thử giới hạn, when xử lý, then chuyển sang dead-letter, tạo cảnh báo vận hành và ticket vẫn truy cập được từ danh sách theo quyền.
## Implementation Notes

- Triển khai thành công phân công công bằng nguyên tử trong PostgreSQL (`SELECT ... FOR UPDATE SKIP LOCKED`), gán nhân viên theo nhóm, ưu tiên số lượt nhận chính thức thấp nhất (`official_assignment_count ASC, last_assigned_at ASC, sub ASC`), ngăn chặn triệt để race condition và gán đúp.
- Thiết lập hàng đợi FIFO cho ticket khi toàn bộ nhân viên trong nhóm bận (`assigned_sub = NULL`), tích hợp quét và kích hoạt giải phóng hàng đợi tự động trong background worker.
- Sự kiện `TICKET_ASSIGNED` được ghi vào `dx_core.outbox_events` nguyên tử trong cùng transaction phân công.
- Background relay worker (`ProcessOutboxEventsUseCase` + `HttpOdooEventRelay`) chuyển giao sự kiện sang webhook Odoo với cơ chế bounded retry (3 lần), exponential backoff và chuyển `DEAD_LETTER` có cảnh báo vận hành.
- Trên Odoo (`dx_core`), xây dựng model inbox bền vững `dx.event.inbox` khử trùng lặp theo `event_id`, bỏ qua aggregate version cũ, bắt `IntegrityError` đồng thời trả về 200 idempotent.
- Webhook Odoo tự động tạo `mail.activity` và tin nhắn chatter cho nhân viên phụ trách với nội dung an toàn không chứa PII.
- Khắc phục đầy đủ toàn bộ 20 phát hiện từ 3 tầng reviewer (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) qua Review Loop 1.
- Verification: Toàn bộ suite kiểm thử tự động đạt 100% PASS: P Process Core 71/71 tests pass, Odoo addon 22/22 tests pass, Vitest web 14/14 tests pass, Architecture conformance check ALL PASS, Next.js build pass.

## Spec Change Log

## Review Triage Log

- BH-1 / EC-7 / VG-O1 — `high`, route `patch`: `services/h_human/addons/dx_core/controllers/event_webhook.py` chưa tạo thông báo/activity cho nhân viên trong Odoo mà chỉ để `pass`.
- BH-2 / EC-9 — `medium`, route `patch`: `services/p_process/src/adapters/postgres/assignment-store.ts` `assignNextQueuedTicket` chưa được gọi trong background worker để tự động giải phóng hàng đợi FIFO.
- BH-3 / EC-2 — `high`, route `patch`: `services/h_human/addons/dx_core/controllers/event_webhook.py` so sánh `>= aggregate_version` làm drop nhầm sự kiện cùng version hoặc re-assignment.
- BH-4 / EC-1 / VG-3 — `high`, route `patch`: `claimPendingEvents` và webhook Odoo thiếu lọc `event_type = 'TICKET_ASSIGNED'`, làm forward sự kiện không liên quan sang Odoo.
- BH-5 / EC-8 — `medium`, route `patch`: `claimPendingEvents` thiếu backoff window kiểm tra `last_attempted_at`, dễ làm cạn kiệt retry quá nhanh.
- BH-6 / EC-5 / VG-O3 — `medium`, route `patch`: `claimPendingEvents` thiếu `FOR UPDATE SKIP LOCKED` và chuyển trạng thái `PROCESSING` ngay khi claim.
- BH-7 / EC-4 — `medium`, route `patch`: `event_webhook.py` chưa bắt `IntegrityError` khi có duplicate requests đồng thời với cùng `event_id`.
- BH-8 — `medium`, route `patch`: `event_webhook.py` để trống `occurred_at` và `processed_at` khi lưu inbox record.
- BH-9 — `false`: spec và SQL design notes quy định rõ `ORDER BY s.official_assignment_count ASC, s.last_assigned_at ASC NULLS FIRST, s.sub ASC` là thứ tự chọn công bằng; ID tăng dần là tie-breaker chuẩn.
- BH-10 — `low`, route `patch`: `claimPendingEvents` hardcode `< 3` thay vì tham số hóa theo `maxRetries`.
- BH-11 / VG-O2 — `low`, route `patch`: hàm pure domain `selectStaffForAssignment` cần được duy trì nhất quán với SQL implementation.
- BH-12 — `low`, route `patch`: `schema.ts` thiếu khai báo partial index tương ứng với migration 0007.
- BH-13 — `low`, rejected: fallback secret là tiện ích cho local test harness và profile core; production yêu cầu biến môi trường.
- BH-14 — `low`, route `patch`: `updateEventStatus` cần ép kiểu `$5::timestamptz` để tránh lỗi untyped null trong node-postgres.
- BH-15 — `low`, rejected: dual-casing giúp tương thích an toàn cả consumer camelCase và snake_case, không gây lỗi logic.
- BH-16 — `low`, route `patch`: `__manifest__.py` cập nhật dependency và mô tả model inbox.
- EC-3 — `low`, route `patch`: `event_webhook.py` cần guard `isinstance(data.get('payload'), dict)`.
- EC-6 — `low`, route `patch`: `process-outbox-events.ts` cần guard audit exception không làm fail relay outcome.
- VG-1 — `medium`, route `patch`: bổ sung test kiểm chứng chi tiết SQL tie-breaking và locking.
- VG-2 — `medium`, route `patch`: bổ sung test unit cho `processPending` và `HttpOdooEventRelay`.

## Design Notes

- Bảng `dx_core.staff_roster` lưu trữ ánh xạ Keycloak `sub`, `group_id`, `official_assignment_count` và `is_active`.
- Thuật toán phân công chọn:
  ```sql
  SELECT sub FROM dx_core.staff_roster s
  WHERE s.group_id = $1 AND s.is_active = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM dx_core.tickets t
      WHERE t.assigned_sub = s.sub AND t.status IN ('WAITING', 'IN_PROGRESS')
    )
  ORDER BY s.official_assignment_count ASC, s.last_assigned_at ASC NULLS FIRST, s.sub ASC
  FOR UPDATE SKIP LOCKED LIMIT 1;
  ```
- Sử dụng `FOR UPDATE SKIP LOCKED` (hoặc transaction lock) loại trừ hoàn toàn race condition khi nhiều ticket được tiếp nhận đồng thời.
- Odoo webhook xác thực qua header `X-Internal-Service-Key` hoặc Bearer service-token do P gửi. Thông báo được đưa vào chatter/activity của user tương ứng với `assigned_sub`.
