---
title: 'Story 3.1: Người quản lý xem bộ chỉ số thống nhất theo đúng phạm vi'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: '7a0e7d19cc7860db52ab1f859b56bb6e29d7d4c1'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hiện tại hệ thống chưa có kho chỉ số và reporting views thống nhất cho tầng D; người quản lý và Giám đốc không thể truy vấn số liệu vận hành (ticket mới, tồn đọng, đã đóng, đúng/quá SLA, thời gian xử lý từng bước, CSAT) theo đúng phạm vi phân quyền, thiếu cơ chế cấp grant bảo mật có thời hạn cho Superset và chưa có tài khoản cơ sở dữ liệu bị cô lập khỏi PII khách hàng.

**Approach:** Xây dựng trong dịch vụ P bảng phản hồi CSAT (`csat_ratings`), các SQL reporting views phiên bản hóa (`v_reporting_tickets_v1`), tài khoản database chỉ đọc cho báo cáo (`dxlab_reporter`) cô lập hoàn toàn khỏi PII, module tính toán chỉ số nghiệp vụ thống nhất (`v1.0`), cơ chế cấp grant báo cáo ngắn hạn có chữ ký HMAC cho BFF/Superset, cùng các endpoint REST API truy vấn chỉ số có audit log và kiểm soát quyền nghiêm ngặt theo nguyên tắc đóng theo mặc định (deny-by-default).

## Boundaries & Constraints

**Always:**
- P là dịch vụ duy nhất sở hữu các SQL reporting views phiên bản hóa, logic xác định phạm vi phân quyền và định nghĩa chỉ số (`v1.0`).
- CSAT được chuẩn hóa bằng công thức: `(số phản hồi 4–5 sao / tổng phản hồi hợp lệ) * 100`, luôn kèm mẫu số lượt phản hồi thực tế; ticket "Chưa phản hồi" không được tính là 0 sao hay phản hồi tiêu cực; điểm trung bình 1–5 nếu hiển thị phải có tên riêng (`csat_average_score`).
- Áp dụng nguyên tắc đóng theo mặc định (deny-by-default): Trưởng nhóm (`group_lead`) chỉ truy cập các `group_id` được phân công phụ trách; Trưởng phòng (`department_head`) và Giám đốc (`director`) truy cập toàn bộ; khi thiếu hoặc sai lệch quyền, P từ chối toàn bộ (HTTP 403) thay vì mở rộng phạm vi.
- Tài khoản database dành cho báo cáo (`dxlab_reporter`) chỉ có quyền SELECT trên reporting views; tuyệt đối bị cấm đọc bảng `customers` (chứa PII), bảng nội bộ và tệp đính kèm.
- Grant báo cáo cấp cho BFF có thời hạn ngắn (mặc định 5 phút), chứa danh sách chính xác các `group_id` được phép; BFF không thể tự ý mở rộng nhóm ngoài grant.
- Mọi truy vấn báo cáo và phát hành grant phải được ghi nhận vào nhật ký kiểm toán (`dx_core.audit_logs`) với mốc thời gian UTC, danh tính `sub`, vai trò và danh sách nhóm được cấp.

