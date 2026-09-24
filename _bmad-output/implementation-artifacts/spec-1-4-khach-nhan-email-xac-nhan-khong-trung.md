---
title: 'Story 1.4: Khách nhận email xác nhận không trùng'
type: 'feature'
created: '2026-09-24'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'cf606630cab2d800e9a8e2073eaad6f42ed76c21'
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Sau khi gửi ticket thành công, khách hàng chưa nhận được email xác nhận chứa mã ticket và trạng thái tiếp nhận; hệ thống P chưa có cơ chế outbox thông báo chống gửi trùng, chưa tích hợp worker gửi email tới Mailpit/SMTP có khả năng chịu lỗi và chưa phản hồi trạng thái gửi bằng văn bản trên trang xác nhận.

**Approach:** Ghi nhận ý định gửi email xác nhận vào bảng outbox `dx_core.notifications` trong cùng giao dịch tạo ticket với khóa idempotency duy nhất; xây dựng worker gửi thư qua cổng SMTP/Mailpit có cơ chế thử lại có giới hạn (bounded retry), bảo toàn ticket khi gửi lỗi, làm sạch thông tin nhạy cảm trong log/audit và hiển thị trạng thái email bằng văn bản trên Web.

## Boundaries & Constraints

**Always:**
- Ý định gửi email phải được ghi nguyên tử cùng giao dịch tạo ticket trong `dx_core.notifications`.
- Khóa idempotency duy nhất `email:ticket-created:<ticket_id>` ngăn chặn tuyệt đối việc tạo ý định trùng hoặc gửi email lần hai khi sự kiện tạo ticket được phát lại từ worker/Node-RED.
- Email xác nhận chứa đầy đủ: mã ticket, thời điểm tiếp nhận và thông báo yêu cầu đang ở trạng thái "Chờ xử lý".
- Khi nhà cung cấp email lỗi hoặc không khả dụng, ticket tuyệt đối không bị rollback; lưu nguyên nhân kỹ thuật đã làm sạch (loại bỏ token/mật khẩu/PII), tăng số lần thử và chuyển sang trạng thái `DEAD_LETTER` sau tối đa 3 lần thử thất bại.
- Trang xác nhận Web hiển thị trạng thái email bằng văn bản rõ ràng (không chỉ dùng màu sắc), tuân thủ WCAG 2.2 AA, hoạt động tốt trên màn hình 320 CSS px / zoom 200% và điều hướng bàn phím.
- Log và audit log không chứa nội dung mô tả của khách, token, tệp đính kèm hoặc thông tin xác thực SMTP; audit log phải liên kết được với mã ticket và correlation ID.

**Never:**
- Không gửi email trực tiếp bên trong request thread trước khi commit transaction tạo ticket; không để lỗi email làm gián đoạn việc cấp mã ticket.
- Không tạo thêm bản ghi thông báo trùng khi cùng sự kiện ngữ nghĩa `ticket.created.v1` được phát lại.
- Không ghi log thông tin nhạy cảm (SMTP password, mô tả chi tiết, token truy cập).
- Không thêm các tính năng thuộc các story kế tiếp (đính kèm tệp ở Story 1.5, phân quyền ở Story 1.6, phân công ở Story 1.7).

## I/O & Edge-Case Matrix

