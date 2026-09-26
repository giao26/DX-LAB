---
title: 'Story 2.3: Nhân viên khởi tạo công việc từ trang tổng hợp H và P'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: 'a95cf80afd845e513b3f676bc5ed939451b5f34e'
route: 'dispatch'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-2-nhan-vien-tra-cuu-sop-va-faq-dang-co-hieu-luc.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Các trang tổng hợp H (Con người) và P (Tiến trình) hiện chỉ là các placeholder đơn giản — H thiếu khối thông báo nội bộ theo quyền, và P trỏ thẳng tới biểu mẫu ticket mà không có danh mục quy trình rõ ràng cho nhân viên chọn lựa. Nhân viên không có điểm khởi đầu tập trung để xem tin tức theo phạm vi trách nhiệm và mở đúng công cụ.

**Approach:** Nâng cấp giao diện H và P thành các trang tổng hợp chức năng đầy đủ: H hiển thị thông báo nội bộ (tĩnh/seed, theo phạm vi nhóm), lối vào Resources và lối vào Odoo; P hiển thị danh mục quy trình được phép sử dụng với DX-Ticket là quy trình đầu tiên mở biểu mẫu công khai. Backend P cung cấp endpoint announcements đơn giản với seed data và lọc theo phạm vi nhóm.

## Boundaries & Constraints

**Always:**
- Chỉ nhân viên nội bộ đã đăng nhập với membership hợp lệ (`employee`, `group_lead`, `department_head`, `director`) mới truy cập H và P; áp dụng guard `requirePortal` hiện tại.
- Thông báo trên H chỉ hiển thị: (a) thông báo toàn công ty (`scope: company`) cho tất cả, (b) thông báo nhóm (`scope: group`) chỉ cho thành viên nhóm tương ứng dựa trên `identity.groups`. Không để lộ tiêu đề, nội dung hay số lượng thông báo của nhóm khác.
- Mỗi liên kết trên H và P tới tài nguyên đích (Resources, Odoo, biểu mẫu DX-Ticket) phải kiểm tra lại quyền tại đích — liên kết trên Portal không thay thế authorization của P, Odoo hoặc Resources.
- P hiển thị danh mục quy trình được phép; DX-Ticket xuất hiện với mô tả, đối tượng sử dụng, và nút mở biểu mẫu công khai (`/`). P không mở form trước khi người dùng chọn quy trình.
- Biểu mẫu DX-Ticket không cung cấp đường truy cập ngược tới nội dung nội bộ cho khách không có phiên công ty.
- Khi H hoặc P không có thông báo/quy trình trong phạm vi → hiển thị trạng thái trống rõ ràng với đường quay lại Portal, không tạo dữ liệu giả.
- Khi backend thông báo tạm lỗi → khối thông báo trên H hiển thị lỗi cục bộ với nút thử lại, các liên kết khác (Resources, Odoo) vẫn hoạt động bình thường.
- Giao diện tuân thủ WCAG 2.2 AA; semantic headings, focus logic, reflow 320 CSS px / zoom 200% không cuộn ngang.

**Never:**
- Không hiển thị thông báo nhóm cho người không thuộc nhóm đó.
- Không xây workflow phê duyệt, quản trị hay CMS cho thông báo — chỉ seed data tĩnh trong migration.
- Không mở rộng notification domain hiện tại (email ticket confirmation) — announcement là domain riêng.
- Không tạo bảng/backend cho danh mục quy trình; danh sách process trên P là static trong frontend (DX-Ticket duy nhất hiện tại, các quy trình khác sẽ thêm sau ở epic khác).