**Never:**
- Không đưa thông tin định danh cá nhân (PII như số điện thoại, email, họ tên khách hàng) vào reporting views hoặc kết quả chỉ số tổng hợp.
- Không cho phép người dùng hoặc BFF sửa tham số nhóm để xem vượt quá phạm vi được cấp; không để lộ nhãn hoặc số lượng của nhóm ngoài phạm vi khi bị từ chối.
- Không tính gộp nhiều phiên bản định nghĩa chỉ số mà không có cảnh báo phân tách.
- Không sửa trực tiếp trạng thái dữ liệu nghiệp vụ thông qua tài khoản báo cáo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Trưởng nhóm truy vấn chỉ số hợp lệ | Token `group_lead` quản lý nhóm `['warranty']`, kỳ `from/to` | HTTP 200: JSON chứa các chỉ số (mới, tồn đọng, đóng, SLA, thời gian bước, CSAT) chỉ tính trên nhóm `warranty`, kèm `definition_version: 'v1.0'` và danh sách ticket IDs | N/A |
| Trưởng nhóm cố truy vấn nhóm ngoài quyền | Token `group_lead` quản lý `warranty` nhưng truyền `group_id=complaints` | HTTP 403 Problem Details: Bị từ chối truy cập do vượt phạm vi cho phép; không tiết lộ số liệu nhóm `complaints` | Trả 403 Forbidden |
| Giám đốc/Trưởng phòng truy vấn toàn bộ | Token `director` hoặc `department_head`, không truyền `group_id` | HTTP 200: JSON chỉ số tổng hợp toàn tổ chức trên tất cả các nhóm kèm audit log | N/A |
| Tính CSAT khi chưa có phản hồi | Nhóm có 5 ticket đã đóng nhưng khách chưa gửi CSAT | `csat_rate: null`, `csat_response_count: 0`, `csat_average_score: null`; trạng thái hiển thị "Chưa có phản hồi", không tính là 0% | N/A |
| Tính CSAT khi có phản hồi hỗn hợp | 3 phản hồi 5 sao, 1 phản hồi 4 sao, 1 phản hồi 2 sao (tổng 5) | `csat_rate: 80.0%` (4/5), `csat_response_count: 5`, `csat_average_score: 4.20` | N/A |
| Cấp grant báo cáo cho BFF | Yêu cầu POST `/api/v1/reporting/grants` với token hợp lệ | HTTP 201: Trả grant token chứa `sub`, `roles`, `allowed_groups`, `expires_at` (5 phút), chữ ký HMAC-SHA256 | N/A |
| Token người dùng thiếu vai trò quản lý | Token của nhân viên thường (`employee`) gọi API reporting | HTTP 403 Problem Details: Từ chối do vai trò không có quyền xem báo cáo điều hành | Trả 403 Forbidden |
| Token hết hạn hoặc không hợp lệ | Header Authorization mang token sai chữ ký hoặc hết hạn | HTTP 401 Problem Details: Xác thực thất bại | Trả 401 Unauthorized |

</frozen-after-approval>

## Code Map

- `services/p_process/src/adapters/postgres/migrations/0011_reporting_and_csat.sql` -- Migration tạo bảng `dx_core.csat_ratings`, view `dx_core.v_reporting_tickets_v1`, và cấu hình quyền tài khoản báo cáo `dxlab_reporter`.
- `services/p_process/src/adapters/postgres/schema.ts` -- Khai báo schema Drizzle cho `csatRatings`.
- `services/p_process/src/domain/reporting.ts` -- Định nghĩa công thức chỉ số (`v1.0`), định dạng grant HMAC và các quy tắc kiểm tra quyền nhóm.
- `services/p_process/src/application/ports.ts` -- Cổng giao tiếp `IReportingStore` và `IReportingGrantService`.
- `services/p_process/src/adapters/postgres/reporting-store.ts` -- Hiện thực truy vấn SQL lấy số liệu tổng hợp và danh sách ticket theo phạm vi `group_id`.
- `services/p_process/src/application/read-reporting.ts` -- Use case tính toán bộ chỉ số thống nhất và phát hành grant có audit log.
- `services/p_process/src/adapters/http/routes/reporting.ts` -- Đăng ký các endpoints `/api/v1/reporting/metrics`, `/api/v1/reporting/grants`, và `/api/v1/tickets/:ticketId/csat`.
- `services/p_process/src/adapters/http/app.ts` -- Đăng ký `reportingRoutes` vào Fastify instance.
- `services/p_process/src/index.ts` -- Khởi tạo store, use cases và liên kết audit port trong quá trình bootstrap.
- `contracts/openapi/p-api.yaml` -- Khai báo hợp đồng OpenAPI cho các endpoint reporting và CSAT.
- `services/d_data/postgres/init/01_init_schema.sql` -- Cập nhật kịch bản khởi tạo gốc đồng bộ với migration 0011.

