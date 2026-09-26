---
title: 'Story 2.2: Nhân viên tra cứu SOP và FAQ đang có hiệu lực'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: 'ffe30acebbac662142bc39f9bae8a40f239120e6'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-1-dieu-huong-h-p-d-i.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nhân viên công ty hiện chưa có thư viện số để tra cứu các quy trình chuẩn (SOP) và câu hỏi thường gặp (FAQ) chính thức; trang `/portal/resources` và không gian H mới chỉ là các placeholder chưa có dữ liệu và tính năng tìm kiếm.

**Approach:** Xây dựng thư viện Resources tại Web/BFF (`/portal/resources` và trang chi tiết tài liệu), kết nối với backend dịch vụ lõi P lưu trữ và truy vấn tri thức đã phê duyệt và công bố; chỉ hiển thị các tài liệu đang có hiệu lực, hỗ trợ tìm kiếm từ khóa, lọc theo loại, kiểm soát chặt chẽ không để lộ bản nháp và cung cấp endpoint truy xuất chuẩn cho AI.

## Boundaries & Constraints

**Always:**
- Chỉ người dùng nội bộ đã đăng nhập với membership hợp lệ (`employee`, `group_lead`, `department_head`, `director`) mới được truy cập thư viện Resources và API tài liệu; áp dụng scope `portal:read`.
- Thư viện danh sách và tìm kiếm CHỈ trả về các phiên bản SOP/FAQ ở trạng thái đã công bố (`published`) và đang có hiệu lực.
- Mỗi tài liệu hiển thị đầy đủ: tiêu đề, mã tài liệu, loại (`sop` | `faq`), phiên bản (e.g. `1.0.0`), ngày hiệu lực, người phê duyệt, thời điểm công bố và nhãn trạng thái bằng văn bản rõ ràng.
- Giao diện tuân thủ WCAG 2.2 AA, nhận diện "Công nghệ mở / Xanh tin cậy" (Cobalt `#2854E8`, Dark ink `#17233F`, Pale background `#F5F8FF`), phím Tab/Enter tuần tự, hỗ trợ màn hình 320 CSS px và zoom 200% không tràn ngang.
- Khi không có tài liệu phù hợp (bộ lọc hoặc tìm kiếm rỗng), hiển thị thông báo rõ ràng kèm nút xóa bộ lọc hoặc quay lại trang H/Portal; không bịa dữ liệu mẫu giả.
- Endpoint truy xuất tri thức cho AI chỉ trả về tài liệu đã công bố kèm phiên bản và nguồn gốc (provenance).

**Never:**
- Không bao giờ trả về hoặc hiển thị bản nháp (`draft`), bản chờ duyệt (`pending`), bản bị từ chối (`rejected`) hoặc bản đã thay thế (`superseded`) như là tài liệu hiện hành.
- Người dùng có URL trực tiếp tới bản nháp hoặc bản chưa công bố bị hệ thống từ chối theo mặc định (trả về 404 hoặc 403 Problem Details), tuyệt đối không để lộ nội dung, metadata nhạy cảm hay liên kết tải xuống.
- Khách vãng lai (phiên công khai form ticket) không có quyền truy cập Resources hoặc các endpoint tri thức nội bộ.
**Quyết định Seed Data:** Nạp sẵn bộ tài liệu mẫu chuẩn trong migration/fixture gồm 3 tài liệu đã công bố (`SOP-TKT-001: Quy trình tiếp nhận và phân công ticket`, `SOP-WAR-001: Quy trình kiểm tra và xử lý bảo hành`, `FAQ-GEN-001: Hướng dẫn dành cho nhân viên mới và câu hỏi thường gặp`) cùng 1 tài liệu ở trạng thái bản nháp (`SOP-SEC-DRAFT: Quy trình an toàn thông tin nội bộ - bản nháp`) để kiểm thử và phục vụ demo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Liệt kê tài liệu có hiệu lực | Nhân sự mở `/portal/resources` | Hiển thị danh sách các SOP và FAQ đã công bố, đủ metadata (mã, loại, phiên bản, ngày hiệu lực, trạng thái bằng chữ) | Nếu P lỗi kết nối: hiển thị thông báo dịch vụ tạm thời không khả dụng và nút thử lại |
| Lọc theo loại tài liệu | Chọn lọc 'SOP' hoặc 'FAQ' | Danh sách chỉ hiển thị các tài liệu thuộc loại đã chọn | N/A |
| Tìm kiếm từ khóa | Nhập từ khóa vào ô tìm kiếm | Danh sách lọc theo từ khóa khớp với tiêu đề, mã hoặc nội dung | N/A |
| Tìm kiếm / lọc không có kết quả | Từ khóa không khớp hoặc bộ lọc không có dữ liệu | Hiển thị thông báo "Không tìm thấy tài liệu phù hợp", kèm nút xóa bộ lọc và nút quay lại Portal | Không tạo dữ liệu giả |
| Xem chi tiết tài liệu đã công bố | Truy cập `/portal/resources/[id]` của tài liệu đã công bố | Hiển thị toàn văn nội dung, mã phiên bản, người duyệt, ngày công bố, ngày hiệu lực và liên kết quay lại | N/A |
| Truy cập trực tiếp bản nháp / chưa công bố | Nhập URL `/portal/resources/[id]` trỏ tới ID của bản draft | Từ chối truy cập, chuyển tới trang lỗi an toàn hoặc 404; không lộ metadata hay nội dung | RFC 9457 Problem Details (404/403) |
| Chưa đăng nhập hoặc phiên hết hạn | Truy cập `/portal/resources` khi chưa có session | Chuyển hướng tới Keycloak login với `returnTo=/portal/resources` | Sau khi login thành công quay lại đúng Resources |
| Truy xuất tri thức cho AI | Request tới `/api/v1/resources/ai/retrieve?query=...` có token hợp lệ | Trả về các đoạn/tài liệu đã công bố kèm metadata phiên bản và nguồn gốc | Bỏ qua toàn bộ bản nháp và tài liệu chưa duyệt |