**Quyết định Seed Data:** Nạp 3 thông báo mẫu trong migration: (1) toàn công ty "Chào mừng đến DX-OS – hệ thống quản lý vận hành số", (2) nhóm "Kỹ thuật" về lịch bảo trì hệ thống, (3) nhóm "Nhân sự" về quy trình onboarding nhân viên mới. Đảm bảo E2E test được scope filtering đầy đủ và demo ngay.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| H tải thành công | Employee mở `/portal/h` | 3 khối: Thông báo (hiển thị announcements theo scope), Tri thức công ty (link Resources), Công cụ (link Odoo) | N/A |
| Thông báo theo scope company | Bất kỳ nhân viên nào | Thấy tất cả thông báo `scope: company` | N/A |
| Thông báo theo scope group | Nhân viên thuộc nhóm "Kỹ thuật" | Thấy thông báo `scope: company` + thông báo `scope: group` của nhóm "Kỹ thuật"; không thấy thông báo nhóm "Nhân sự" | N/A |
| Nhân viên không thuộc nhóm nào | `identity.groups = []` | Chỉ thấy thông báo `scope: company` | N/A |
| H không có thông báo | Không có announcement nào khớp scope | Hiển thị "Hiện chưa có thông báo nào" với link quay lại Portal | Không tạo dữ liệu giả |
| Backend thông báo lỗi | P trả 503 cho `/api/v1/announcements` | Khối thông báo hiển thị lỗi cục bộ "Không thể tải thông báo" + nút Thử lại; khối Resources và Odoo vẫn hoạt động | Lỗi cách ly trong khối |
| P tải thành công | Employee mở `/portal/p` | Danh mục quy trình: DX-Ticket (mô tả, đối tượng, nút mở biểu mẫu), ghi chú "Các quy trình khác sẽ sớm ra mắt" | N/A |
| Employee chọn DX-Ticket | Click nút mở biểu mẫu | Chuyển tới `/` (biểu mẫu công khai Story 1.3) | N/A |
| Chưa đăng nhập truy cập H/P | Mở `/portal/h` hoặc `/portal/p` khi chưa login | Redirect Keycloak với `returnTo` đúng | N/A |
| Bàn phím / 320 CSS px | Tab/Enter qua các khối H và P | Focus đi theo thứ tự logic, không cuộn ngang | N/A |

</frozen-after-approval>


## Code Map