## Tasks & Acceptance

**Execution:**
- [x] `services/p_process/src/adapters/postgres/migrations/0011_reporting_and_csat.sql` -- Tạo migration thêm bảng `csat_ratings`, view `v_reporting_tickets_v1` che PII, và thiết lập role `dxlab_reporter` read-only -- Đảm bảo nền tảng lưu trữ và bảo mật dữ liệu ở mức DB theo AR-4, AR-10.
- [x] `services/p_process/src/adapters/postgres/schema.ts` -- Cập nhật bảng `csatRatings` vào schema Drizzle -- Đồng bộ mô hình dữ liệu TypeScript với PostgreSQL.
- [x] `services/p_process/src/domain/reporting.ts` -- Hiện thực domain model tính chỉ số SLA/CSAT/thời gian bước theo chuẩn `v1.0` và tạo/xác thực chữ ký grant HMAC -- Đóng gói bất biến nghiệp vụ vào domain TypeScript theo AR-2.
- [x] `services/p_process/src/application/ports.ts` -- Bổ sung interface `IReportingStore` và kiểu dữ liệu chỉ số -- Định nghĩa ranh giới cổng ứng dụng lục giác.
- [x] `services/p_process/src/adapters/postgres/reporting-store.ts` -- Hiện thực adapter truy vấn PostgreSQL cho chỉ số và lưu CSAT -- Kết nối tầng lưu trữ với kiểm soát phạm vi nhóm an toàn.
- [x] `services/p_process/src/application/read-reporting.ts` -- Hiện thực Use Case kiểm tra quyền deny-by-default, xử lý truy vấn chỉ số và cấp grant kèm ghi audit log -- Đáp ứng FR-9, FR-10, AR-10, AR-12.
- [x] `services/p_process/src/adapters/http/routes/reporting.ts` -- Tạo HTTP routes cho `/api/v1/reporting/metrics`, `/api/v1/reporting/grants`, `/api/v1/tickets/:ticketId/csat` -- Cung cấp API chuẩn cho BFF và kiểm thử.
- [x] `services/p_process/src/adapters/http/app.ts` -- Tích hợp `reportingRoutes` vào ứng dụng Fastify -- Hoàn thiện định tuyến máy chủ P.
- [x] `services/p_process/src/index.ts` -- Khởi tạo các dependencies báo cáo và truyền vào `buildApp` -- Kết nối runtime production.
- [x] `contracts/openapi/p-api.yaml` -- Bổ sung schema và định nghĩa endpoint báo cáo/CSAT vào hợp đồng OpenAPI chuẩn -- Tuân thủ AR-21.
- [x] `services/d_data/postgres/init/01_init_schema.sql` -- Bổ sung bảng và view báo cáo vào init schema -- Đảm bảo dựng mới container sạch hoàn toàn đồng bộ.
- [x] `services/p_process/test/reporting.test.js` -- Viết bộ kiểm thử đơn vị và tích hợp cho công thức CSAT, phân quyền phạm vi nhóm, cấp grant có hạn, và từ chối mặc định -- Kiểm chứng tự động toàn diện theo AR-27.