| Tình huống | Đầu vào / Trạng thái | Hành vi / Kết quả mong đợi | Xử lý lỗi |
|---|---|---|---|
| Tạo ticket hợp lệ | Dữ liệu hợp lệ, key mới | Giao dịch commit ticket, audit log, outbox event và bản ghi `notifications` trạng thái `PENDING`; worker gửi email tới Mailpit/SMTP, cập nhật trạng thái `SENT` | N/A |
| Phát lại sự kiện tạo ticket | Sự kiện `ticket.created.v1` được replay với cùng `ticket_id` | Khóa idempotency chặn trùng; hệ thống giữ nguyên ý định cũ, không tạo thông báo mới, không gửi email lần hai | Idempotent no-op |
| Nhà cung cấp email lỗi tạm thời | Mailpit/SMTP ngoại tuyến hoặc từ chối kết nối | Ticket vẫn tồn tại, khách vẫn thấy mã ticket; bản ghi thông báo lưu lỗi kỹ thuật đã làm sạch, tăng số lần thử | Retry tối đa 3 lần, chuyển `DEAD_LETTER` nếu vượt ngưỡng |
| Mất phản hồi xác nhận từ server SMTP | Mailpit chấp nhận nhưng kết nối ngắt trước khi lưu kết quả | Worker xử lý lại theo khóa idempotency, không sinh ý định mới trong outbox | Khóa duy nhất theo ticket ID bảo vệ outbox |
| Hiển thị trạng thái trên trang xác nhận | Ticket vừa tạo xong với trạng thái email | Giao diện hiển thị mã ticket, trạng thái yêu cầu "Chờ xử lý" và trạng thái email bằng văn bản (ví dụ: "Đã gửi email xác nhận" hoặc "Đang gửi email xác nhận") | Cập nhật văn bản không phụ thuộc màu sắc |

</frozen-after-approval>

## Code Map

- `contracts/openapi/p-api.yaml` — bổ sung trường `confirmationEmailStatus` (`PENDING | SENT | FAILED | DEAD_LETTER`) trong schema `Ticket` và endpoint `GET /api/v1/tickets/{ticketId}`.
- `services/p_process/src/adapters/postgres/migrations/0004_ticket_notifications.sql` — tạo bảng `dx_core.notifications` với khóa duy nhất `idempotency_key`, trạng thái (`PENDING`, `SENT`, `FAILED`, `DEAD_LETTER`), số lần thử và thông tin provider.
- `services/d_data/postgres/init/01_init_schema.sql` — đồng bộ DDL bảng `notifications` đảm bảo clean install và bootstrap nhất quán.
- `services/p_process/src/adapters/postgres/schema.ts` — định nghĩa Drizzle schema cho bảng `notifications`.
- `services/p_process/src/domain/notification.ts` — định nghĩa kiểu dữ liệu thông báo, mẫu email xác nhận, quy tắc làm sạch log/lỗi và bất biến chống trùng.
- `services/p_process/src/application/ports.ts` — định nghĩa port `INotificationStore` và `IMailerPort`.
- `services/p_process/src/adapters/notification/smtp-mailer.ts` — adapter gửi SMTP chuẩn kết nối Mailpit/SMTP server, hỗ trợ timeout và phản hồi sạch.
- `services/p_process/src/adapters/postgres/notification-store.ts` — triển khai kho lưu trữ thông báo outbox trên PostgreSQL, truy vấn khóa chống trùng và cập nhật kết quả.
- `services/p_process/src/adapters/postgres/ticket-intake-store.ts` — cập nhật `createTicket` ghi thêm bản ghi thông báo trong cùng transaction.
- `services/p_process/src/application/process-notifications.ts` — use case điều phối worker gửi thông báo outbox, xử lý retry và dead-letter.
- `services/p_process/src/adapters/http/routes/tickets.ts` — triển khai `GET /api/v1/tickets/{ticketId}` và gắn trạng thái email vào phản hồi ticket.
- `apps/web/app/ticket-form.tsx` — cập nhật thẻ xác nhận hiển thị trạng thái email bằng văn bản rõ ràng và cập nhật trạng thái khi có kết quả.
- `apps/web/app/bff/tickets/route.ts` & `apps/web/app/bff/tickets/[id]/route.ts` — hỗ trợ BFF kiểm tra chi tiết/trạng thái ticket.
- `services/p_process/test/notification.test.js`, `ticket-integration.mjs` — kiểm thử đơn vị và tích hợp: gửi email, outbox transaction, chống trùng khi phát lại, retry/dead-letter và làm sạch log.

## Tasks & Acceptance