- `contracts/openapi/p-api.yaml` — Bổ sung `GET /api/v1/announcements` không nhận group từ caller; response bắt buộc `data` và mọi field announcement, `target_group` dùng union null chuẩn OpenAPI 3.1; tài liệu đủ 401/403/503 dạng `application/problem+json`.
- `services/p_process/src/adapters/postgres/migrations/0010_announcements.sql` — Tạo bảng `dx_core.announcements`, ràng buộc nhất quán `scope`/`target_group`, và seed bằng UUID cố định để bootstrap + migration idempotent.
- `services/p_process/src/adapters/postgres/schema.ts` — Khai báo migration 0010 cho runner.
- `services/p_process/src/domain/announcement.ts` — Domain types `Announcement`, `AnnouncementScope` (`company` | `group`), DTO mapper.
- `services/p_process/src/adapters/postgres/announcement-store.ts` — Adapter truy vấn PostgreSQL: lấy announcements theo scope (company + groups thuộc viewer), chỉ khi `published_at <= NOW()` và chưa hết hạn.
- `services/p_process/src/application/read-announcements.ts` — Use case đọc announcements, nhận `identity.groups` từ principal, truyền cho store.
- `services/p_process/src/adapters/http/routes/announcements.ts` — Fastify route `GET /api/v1/announcements` với OIDC `portal:read`; chỉ dùng `principal.groupIds`, không tin group do caller truyền.
- `services/p_process/src/adapters/http/oidc-identity-verifier.ts` — Chấp nhận group Keycloak Unicode có dấu/khoảng trắng nhưng vẫn giới hạn độ dài và loại ký tự phân cách query nguy hiểm; giữ nguyên tên `Kỹ thuật`/`Nhân sự`.
- `services/p_process/src/adapters/http/app.ts` (L~55) — Đăng ký `announcementsRoutes`.
- `services/p_process/src/index.ts` — Wire up `readAnnouncements` use case + announcement store.
- `services/d_data/postgres/init/01_init_schema.sql` — Đồng bộ bảng announcements cho init container.
- `apps/web/lib/portal.ts` (L5-22) — Giữ guard `requirePortal` hiện tại; H page không gọi `currentIdentity` lần hai.
- `apps/web/lib/announcements.ts` — Fetch client gọi P API chỉ bằng Bearer token; dùng lỗi có status để BFF phân biệt re-auth với lỗi dịch vụ.
- `apps/web/app/api/announcements/route.ts` — BFF retry kiểm tra lại local session sau network call, bảo toàn 401/403/503 phù hợp thay vì gom thành 500.
- `apps/web/app/portal/h/page.tsx` & `AnnouncementsBlock.tsx` — Trang H đầy đủ; retry có trạng thái loading/error được announce cho screen reader, không serialize group thừa, ngày cố định timezone `Asia/Ho_Chi_Minh`.
- `apps/web/app/portal/p/page.tsx` — Nâng cấp thành danh mục quy trình: card DX-Ticket (mô tả, đối tượng, CTA mở biểu mẫu `/`), ghi chú quy trình sắp ra mắt, đường quay lại Portal. Semantic sections, WCAG.
- `apps/web/app/globals.css` — Bổ sung styles cho announcements cards, process catalog cards.
- `services/p_process/test/announcements.test.js` — Unit/HTTP tests cho endpoint announcements: danh sách, scope từ principal, auth và lỗi.
- `services/p_process/test/announcement-integration.mjs` & `.github/workflows/ci.yml` — Chạy migration 0010 trên PostgreSQL thật; xác minh seed không trùng, constraint, future/expired filtering, group isolation và thứ tự.
- `apps/web/test/h-page.test.tsx` — Tests cho H page: render khối, thông báo scope, lỗi/retry, empty state.
- `apps/web/test/p-page.test.tsx` — Tests cho P page: render danh mục, link DX-Ticket, empty state.
- `apps/web/e2e/fake-services.mjs` — Mock `/api/v1/announcements` lấy group từ membership server-side và hỗ trợ đủ bốn internal roles, gồm `group_lead`.
- `apps/web/e2e/portal.spec.ts` — Thêm E2E tests cho H announcements, P process catalog, WCAG.

## Tasks & Acceptance

