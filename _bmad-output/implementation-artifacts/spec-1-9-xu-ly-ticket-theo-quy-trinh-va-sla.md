---
title: 'Story 1.9: Xử lý theo quy trình, SLA và đóng ticket'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'd9b68e43e21acee76778cfdae9d2a83389f31763'
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** P và Odoo chưa cho người phụ trách ghi bước xử lý, theo dõi SLA hoặc đóng ticket.

**Approach:** Hoàn thiện vòng đời `WAITING → IN_PROGRESS → CLOSED` trong P, thao tác qua Odoo. Phạm vi theo epic context và sprint hiện hành: gồm đóng, không gồm CSAT hay phân loại lại.

## Boundaries & Constraints

**Always:** Chỉ người phụ trách hiện tại, còn quyền nhóm và scope `tickets:write`, được sửa. Bắt đầu gắn bản quy trình v1 theo loại khách chọn; snapshot quy trình và lịch theo ticket. Lệnh cần phiên bản và khóa idempotency; thay đổi, audit UTC (actor/client/correlation/before/after), outbox và response replay cùng transaction. Cùng khóa khác nội dung trả 409; replay kiểm tra lại quyền.

SLA: 120 phút làm việc từ `received_at`, thứ Hai–thứ Sáu 08–12/13–17, `Asia/Ho_Chi_Minh`; ngày nghỉ cấu hình ISO date qua `SLA_HOLIDAYS`, mặc định rỗng. Chờ vẫn tính; quá hạn khi elapsed >120, giữ dấu và mốc hạn sau đóng. Bước mở tính đến lúc truy vấn; đóng dừng thời lượng.

**Never:** Không sửa ticket đóng, bỏ bước, ghi trực tiếp từ Odoo, hoặc cho quyền xem của lãnh đạo thay thế quyền sửa của người phụ trách.

## I/O & Edge-Case Matrix

| Tình huống | Đầu vào | Kết quả | Lỗi |
|---|---|---|---|
| Bắt đầu | WAITING đã gán | IN_PROGRESS, bước đầu | Chưa gán/sai người: từ chối |
| Ghi bước | Bắt đầu rồi hoàn tất bước hiện tại | Lưu nội dung, actor, start/end | Rỗng, sai thứ tự, end<start: 422 |
| Đóng | Đủ bước và kết quả tổng kết | CLOSED, giải phóng slot, xét FIFO cùng giao dịch | Chưa đủ: 422 |
| Cạnh tranh | Hai lệnh cùng version | Một commit | Lệnh còn lại 409, tải lại |
| SLA | Nghỉ trưa/cuối tuần/ngày nghỉ | Chỉ cộng trong ca; đúng ranh giới | Cấu hình sai: fail startup |

</frozen-after-approval>

## Code Map