</frozen-after-approval>

## Code Map

- `contracts/openapi/p-api.yaml`: Bổ sung schemas và paths cho `GET /api/v1/resources`, `GET /api/v1/resources/{id}`, và `GET /api/v1/resources/ai/retrieve`.
- `services/p_process/src/adapters/postgres/migrations/0009_published_resources.sql`: Migration tạo bảng `dx_core.resources`, các trường metadata (code, type, title, status, version, effective_date, approver_name, published_at, content, summary) và seed data nếu chọn Option A.
- `services/p_process/src/adapters/postgres/schema.ts`: Định nghĩa schema DDL và migrate runner cho migration 0009.
- `services/p_process/src/domain/resource.ts`: Domain entities, types (`ResourceType`, `ResourceStatus`), và domain rules (chỉ phiên bản published mới được xem là hiệu lực).
- `services/p_process/src/application/read-resources.ts`: Use cases truy vấn danh sách có lọc/tìm kiếm, lấy chi tiết tài liệu đã công bố (từ chối bản nháp), và truy xuất cho AI.
- `services/p_process/src/adapters/postgres/resource-store.ts`: Adapter truy vấn cơ sở dữ liệu PostgreSQL cho resources.
- `services/p_process/src/adapters/http/routes/resources.ts`: Fastify routes kiểm tra xác thực `portal:read`, gọi use cases và xử lý lỗi RFC 9457.
- `services/p_process/src/adapters/http/app.ts`: Đăng ký `resourcesRoutes` vào ứng dụng Fastify.
- `apps/web/lib/session.ts`: Mở rộng `safeReturn` regex để hỗ trợ an toàn các URL con và query params của `/portal/resources`.
- `apps/web/lib/resources.ts`: Hàm gọi API phía server từ Next.js BFF sang P với Bearer token từ session người dùng.
- `apps/web/app/portal/resources/page.tsx`: Giao diện thư viện Resources (ô tìm kiếm, nút lọc loại SOP/FAQ, danh sách card tài liệu, trạng thái rỗng, quay lại Portal).
- `apps/web/app/portal/resources/[id]/page.tsx`: Giao diện chi tiết tài liệu (tiêu đề, metadata người duyệt/phiên bản/ngày, nội dung, quay lại Resources).
- `apps/web/app/portal/h/page.tsx`: Cập nhật liên kết và mô tả hướng dẫn đến Resources.
- `services/p_process/test/resources.test.js`: Bộ kiểm thử backend cho danh sách, tìm kiếm, lọc, từ chối bản nháp và truy xuất AI.
- `apps/web/test/resources.test.tsx`: Kiểm thử frontend giao diện danh sách, tìm kiếm, lọc, trạng thái rỗng và trang chi tiết.
- `apps/web/e2e/portal.spec.ts`: Mở rộng kiểm thử E2E Playwright cho luồng tra cứu Resources và kiểm tra khả năng tiếp cận WCAG.