**Execution:**
- [x] `contracts/openapi/p-api.yaml` -- Bổ sung endpoint `GET /api/v1/announcements` không nhận group từ caller, schema bắt buộc đầy đủ và response lỗi chuẩn -- Chuẩn hóa API contract.
- [x] `services/p_process/src/adapters/postgres/migrations/0010_announcements.sql` -- Tạo bảng có invariant scope/target, UUID seed cố định và seed idempotent -- Lưu trữ thông báo nội bộ không trùng.
- [x] `services/p_process/src/adapters/postgres/schema.ts` -- Đăng ký schema announcements nhất quán constraint -- Đồng bộ type/schema.
- [x] `services/p_process/src/domain/announcement.ts` -- Định nghĩa domain types và DTO mapper -- Phân định scope.
- [x] `services/p_process/src/adapters/postgres/announcement-store.ts` -- Adapter PostgreSQL lọc company + group viewer, publication window, expiry và thứ tự -- Bảo vệ phạm vi dữ liệu thật.
- [x] `services/p_process/src/application/read-announcements.ts` -- Use case đọc announcements với identity groups -- Tách biệt logic nghiệp vụ.
- [x] `services/p_process/src/adapters/http/routes/announcements.ts`, `oidc-identity-verifier.ts`, `app.ts`, `index.ts` -- Dùng group Unicode từ principal, không tin query caller, đăng ký và wire up -- Expose API bảo vệ.
- [x] `services/d_data/postgres/init/01_init_schema.sql` -- Đồng bộ bảng/constraint/UUID seed với migration -- Init container nhất quán và idempotent.
- [x] `apps/web/lib/announcements.ts` & `apps/web/app/api/announcements/route.ts` -- Chuyển tiếp token, bảo toàn status auth/service và recheck session -- Retry an toàn.
- [x] `apps/web/app/portal/h/page.tsx` & `AnnouncementsBlock.tsx` -- Nâng cấp UI H: 3 khối, lỗi/retry có live status, timezone ổn định, không truyền group thừa -- Hub khởi tạo công việc WCAG.
- [x] `apps/web/app/portal/p/page.tsx` -- Nâng cấp UI P: danh mục quy trình, card DX-Ticket, CTA, WCAG -- Hub quy trình.
- [x] `apps/web/app/globals.css` -- Styles cho announcement cards và process cards -- Nhất quán thiết kế DX-OS.
- [x] `services/p_process/test/announcements.test.js` & `announcement-integration.mjs` & `.github/workflows/ci.yml` -- Unit/HTTP + PostgreSQL integration cho seed, invariant, scope, publication/expiry/order -- Xác minh production adapter.
- [x] `apps/web/test/h-page.test.tsx` & `apps/web/test/p-page.test.tsx` -- Tests frontend: render, lỗi/retry/loading/live region, empty state và timezone -- Xác minh giao diện.
- [x] `apps/web/e2e/fake-services.mjs` & `apps/web/e2e/portal.spec.ts` -- Fake lấy membership server-side, hỗ trợ `group_lead`, E2E H/P và WCAG -- Kiểm tra end-to-end sát production.

**Acceptance Criteria:**
- Given nhân viên đã đăng nhập, when mở `/portal/h`, then hiển thị 3 khối chức năng (Thông báo, Tri thức công ty, Công cụ làm việc) với heading rõ ràng và link quay lại Portal.
- Given nhân viên thuộc nhóm "Kỹ thuật", when H tải thông báo, then hiển thị thông báo toàn công ty + thông báo nhóm "Kỹ thuật", không hiển thị thông báo nhóm "Nhân sự".
- Given backend thông báo trả lỗi 503, when H tải, then khối thông báo hiển thị lỗi cục bộ và nút thử lại, khối Resources và Odoo vẫn hoạt động.
- Given nhân viên đã đăng nhập, when mở `/portal/p`, then hiển thị danh mục quy trình với DX-Ticket (mô tả + nút mở biểu mẫu) và ghi chú các quy trình sắp ra mắt.
- Given nhân viên chọn DX-Ticket trên P, when click mở biểu mẫu, then chuyển tới `/` là form công khai Story 1.3, form không cung cấp đường quay lại nội dung nội bộ.
- Given bàn phím hoặc 320 CSS px / zoom 200%, when điều hướng H và P, then focus logic, semantic heading, không cuộn ngang.

## Implementation Notes

- Verification sau patch vòng 2: Process Core `98/98`, web Vitest `78/78`, E2E `20/20`, Next production build và architecture conformance đều pass.
- `announcement-integration.mjs` chưa chạy local vì Docker daemon không hoạt động; CI áp đủ migration 0001–0010, áp 0010 lần hai để kiểm idempotency, rồi chạy integration script trên cả clean-install `dxlab_db` và `dxlab_upgrade_test` để kiểm tra seed, constraint, scope, publication/expiry và ordering.

## Spec Change Log

### Review loop 1 — 2026-09-26