**Execution:**
- [x] `contracts/openapi/p-api.yaml` — cập nhật hợp đồng OpenAPI cho `confirmationEmailStatus` và endpoint tra cứu ticket.
- [x] `services/p_process/src/adapters/postgres/migrations/0004_ticket_notifications.sql` & `01_init_schema.sql` — bổ sung migration và init schema cho bảng `notifications`.
- [x] `services/p_process/src/adapters/postgres/schema.ts` — cập nhật Drizzle schema cho `notifications`.
- [x] `services/p_process/src/domain/notification.ts` & `src/application/ports.ts` — tạo domain models, mẫu email xác nhận và ports gửi thư/lưu trữ outbox.
- [x] `services/p_process/src/adapters/notification/smtp-mailer.ts` — xây dựng adapter SMTP hỗ trợ Mailpit và SMTP cấu hình qua môi trường.
- [x] `services/p_process/src/adapters/postgres/notification-store.ts` & `ticket-intake-store.ts` — ghi nhận thông báo nguyên tử trong transaction tạo ticket và xử lý chống trùng.
- [x] `services/p_process/src/application/process-notifications.ts` & `services/p_process/src/adapters/http/routes/tickets.ts` — xây dựng notification processor và bổ sung `GET /api/v1/tickets/:id`.
- [x] `apps/web/app/ticket-form.tsx` & BFF routes — hiển thị trạng thái gửi email xác nhận bằng văn bản trên màn hình xác nhận.
- [x] `services/p_process/test/notification.test.js` & kiến trúc CI — kiểm thử kịch bản gửi thành công, phát lại không trùng, lỗi SMTP/retry có giới hạn và bảo vệ log.

**Acceptance Criteria:**
- Given ticket hợp lệ vừa tạo, when transaction commit, then outbox ghi đúng 1 bản ghi `PENDING` chứa mã ticket và thời điểm tiếp nhận.
- Given email đang chờ trong outbox, when worker chuyển email tới Mailpit/SMTP, then email được chuyển thành công, lưu kết quả provider và trạng thái xác nhận hiển thị bằng văn bản.
- Given cùng sự kiện tạo ticket được phát lại, when xử lý lại, then khóa idempotency chặn việc tạo thêm ý định gửi hoặc gửi trùng email.
- Given máy chủ email không khả dụng, when lần gửi thất bại, then ticket vẫn được bảo toàn, hệ thống lưu lỗi đã làm sạch và thử lại tối đa 3 lần trước khi chuyển sang `DEAD_LETTER`.
- Given quá trình gửi email, when ghi log/audit, then log không chứa mô tả chi tiết, token, file hay mật khẩu SMTP, và audit liên kết được mã ticket cùng correlation ID.

## Implementation Notes

- **Outbox Thông báo & Khóa Nguyên tử:** Tạo bảng `dx_core.notifications` với cột `idempotency_key` duy nhất và các trạng thái `PENDING`, `PROCESSING`, `SENT`, `FAILED`, `DEAD_LETTER`. Ghi ý định gửi email xác nhận nguyên tử cùng giao dịch tiếp nhận ticket tại `ticket-intake-store.ts`.
- **Worker xử lý thông báo nền:** `ProcessNotificationsUseCase` và `PostgresNotificationStore.claimPendingNotifications` sử dụng truy vấn `UPDATE ... WHERE id IN (SELECT id FROM ... FOR UPDATE SKIP LOCKED) RETURNING *` để chuyển trạng thái sang `PROCESSING` an toàn, chống việc các worker chạy song song gửi trùng email. Bổ sung cờ `isProcessing` trong interval timer.
- **SmtpMailer Adapter thuần Node.js:** Sử dụng `node:net` / `node:tls` hỗ trợ Mailpit cổng 1025 và SMTP server tiêu chuẩn; tích hợp per-command timeout 5s, giữ buffer banner 220, dot-stuffing RFC 5321, chuẩn hóa `\r\n`, chống injection CRLF và kiểm tra chứng chỉ TLS an toàn cho production.
- **Bảo mật & Audit Log:** Loại bỏ mô tả chi tiết, token, mật khẩu SMTP khỏi log lỗi (`sanitizeErrorMessage`) và metadata audit (`sanitizeLogData`); ghi audit log các hành động `notification.sent`, `notification.failed`, `notification.dead_letter` liên kết ticket ID và correlation ID vào `dx_core.audit_logs`.
- **Web UI & BFF Polling:** Trang xác nhận Web hiển thị trạng thái email bằng văn bản rõ ràng theo WCAG 2.2 AA. Cơ chế polling tự động truy vấn `/bff/tickets/:id` để cập nhật trạng thái từ `PENDING` -> `SENT` hoặc thông báo lỗi khi hết số lần retry.
- **OpenAPI 3.1 & Schema Parity:** Bổ sung trường `confirmationEmailStatus` trong `Ticket` schema, thêm endpoint `GET /api/v1/tickets/{ticketId}` với mã 200, 400, 404. Đồng bộ DDL giữa migration `0004` và `01_init_schema.sql`.