## Tasks & Acceptance

**Execution:**
- [x] `contracts/openapi/p-api.yaml` -- Bổ sung định nghĩa OpenAPI 3.1 cho các endpoint resources -- Chuẩn hóa hợp đồng RESTful API.
- [x] `services/p_process/src/adapters/postgres/migrations/0009_published_resources.sql` -- Tạo bảng `dx_core.resources` và chỉ mục tìm kiếm -- Lưu trữ bền vững tài liệu SOP/FAQ và lịch sử công bố.
- [x] `services/p_process/src/adapters/postgres/schema.ts` -- Khai báo schema migration mới -- Đồng bộ hệ thống kiểm tra kiến trúc và migration runner.
- [x] `services/p_process/src/domain/resource.ts` -- Xây dựng domain types và validation cho Resource -- Đảm bảo các bất biến nghiệp vụ và phân định trạng thái công bố.
- [x] `services/p_process/src/adapters/postgres/resource-store.ts` -- Viết adapter truy vấn dữ liệu từ PostgreSQL -- Đảm bảo câu lệnh SQL chỉ trả về tài liệu published, hỗ trợ tìm kiếm từ khóa và lọc loại.
- [x] `services/p_process/src/application/read-resources.ts` -- Cài đặt use cases đọc tài liệu và truy xuất tri thức AI -- Tách biệt logic nghiệp vụ khỏi tầng HTTP adapter.
- [x] `services/p_process/src/adapters/http/routes/resources.ts` & `app.ts` -- Cài đặt Fastify route handlers và đăng ký vào app -- Expose API bảo vệ bởi OIDC `portal:read` và trả lỗi RFC 9457.
- [x] `services/p_process/test/resources.test.js` -- Viết unit & integration tests cho các endpoint resources của P -- Xác minh lọc, tìm kiếm, bảo mật từ chối bản nháp và phân quyền.
- [x] `apps/web/lib/session.ts` -- Cập nhật `safeReturn` regex để hỗ trợ `/portal/resources` và query string -- Đảm bảo không bị mất trang sau khi đăng nhập lại.
- [x] `apps/web/lib/resources.ts` -- Xây dựng data fetching client kết nối BFF tới backend P -- Chuyển tiếp token an toàn từ server-side session.
- [x] `apps/web/app/portal/resources/page.tsx` & `[id]/page.tsx` -- Triển khai UI thư viện và trang chi tiết theo chuẩn WCAG 2.2 AA -- Cung cấp trải nghiệm tìm kiếm, lọc loại, xem nội dung và xử lý trạng thái rỗng.
- [x] `apps/web/app/portal/h/page.tsx` -- Cập nhật khối "Tri thức công ty" kết nối sang Resources -- Đảm bảo tính liền mạch giữa các không gian làm việc.
- [x] `apps/web/test/resources.test.tsx` -- Viết unit tests cho các component giao diện Resources -- Đảm bảo UI render đúng, kiểm tra bộ lọc, tìm kiếm và a11y.
- [x] `apps/web/e2e/portal.spec.ts` -- Bổ sung kịch bản E2E kiểm tra tra cứu Resources trên trình duyệt -- Đảm bảo tính toàn vẹn end-to-end và phản hồi giao diện.