- **Trigger:** BH-01/BH-02/BH-03/BH-04/BH-06/BH-07/BH-09/BH-11/BH-12/BH-14/BH-15, EC-01/EC-06/EC-07/EC-10/EC-11 và VG-01/VG-02/VG-03 xác nhận thiết kế triển khai/verification chưa đủ để bảo vệ scope production.
- **Amendment:** Bỏ query group do caller cung cấp; dùng `principal.groupIds`; cho phép tên group Unicode; seed UUID cố định và invariant DB; lọc publication window; chuẩn hóa OpenAPI 3.1/error status; giảm identity lookup thừa; thêm session recheck, trạng thái retry accessible và PostgreSQL integration trong CI.
- **Known-bad state avoided:** Người dùng group thật chỉ thấy announcement công ty, fresh deployment có seed trùng, announcement tương lai hiện sớm, BFF che lỗi auth thành 500, contract lệch runtime, và toàn bộ test vẫn xanh dù SQL production sai.
- **KEEP:** Giữ bố cục H ba section, card announcement company/group, Resources/Odoo vẫn hoạt động khi announcement lỗi, catalog P với CTA DX-Ticket `/`, `Cache-Control: private, no-store`, authorization OIDC tại P, và các test UI/E2E đã chứng minh happy path/error isolation.

## Review Triage Log