## Spec Change Log


## Review Triage Log

| STT | Nguồn / File | Phát hiện (Finding) | Verdict | Bằng chứng xác minh & Định tuyến (Route) |
|---|---|---|---|---|
| 1 | Edge Case Hunter (`notification-store.ts:33-48`) | `SELECT ... FOR UPDATE SKIP LOCKED` không có transaction hoặc transition `PROCESSING`, giải phóng khóa ngay sau query | medium | Khóa dòng bị giải phóng ngay sau truy vấn khiến các worker ticks đồng thời có thể quét trùng notification. Route: `patch`. |
| 2 | Edge Case Hunter (`smtp-mailer.ts:212-218`) | Thiếu per-command timeout trong `waitForResponse` khi kết nối SMTP bị treo | medium | Nếu máy chủ SMTP treo sau kết nối TCP, worker sẽ bị treo vô hạn. Route: `patch`. |
| 3 | Edge Case Hunter (`smtp-mailer.ts:180-210`) | Banner 220 của server SMTP có thể bị hủy nếu đến trước khi gọi `waitForResponse` | medium | `onData` cắt buffer ngay cả khi `waitResolve` là null. Cần giữ buffer chờ listener. Route: `patch`. |
| 4 | Edge Case Hunter (`smtp-mailer.ts:88-89`) | Thiếu dot-stuffing RFC 5321 và chuẩn hóa CRLF trong body | medium | Dòng bắt đầu bằng `.` làm ngắt sớm DATA payload; bare `\n` vi phạm chuẩn SMTP. Route: `patch`. |
| 5 | Edge Case Hunter (`ticket-form.tsx:42-72`) | Polling UI dừng ngay khi gặp `FAILED`, không đợi background retry | low | Dừng polling quá sớm khi gặp lỗi tạm thời khiến UI không cập nhật khi worker retry thành công. Route: `patch`. |
| 6 | Edge Case Hunter (`bff/tickets/[id]/route.ts:15-18`) | Tham số `id` không được URL-encode khi gọi upstream | low | Cần `encodeURIComponent(id)` để tránh lỗi URL malformed. Route: `patch`. |
| 7 | Edge Case Hunter (`ticket-intake-store.ts:981-1001`) | `getTicketById` dùng `LEFT JOIN dx_core.notifications` không có `ORDER BY / LIMIT 1` | low | Có thể sinh duplicate rows hoặc trả trạng thái notification không xác định nếu có nhiều hơn 1 bản ghi. Route: `patch`. |
| 8 | Verification Gap (`ticket-form.tsx:42-72`) | Vòng lặp polling trạng thái email trong `TicketForm` chưa được kiểm thử trong test UI | low | Pre-verified gap: Mock fetch trong `ticket-form.test.tsx` thiếu `id` hoặc trả ngay `SENT` khiến useEffect polling bị bỏ qua. Route: `patch`. |
| 9 | Verification Gap (`index.ts:44-53`, `notification-store.ts`) | Tiến trình worker outbox và chuyển trạng thái `PENDING` -> `SENT` chưa có test kiểm chứng | medium | Pre-verified gap: `ticket-integration.mjs` chỉ kiểm tra `['PENDING', 'SENT']` mà không đợi worker gửi thư và cập nhật DB. Route: `patch`. |
| 10 | Verification Gap (`ticket-intake-store.ts:40-48`) | Trạng thái email trên ticket phát lại (replay) chưa được assert trong test | low | Pre-verified gap: `ticket-integration.mjs` chưa assert `confirmationEmailStatus` trên kết quả replay. Route: `patch`. |
| 11 | Verification Gap (`docker-compose.yml:62-70`) | Service `p-process` thiếu biến môi trường `SMTP_HOST: mailpit` | medium | `SmtpMailer` mặc định `127.0.0.1` vốn không có mail server bên trong container, gây `ECONNREFUSED`. Route: `patch`. |
| 12 | Verification Gap (`notification-store.ts:43`) | Khóa hàng `FOR UPDATE SKIP LOCKED` không an toàn ngoài transaction | medium | Trùng lặp với finding 1. Route: `patch`. |
| 13 | Verification Gap (`ticket-intake-store.ts:998`) | `LEFT JOIN` notification không có `ORDER BY` trong `getTicketById` | low | Trùng lặp với finding 7. Route: `patch`. |
| 14 | Blind Hunter (`notification-store.ts`) | Non-transactional row locking trong `claimPendingNotifications` | medium | Trùng lặp với finding 1 & 12. Route: `patch`. |
| 15 | Blind Hunter (`index.ts`) | Worker polling loop gọi `setInterval` không có guard chống chồng chéo (in-flight guard) | low | Nếu chu kỳ gửi mất > 2 giây, nhiều `processPending` chạy song song. Cần thêm cờ `isProcessing`. Route: `patch`. |
| 16 | Blind Hunter (`notification-store.ts`) | Thiếu backoff delay trước khi thử lại bản ghi `FAILED` | low | Thử lại ngay lập tức ở tick kế tiếp làm nhanh cạn 3 lần retry khi SMTP tạm gián đoạn. Route: `patch`. |
| 17 | Blind Hunter (`index.ts`) | Điểm khởi chạy production `index.ts` truyền `undefined` cho `auditPort` | medium | Bỏ lỡ việc ghi các sự kiện audit `notification.sent`, `notification.failed`, `notification.dead_letter` vào `dx_core.audit_logs`. Route: `patch`. |
| 18 | Blind Hunter (`smtp-mailer.ts`) | Thiếu per-command timeout và race condition banner 220 | medium | Trùng lặp với finding 2 & 3. Route: `patch`. |
| 19 | Blind Hunter (`smtp-mailer.ts`) | Thiếu dot-stuffing và CRLF không đúng chuẩn RFC 5321 | medium | Trùng lặp với finding 4. Route: `patch`. |
| 20 | Blind Hunter (`smtp-mailer.ts`) | Nguy cơ SMTP command injection do thiếu kiểm tra ký tự CRLF trong địa chỉ email | low | Cần xác thực email không chứa `\r` hoặc `\n` trước khi chèn vào `MAIL FROM` / `RCPT TO`. Route: `patch`. |
| 21 | Blind Hunter (`docker-compose.yml`, `.env.example`) | Thiếu `SMTP_HOST` trong `docker-compose.yml` và `.env.example` | medium | Trùng lặp với finding 11. Route: `patch`. |
| 22 | Blind Hunter (`smtp-mailer.ts`) | Cấu hình TLS cứng `rejectUnauthorized: false` | low | Tắt kiểm tra chứng chỉ TLS trong môi trường production gây rủi ro MITM. Route: `patch`. |
| 23 | Blind Hunter (`process-notifications.ts`) | Hàm làm sạch `sanitizeLogData` chưa được gọi trong production code | low | Metadata audit log cần đi qua `sanitizeLogData` để bảo đảm không lọt thông tin nhạy cảm. Route: `patch`. |
| 24 | Blind Hunter (`ticket-form.tsx`) | Web polling timeout sau 10 lần không có thông báo hay cho phép refresh | low | Polling dừng lại ở trạng thái pending mà không có thông báo cho người dùng. Route: `patch`. |
| 25 | Blind Hunter (`ticket-form.test.tsx`) | Thiếu test coverage cho luồng polling email status trên Web UI | low | Trùng lặp với finding 8. Route: `patch`. |
| 26 | Blind Hunter (`p-api.yaml`) | Thiếu định nghĩa response 400 Bad Request cho `GET /api/v1/tickets/{ticketId}` | low | Handler trả 400 khi `ticketId` không phải UUID nhưng OpenAPI contract chưa liệt kê. Route: `patch`. |
| 27 | Blind Hunter (`ticket-intake-store.ts`) | Unconstrained `LEFT JOIN` trong `getTicketById` | low | Trùng lặp với finding 7 & 13. Route: `patch`. |
| 28 | Blind Hunter (`ticket-integration.mjs`) | Script tích hợp chưa xác minh toàn diện error handling và retry/worker | medium | Trùng lặp với finding 9 & 10. Route: `patch`. |
| 29 | Blind Hunter (`bff/tickets/[id]/route.ts`) | Thiếu kiểm tra UUID và dùng schema lỗi không chuẩn Problem Details | low | Cần trả `application/problem+json` theo RFC 9457 khi thiếu ID. Route: `patch`. |
| 30 | Blind Hunter (`spec.md`) | Các phần ghi chú spec còn trống trước review | low | Cần hoàn thiện Implementation Notes sau khi kết thúc review. Route: `patch`. |