Đường dẫn `src/`, `test/` dưới `services/p_process/`.
- `src/application/read-tickets.ts`, `src/adapters/postgres/ticket-read-store.ts`: SLA đang null; giữ chính sách che PII.
- `src/adapters/postgres/ticket-intake-store.ts`: tái dùng transaction/idempotency.
- `src/adapters/postgres/assignment-store.ts`: tái dùng `assignNextQueuedTicket(..., client)`; thay version sự kiện cố định bằng version ticket.
- `services/h_human/addons/dx_core/`: client token exchange và workspace HTML hiện chỉ đọc; giữ mô hình không lưu PII.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/ticket-workflow.ts`, `src/domain/business-calendar.ts` — quy trình v1, validation và lịch SLA thuần.
- [x] `src/adapters/postgres/migrations/0008_ticket_processing.sql`, `src/adapters/postgres/schema.ts`, `services/d_data/postgres/init/01_init_schema.sql` — version, snapshot, bước, closed/result và dấu SLA; backfill ticket cũ.
- [x] `src/application/process-ticket.ts`, `src/application/ports.ts`, `src/adapters/postgres/ticket-processing-store.ts` — lệnh start/bắt đầu bước/hoàn tất/close nguyên tử; rollback cả FIFO khi lỗi.
- [x] `src/adapters/postgres/assignment-store.ts`, `src/application/read-tickets.ts`, `src/adapters/postgres/ticket-read-store.ts` — version đơn điệu; projection bước/SLA và quyền hành động.
- [x] `src/adapters/http/routes/tickets.ts`, `src/adapters/http/app.ts`, `src/index.ts`, `contracts/openapi/p-api.yaml`, `contracts/events/ticket-processing.v1.schema.json`, `infra/keycloak/dxlab-realm.json` — API/lỗi/scope, sự kiện sau commit và wiring.
- [x] `services/h_human/addons/dx_core/services/p_ticket_client.py`, `services/h_human/addons/dx_core/controllers/ticket_workspace.py` — POST có CSRF, version/key; nhãn bước/SLA, lỗi giữ dữ liệu, xác nhận đóng trong ngữ cảnh.
- [x] `test/ticket-processing.test.js`, `test/business-calendar.test.js`, `test/ticket-integration.mjs`, `services/h_human/addons/dx_core/tests/` — matrix, quyền/replay, PostgreSQL đồng thời/rollback và UI/client.

**Acceptance Criteria:**
- Given ticket Khiếu nại, when xử lý, then Tiếp nhận và xác minh → Xử lý khiếu nại → Phản hồi kết quả; bắt buộc nội dung xác minh/hành động/kết quả phản hồi.
- Given ticket Tư vấn, when xử lý, then Xác định nhu cầu → Chuẩn bị phương án → Tư vấn và xác nhận; bắt buộc nhu cầu/phương án/kết quả xác nhận.
- Given ticket Bảo hành, when xử lý, then Tiếp nhận sản phẩm → Kiểm tra → Thực hiện bảo hành → Kiểm tra kết quả; bắt buộc thông tin tiếp nhận/chẩn đoán/hành động/kết quả cuối; Kiểm tra có start/end và phút làm việc riêng.
- Given người sai quyền hoặc version cũ, when sửa qua API/Odoo, then không thay dữ liệu/lịch sử và báo cách khắc phục.
- Given màn hình 320px hoặc zoom 200%, when thao tác bằng bàn phím, then mã, bước, hành động và SLA bằng chữ rõ, không cuộn ngang.

## Implementation Notes

- Đã triển khai domain/calendar, snapshot lịch lúc intake, migration/backfill, lệnh nguyên tử, phiên bản, audit/outbox và Odoo có CSRF/idempotency.
- Xác minh: P build + 78 unit tests; 26 Odoo tests; toàn bộ HTTP/PostgreSQL integration; architecture conformance đạt.
- PostgreSQL 16 riêng tại localhost:55439; không dùng dữ liệu dự án. CLI Docker/Compose portable chỉ dùng kiểm tra config.
- Matrix: quy trình/422 ở ticket-processing.test.js; lịch ở business-calendar.test.js; quyền/version/replay/FIFO/rollback ở processing-integration.mjs, tất cả đã chạy.
- Responsive và bàn phím được kiểm tra từ HTML/CSS và controller tests; môi trường không có browser/Odoo runtime để xác minh trực quan 320px/zoom 200%.


- Sau review: sửa 11 nhóm nguyên nhân (retry, freshness, PII, savepoint/validation inbox, chronology, lỗi JSON và khoảng trống kiểm thử); tất cả patch đã xác minh.
- Kiểm tra cuối: npm.cmd test — 79/79; python -m unittest discover -s services/h_human/addons/dx_core/tests — 31/31; npm.cmd run test:integration với DATABASE_URL test và TEST_P_BASE_URL — PASS; python scripts/test-architecture.py với CLI portable — ALL PASS.
- PostgreSQL/HTTP kiểm thử đã dừng sau xác minh. Deferred duy nhất: kiểm tra trực quan Odoo trên browser (320px/zoom 200%).

## Spec Change Log

## Review Triage Log

- BH1 — high, patch: form lỗi dùng action/step hiện tại cùng key/version cũ; mất phản hồi sau commit khiến retry đổi hash. Giữ nguyên lệnh gửi.
- BH2 — high, patch: stale query xét toàn aggregate; processing version mới có thể làm mất thông báo assignment cũ. Tách freshness theo event_type.
- BH3 — medium, patch: notes/result mới là free text có thể chứa liên hệ; lead không có quyền liên hệ vẫn nhận nguyên văn. Che nội dung theo sensitive, giữ metadata bước.
- BH4 — high, patch: create processing inbox bắt IntegrityError ngoài savepoint, transaction PostgreSQL đã aborted. Bọc create mới bằng savepoint.
- BH5 — medium, patch: processing payload chỉ allowlist tên, không kiểm tra kiểu/ID/version; object trong trường được lưu. Validate hợp đồng hiện có trước khi ghi.
- BH6 — false: lịch/120 phút cố định là invariant đã duyệt; chỉ ngày nghỉ cấu hình và timezone được snapshot. Thay invariant ở bản sau cần migration, không phải cập nhật cấu hình hiện hành.
- BH7 — low, rejected: tính mỗi ngày tuyến tính với tuổi ticket, nhưng vài năm ticket chỉ vài nghìn lượt; chưa có bằng chứng ảnh hưởng thường ngày, tối ưu sẽ thêm nhánh tính lịch.
- BH8 — medium, patch: start-step/close không kiểm tra now trước end bước trước; clock lùi tạo lịch sử sai. Chặn chronology đảo ở hai nhánh.
- BH9 — medium, patch: HTTP processing dùng store giả; bổ sung HTTP qua app wired store PostgreSQL để khóa lỗi wiring/403/409/replay.
- BH10 — maybe-false, defer (medium unverified): thiếu browser/runtime Odoo nên chưa chứng minh layout/keyboard sai; cần kiểm tra trực tiếp 320px và zoom 200% để kết luận.
- EC1 — false: realm hiện khai báo tickets:write trong defaultClientScopes của odoo/p-process, nên scope mặc định có write; token thực sự chỉ đọc không được hiện form là đúng. VG1 bổ sung test projection.
- EC2 — high, patch: cùng BH1, đọc action mới rồi tái dùng key cũ khiến retry không replay.
- EC3 — high, patch: cùng BH2, processing đến sớm làm stale assignment.
- EC4 — medium, patch: json.load(error) có thể là array/null; .get gây AttributeError, controller không bắt. Kiểm tra object trước .get.
- VG1 — medium, patch: test hiện không assert allowedActions thực tế; hồi quy projection có thể làm mất toàn bộ form. Thêm action/permission matrix.
- VG2 — medium, patch: startup backfill không được gọi trong test; thêm legacy WAITING/IN_PROGRESS/CLOSED, snapshot preservation và chạy lần hai.
- VG3 — medium, patch: uniqueness assertion vẫn pass khi outbox rỗng; assert số lượng, payload/version/action và không có event cho replay/rollback.

## Verification

- `npm test` tại `services/p_process`: build và tests pass.
- `npm run test:integration` với PostgreSQL test riêng: chứng minh conflict, replay, FIFO và rollback.
- `python -m unittest discover -s services/h_human/addons/dx_core/tests`: pass.
- `python scripts/test-architecture.py`: pass.