| ID | Verdict | Bằng chứng và xử lý |
|---|---|---|
| BH-01 | high | `OidcIdentityVerifier` chỉ giữ group khóa ASCII trong khi seed dùng `Kỹ thuật`/`Nhân sự`; người dùng thật không thể nhận thông báo nhóm. Route: bad_spec. |
| BH-02 | medium | Bootstrap và migration đều insert cùng ba bản ghi với UUID ngẫu nhiên; `ON CONFLICT` không có khóa xung đột nên môi trường mới sinh bản sao. Route: bad_spec. |
| BH-03 | medium | Bảng không ràng buộc cặp `scope`/`target_group`, cho phép dữ liệu sai phạm vi và có thể lộ nội dung. Route: bad_spec. |
| BH-04 | medium | SQL chỉ lọc `expires_at`, không lọc `published_at <= NOW()`, nên thông báo hẹn giờ có thể hiện sớm. Route: bad_spec. |
| BH-05 | low | Seed bảo trì không có `expires_at`, nhưng intent không quy định thời điểm hết hạn và việc chọn mốc cần thêm chính sách; từ chối thay đổi phức tạp cho finding low. |
| BH-06 | medium | H gọi `currentIdentity` trong `requirePortal`, lại gọi lần hai, rồi endpoint announcements xác minh token lần ba; đường đi nặng này xảy ra mỗi lần tải trang. Route: bad_spec. |
| BH-07 | medium | BFF gom lỗi phiên 401/403 và lỗi upstream vào 500, khiến UI retry sai trường hợp cần đăng nhập lại. Route: bad_spec. |
| BH-08 | low | `groups` prop không được dùng nhưng vẫn serialize membership sang client; xóa prop là sửa trực tiếp. Route: patch. |
| BH-09 | medium | Trạng thái retry/lỗi không có `role=status`/`role=alert` hoặc live region, nên screen reader không được thông báo. Route: bad_spec. |
| BH-10 | false | Với danh mục tĩnh hiện tại, DX-Ticket là biểu mẫu công khai và mọi membership nội bộ đều dùng được; không có trạng thái runtime “không có quy trình trong phạm vi” để lỗi xảy ra. |
| BH-11 | medium | OpenAPI thiếu 403/503 và khai báo sai media type 401 so với route thật. Route: bad_spec. |
| BH-12 | medium | Response wrapper không require `data`, schema announcement không require field, trái với consumer TypeScript. Route: bad_spec. |
| BH-13 | low | Fake service bỏ `group_lead` dù vai trò này được production hỗ trợ; làm mất coverage và sẽ từ chối test nếu được gọi. Route: patch. |
| BH-14 | medium | Fake announcements tin query `groups` thay vì giao với membership server-side, nên E2E không kiểm chứng biên authorization thật. Route: bad_spec. |
| BH-15 | medium | Test service và E2E đều tự lặp lại filter, không chạy `PostgresAnnouncementStore`; lỗi SQL/schema/seed vẫn xanh. Route: bad_spec. |
| EC-01 | medium | BFF không recheck `getSession(cookie) === session` sau identity lookup; logout song song có thể vẫn trả một response nội bộ. Route: bad_spec. |
| EC-02 | maybe-false | Danh sách group không bị giới hạn trong code nên URL có thể vượt giới hạn proxy, nhưng chưa có giới hạn URL/deployment và số group tối đa để kết luận. Nếu đúng sẽ là medium; route: defer. |
| EC-03 | false | Use case hiện luôn trả `{ data: array }`; payload 2xx thiếu `data` không được chứng minh là trạng thái có thể tới từ code hiện tại. |
| EC-04 | low | Retry set `error=false` trước khi request xong, làm nút/nhãn loading biến mất và nháy empty state. Route: patch. |
| EC-05 | low | Format ngày trong client không cố định timezone, có thể khác giữa SSR và browser khi timestamp sát ranh giới ngày. Route: patch. |
| EC-06 | medium | Trùng BH-04: query không chặn `published_at` tương lai; code hiện tại xác nhận bad outcome. Route: bad_spec. |
| EC-07 | medium | Trùng BH-03: schema cho phép group null/rỗng và company có target. Route: bad_spec. |
| EC-08 | low | Trùng BH-13: fake service bỏ `group_lead`. Route: patch. |
| EC-09 | false | Sprint đổi Story 1.5 từ backlog sang done, không phải xóa việc chờ; spec 1.5 hiện có `status: done` và tất cả task đã check. |
| EC-10 | high | Trùng BH-01: regex ASCII loại chính xác hai tên group seed. Route: bad_spec. |
| EC-11 | medium | Contract OpenAPI 3.1 dùng `nullable: true` cùng `type: string`; validator JSON Schema có thể từ chối `null` của company announcement. Route: bad_spec. |
| EC-12 | false | Các giá trị DB chính đã bị PostgreSQL type/NOT NULL/scope check chặn; bad outcome “malformed database values” không được chứng minh ngoài invariant target đã ghi riêng ở BH-03. |
| VG-01 | medium | Đã xác minh không có test nào instantiate `PostgresAnnouncementStore`; đổi SQL để lộ group/expired vẫn không làm test hiện tại fail. Route: bad_spec. |
| VG-02 | medium | Đã xác minh seed chỉ được lặp lại trong mock/fake, không test migration 0010; xóa INSERT vẫn xanh. Route: bad_spec. |
| VG-03 | medium | Đã xác minh route trả `application/problem+json` cho 401/403/503 trong khi contract announcements chỉ tài liệu 401 dạng JSON và bỏ 403/503. Route: bad_spec. |
| BH2-01 | medium | CI gắn migration 0010 sau 0006 nhưng bỏ 0007–0009, nên upgrade path không phản ánh chuỗi migration thật. Route: patch. |
| BH2-02 | medium | Verifier ưu tiên `path`; nested path chứa `/` bị loại dù `name` hợp lệ, làm mất group announcement. Route: patch. |
| BH2-03 | false | Các group đang được story hỗ trợ/seed là `Kỹ thuật` và `Nhân sự`, đều qua allowlist; finding không chứng minh bad outcome hiện tại cho tên chứa `&`, dấu nháy hoặc ngoặc. |
| BH2-04 | low | Verifier kiểm tra `trim()` nhưng trả chuỗi chưa trim, nên khoảng trắng biên làm lệch target seed. Sửa chuẩn hóa trực tiếp. Route: patch. |
| BH2-05 | low | Có race rất hẹp sau `requirePortal` nơi fetch kế tiếp trả 401/403 và H hiển thị lỗi cục bộ; không lộ dữ liệu nhưng thông điệp auth chưa đúng. Route: patch. |
| BH2-06 | medium | Retry browser gom 401/403 thành lỗi dịch vụ và cho retry vô hạn dù phiên hết hạn/thu hồi. Route: patch. |
| BH2-07 | medium | Retry thành công unmount nút đang giữ focus mà không chuyển focus tới heading/kết quả. Route: patch. |
| BH2-08 | medium | Retry thành công xóa loading status nhưng danh sách mới không nằm trong live region, screen reader không nhận xác nhận hoàn tất. Route: patch. |
| BH2-09 | false | Carried EC-03: Process Core hiện luôn trả `{ data: array }`; payload 2xx sai shape chưa được chứng minh là trạng thái có thể tới từ code hiện tại. |
| BH2-10 | low | `ORDER BY published_at` không có tie-breaker nên hai bản ghi cùng timestamp có thứ tự không ổn định. Route: patch. |
| BH2-11 | false | Intent cấm CMS và phiên bản hiện tại chỉ có ba seed tĩnh; không có luồng vận hành nào tạo lịch sử vô hạn nên bad outcome chưa thể tới. |
| BH2-12 | low | Schema cho phép `expires_at <= published_at`, tạo bản ghi vĩnh viễn bị ẩn; constraint là sửa trực tiếp. Route: patch. |
| BH2-13 | medium | Route bắt lỗi DB/programming thành 503 nhưng không log, làm mất chẩn đoán production. Route: patch. |
| BH2-14 | medium | Không có test trực tiếp BFF `/api/announcements`, nên status/cache/session recheck có thể regress mà suite vẫn xanh. Route: patch. |
| EC2-01 | medium | Trùng BH2-02: nested Keycloak path bị loại trước khi dùng `name` hợp lệ. Route: patch. |
| EC2-02 | false | Carried EC-03/BH2-09: upstream production không có đường 2xx thiếu `data` trong code hiện tại. |
| EC2-03 | low | Nếu session hết hạn trong lúc upstream 503, catch trả 503 thay vì recheck session; không lộ payload nhưng status sai. Route: patch. |
| EC2-04 | low | Trùng BH2-10: thiếu `id` làm tie-breaker. Route: patch. |
| EC2-05 | low | DB cho phép title rỗng, tạo card không có heading hữu ích. Route: patch. |
| VG2-01 | medium | Đã xác minh không test nào đưa 401/403/503 qua web BFF và kiểm tra `private, no-store`. Route: patch. |
| VG2-02 | medium | Đã xác minh session recheck sau fetch chỉ tồn tại trong production route, chưa có test race logout. Route: patch. |
| VG2-03 | medium | CI chỉ kiểm seed trên upgrade DB; xóa seed khỏi clean-init vẫn xanh. Route: patch. |