**Acceptance Criteria:**
- Given dữ liệu ticket đã đóng có đánh giá CSAT (1–5 sao) và chưa có đánh giá, when truy vấn reporting metrics, then CSAT được tính bằng `(số đánh giá 4–5 sao / tổng đánh giá hợp lệ) * 100`, mẫu số hiển thị rõ, ticket chưa đánh giá không bị tính là 0 sao, và điểm trung bình có trường riêng.
- Given người dùng có vai trò `group_lead` thuộc nhóm `warranty`, when gọi API reporting metrics, then kết quả chỉ chứa các ticket và chỉ số thuộc nhóm `warranty`, cố tình truyền nhóm khác bị từ chối HTTP 403 không làm lộ dữ liệu.
- Given người dùng có vai trò `director` hoặc `department_head`, when gọi API reporting metrics, then được cấp phạm vi toàn tổ chức và audit log ghi nhận đầy đủ `sub`, thời điểm UTC và phạm vi được cấp.
- Given người dùng có vai trò `employee` hoặc token thiếu quyền quản lý, when gọi API reporting metrics hoặc grants, then hệ thống từ chối toàn bộ với mã HTTP 403 theo nguyên tắc deny-by-default.
- Given yêu cầu cấp grant báo cáo hợp lệ, when gọi POST `/api/v1/reporting/grants`, then grant token được tạo có thời hạn 5 phút, chứa danh sách nhóm chính xác và chữ ký bảo mật chống giả mạo.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence | Action |
|---------|---------|----------|--------|
| Unhandled 23505 error in saveCsatRating | `medium` | Concurrency race condition on concurrent CSAT submissions causes uncaught 23505 error and 500 response instead of 409 Conflict. | patch |
| verifyReportingGrant expires_at NaN comparison bypass | `medium` | Date.parse returning NaN evaluates to false on `exp < Date.now()`, allowing bypass of expiration on malformed date string. | patch |
| submitCsat missing audit logging | `medium` | Data mutation inserting into csat_ratings does not record audit log to dx_core.audit_logs violating AR-12. | patch |
| requestedGroups missing array and group validation | `low` | Non-array or unvalidated group strings can be passed in grant requests without type and system boundary checks. | patch |
| PostgresReportingStore unexecuted in tests | `medium` | PostgresReportingStore was never instantiated in test suite, only in-memory mock store was tested. | patch |
| Date range filtering from/to unverified | `medium` | Tests did not verify that queryReportingTickets actually excludes tickets outside [from, to] window. | patch |
| Dual-scope fallback tickets:read | `false` | Domain level resolveReportingScope strictly checks role (disallows employee with 403), so fallback to tickets:read does not bypass access control. | reject |
| Missing auth on CSAT endpoint | `false` | CSAT intake is designed for public customer completion via closed ticket token, not requiring employee Keycloak login. | reject |

## Design Notes

### Cấu trúc dữ liệu phản hồi chỉ số (`ReportingMetricsResponse`)
```json
{
  "definition_version": "v1.0",
  "period": {
    "from": "2026-09-01T00:00:00.000Z",
    "to": "2026-09-26T23:59:59.999Z"
  },
  "scope": {
    "role": "group_lead",
    "groups": ["warranty"]
  },
  "kpis": {
    "new_tickets": { "value": 12, "unit": "ticket", "denominator": null },
    "backlog_tickets": { "value": 3, "unit": "ticket", "denominator": null },
    "closed_tickets": { "value": 9, "unit": "ticket", "denominator": null },
    "within_sla_tickets": { "value": 8, "unit": "ticket", "denominator": 9 },
    "overdue_sla_tickets": { "value": 1, "unit": "ticket", "denominator": 9 },
    "csat": {
      "rate_percent": 87.5,
      "response_count": 8,
      "average_score": 4.50,
      "unanswered_count": 1
    }
  },
  "step_durations": [
    { "step_id": "1", "label": "Tiếp nhận sản phẩm", "avg_duration_minutes": 15.2 },
    { "step_id": "2", "label": "Kiểm tra", "avg_duration_minutes": 42.0 }
  ],
  "ticket_ids": ["uuid-1", "uuid-2"]
}
```

## Verification

**Commands:**
- `npm --prefix services/p_process run test` -- expected: Tất cả các kiểm thử hiện có cùng kiểm thử mới `reporting.test.js` vượt qua 100%.
- `npm --prefix services/p_process run lint` -- expected: `tsc --noEmit` thành công không có lỗi type.