**Acceptance Criteria:**
- Given nhân viên đã đăng nhập có quyền, when mở `/portal/resources`, then hiển thị danh sách các SOP và FAQ đã công bố kèm tên, loại, mã phiên bản, ngày hiệu lực và nhãn trạng thái văn bản.
- Given thư viện có tài liệu, when tìm kiếm theo từ khóa hoặc lọc theo loại SOP/FAQ, then kết quả chỉ trả về các phiên bản đã công bố phù hợp, không chứa bản nháp hoặc bản chưa duyệt.
- Given người dùng có URL trực tiếp tới một bản nháp hoặc bản chưa công bố, when mở URL qua Resources, then hệ thống từ chối theo mặc định (404/403) và không để lộ nội dung hay metadata nhạy cảm.
- Given không có tài liệu nào khớp với từ khóa tìm kiếm hoặc bộ lọc, when kết quả rỗng, then giao diện hiển thị thông báo rõ ràng và cung cấp nút xóa bộ lọc / quay lại Portal, không sinh dữ liệu giả.
- Given AI gửi yêu cầu truy xuất tri thức tham chiếu tới endpoint API, when truy vấn, then hệ thống chỉ trả về tài liệu đã công bố kèm đúng thông tin phiên bản và nguồn gốc (provenance).
- Given nhân viên sử dụng bàn phím hoặc màn hình 320 CSS px / zoom 200%, when duyệt qua ô tìm kiếm, bộ lọc và các thẻ tài liệu, then thứ tự focus rõ ràng, các nhãn ngữ nghĩa đầy đủ và không bị cuộn ngang.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| ID | Verdict | Bằng chứng và xử lý |
|---|---|---|
| R1 | medium | `apps/web/lib/session.ts:32`: Regex `safeReturn` thiếu ký tự `+`, khiến form GET search với dấu cách (ví dụ `?search=bao+hanh`) bị từ chối và fallback về `/portal`. Patch: thêm `+` vào regex. |
| R2 | high | `0009_published_resources.sql` và `schema.ts`: Ràng buộc `UNIQUE (code)` chặn lưu nhiều phiên bản của cùng một SOP. Patch: đổi thành `UNIQUE (code, version)`. |
| R3 | medium | `services/p_process/src/adapters/postgres/resource-store.ts:95`: Câu lệnh `WHERE (id = $1 OR code = $1)` bị lỗi kiểu dữ liệu uuid vs varchar trong PostgreSQL. Patch: so khớp `id = $1::uuid` khi là UUID, hoặc chỉ `WHERE id = $1` khi isUuid=true và `WHERE code = $1` khi isUuid=false. |
| R4 | medium | `resource-store.ts:34`: Format ngày `effective_date` bằng `toISOString().slice(0, 10)` bị lùi 1 ngày ở múi giờ UTC+7. Patch: trích xuất theo năm-tháng-ngày cục bộ hoặc cắt chuỗi yyyy-mm-dd an toàn. |
| R5 | medium | `apps/web/app/portal/resources/page.tsx:12` & `routes/resources.ts`: Tham số `search` khi bị lặp lại trong URL trở thành mảng làm gọi `.trim()` bị ném TypeError. Patch: guard tham số string hoặc mảng phần tử đầu tiên. |
| R6 | medium | `domain/resource.ts`: Fallback về 'Ban Giám đốc' khi không có approver vi phạm quy tắc không tự sinh dữ liệu giả. Patch: giữ nguyên chuỗi rỗng hoặc giá trị thực tế. |
| R7 | low | `apps/web/app/globals.css:126`: Khai báo `role: group;` không hợp lệ trong CSS. Patch: xóa thuộc tính khỏi CSS. |
| R8 | medium | `apps/web/e2e/fake-services.mjs`: Route `/api/v1/resources/` chặn trước route `/api/v1/resources/ai/retrieve`. Patch: đảo thứ tự xử lý route AI trước route id. |
| R9 | medium | `apps/web/test/session.test.ts`, `services/p_process/test/resources.test.js`: Thiếu test verification cho safeReturn resources, kiểm tra effective_date tương lai bị từ chối, tra cứu theo code, và test trực tiếp client fetch. Patch: bổ sung các test cases tương ứng. |


## Design Notes

- Giao diện Resources áp dụng bảng màu tiêu chuẩn DX-OS: Thẻ tài liệu nền trắng `#FFFFFF` trên nền trang `#F5F8FF`, viền xám nhạt bo góc 8px, tiêu đề xanh `#17233F`.
- Huy hiệu loại tài liệu: SOP (xanh dương đậm `#2854E8`), FAQ (xanh lơ `#16B8C9`). Trạng thái "Đang có hiệu lực" hiển thị bằng nhãn chữ rõ ràng với biểu tượng chấm xanh lá.
- Hộp tìm kiếm và nhóm nút lọc (Tất cả, SOP, FAQ) nằm ở đầu trang, hỗ trợ phím bấm nhanh và cập nhật kết quả tức thì.

## Verification

**Commands:**
- `npm test` tại `services/p_process` -- expected: Tất cả các test hiện tại (82 tests) và các test mới cho resources đều PASS.
- `npm test` tại `apps/web` -- expected: Tất cả các test hiện tại (54 tests) và các test mới cho UI resources đều PASS.
- `npm run lint` tại `apps/web` và `services/p_process` -- expected: Không có lỗi TypeScript compilation (`tsc --noEmit`).
- `npm run build` tại `apps/web` và `services/p_process` -- expected: Build production thành công không có lỗi.
- `python scripts/test-architecture.py` -- expected: Tất cả các kiểm tra kiến trúc tuân thủ hệ thống đều PASS (Exit code 0).