### Nhóm nguyên nhân cốt lõi (Root Causes) & Hướng khắc phục (All: `patch`):
- **Nhóm 1 (Khóa nguyên tử và chống worker chồng chéo):** Cập nhật `claimPendingNotifications` dùng `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING *` chuyển trạng thái sang `PROCESSING` ngay khi claim; bổ sung cờ `isProcessing` trong worker `index.ts`.
- **Nhóm 2 (Tuân thủ giao thức SMTP & an toàn socket):** Thêm per-command timeout 5s, giữ buffer banner 220, dot-stuffing (`..`), chuẩn hóa `\r\n`, chặn CRLF injection trong email header, và chỉ đặt `rejectUnauthorized: false` ngoài môi trường production.
- **Nhóm 3 (Cấu hình môi trường Mailpit):** Thêm `SMTP_HOST: ${SMTP_HOST:-mailpit}` và `SMTP_PORT: ${MAILPIT_SMTP_PORT:-1025}` vào `docker-compose.yml` (`p-process`) và `.env.example`.
- **Nhóm 4 (Audit Logging trong production):** Tạo `PostgresAuditPort` trong `index.ts` ghi vào `dx_core.audit_logs`, áp dụng `sanitizeLogData`.
- **Nhóm 5 (Truy vấn xác định trong `getTicketById`):** Chuyển sang `LEFT JOIN LATERAL (SELECT status FROM dx_core.notifications WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) n ON true`.
- **Nhóm 6 (OpenAPI & BFF Route):** Bổ sung response `400` ProblemDetails cho `GET /api/v1/tickets/{ticketId}` trong `p-api.yaml`; URL-encode `ticketId` và trả chuẩn RFC 9457 trong BFF route.
- **Nhóm 7 (Bổ sung kiểm thử verification):** Bổ sung test polling trong `ticket-form.test.tsx`; test worker execution trong `notification.test.js`; test assertion `confirmationEmailStatus` trên replay trong `ticket-integration.mjs`.


## Design Notes

- Bảng `dx_core.notifications` sử dụng khóa duy nhất `idempotency_key VARCHAR(255) UNIQUE` theo cấu trúc `email:ticket-created:<ticket_id>` để đảm bảo mỗi sự kiện tiếp nhận chỉ sinh đúng một email.
- Adapter SMTP sử dụng socket chuẩn Node.js `node:net` / `node:tls` để kết nối Mailpit (cổng 1025) hoặc máy chủ SMTP được cấu hình qua môi trường mà không cần thêm phụ thuộc ngoài.
- Trạng thái email được cập nhật đồng bộ trong outbox và có thể phản ánh ngay qua API `GET /api/v1/tickets/:ticketId` và giao diện Web.

## Verification

**Commands:**
- `npm test --prefix services/p_process` -- expected: toàn bộ unit test domain, HTTP routes và notification processor PASS
- `node services/p_process/test/ticket-integration.mjs` -- expected: tích hợp outbox, replay không trùng, SMTP double và error handling PASS
- `python scripts/test-architecture.py` -- expected: ALL ARCHITECTURE CONFORMANCE CHECKS PASSED (EXIT CODE 0)