## Design Notes

- H page bố trí 3 section theo thứ tự: Thông báo (trên cùng, nổi bật nhất), Tri thức công ty (link Resources), Công cụ làm việc (link Odoo). Mỗi section có heading `<h2>`, mô tả ngắn, và CTA link rõ ràng.
- Thông báo cards: nền trắng `#FFFFFF` trên nền trang `#F5F8FF`, viền trái 4px cobalt `#2854E8` cho thông báo công ty, viền trái cyan `#16B8C9` cho thông báo nhóm. Hiển thị tiêu đề, nội dung tóm tắt, ngày đăng.
- P page: process card style tương tự portal-tile (nền trắng, bo góc 8px, viền nhạt), DX-Ticket card lớn hơn với badge "Đang hoạt động", mô tả rõ đối tượng sử dụng (khách hàng, nhân viên), nút CTA xanh cobalt.
- Empty state dùng text xám nhạt `#7A8BAE` và icon đơn giản, kèm link quay lại Portal.

## Verification

**Commands:**
- `npm test` tại `services/p_process` -- expected: Tất cả test hiện tại + tests mới cho announcements đều PASS.
- `npm test` tại `apps/web` -- expected: Tất cả test hiện tại + tests mới cho H/P pages đều PASS.
- `npm run build` tại `apps/web` -- expected: Build production thành công.
- `python scripts/test-architecture.py` -- expected: Kiểm tra kiến trúc PASS (Exit code 0).
