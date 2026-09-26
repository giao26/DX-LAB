---
title: 'Story 2.3: Nhân viên khởi tạo công việc từ trang tổng hợp H và P'
type: 'feature'
created: '2026-09-26'
status: 'in-review'
baseline_commit: 'a95cf80afd845e513b3f676bc5ed939451b5f34e'
route: 'dispatch'
review_loop_iteration: 0
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

- `contracts/openapi/p-api.yaml` — Bổ sung `GET /api/v1/announcements` endpoint (query param `groups` dạng comma-separated) và schema `Announcement`.
- `services/p_process/src/adapters/postgres/migrations/0010_announcements.sql` — Tạo bảng `dx_core.announcements` (id, title, body, scope, target_group, published_at, expires_at) và seed data.
- `services/p_process/src/adapters/postgres/schema.ts` — Khai báo migration 0010 cho runner.
- `services/p_process/src/domain/announcement.ts` — Domain types `Announcement`, `AnnouncementScope` (`company` | `group`), DTO mapper.
- `services/p_process/src/adapters/postgres/announcement-store.ts` — Adapter truy vấn PostgreSQL: lấy announcements theo scope (company + groups thuộc viewer).
- `services/p_process/src/application/read-announcements.ts` — Use case đọc announcements, nhận `identity.groups` từ principal, truyền cho store.
- `services/p_process/src/adapters/http/routes/announcements.ts` — Fastify route `GET /api/v1/announcements` với OIDC `portal:read`, trích `groups` từ identity.
- `services/p_process/src/adapters/http/app.ts` (L~55) — Đăng ký `announcementsRoutes`.
- `services/p_process/src/index.ts` — Wire up `readAnnouncements` use case + announcement store.
- `services/d_data/postgres/init/01_init_schema.sql` — Đồng bộ bảng announcements cho init container.
- `apps/web/lib/portal.ts` (L5-22) — `requirePortal` hiện trả `session`. H page cần `identity.groups` để scope announcements → gọi `currentIdentity(session)` riêng trong H page (không cần sửa `requirePortal`, giữ interface hiện tại).
- `apps/web/lib/announcements.ts` — BFF fetch client gọi P API truyền Bearer token; groups được truyền như query param từ identity đã resolve trong H page.
- `apps/web/app/portal/h/page.tsx` — Nâng cấp từ 6 dòng → trang đầy đủ: khối thông báo (fetch từ BFF, xử lý lỗi/retry client-side), khối Resources (giữ nguyên), khối Odoo (giữ nguyên). Semantic sections, WCAG.
- `apps/web/app/portal/p/page.tsx` — Nâng cấp thành danh mục quy trình: card DX-Ticket (mô tả, đối tượng, CTA mở biểu mẫu `/`), ghi chú quy trình sắp ra mắt, đường quay lại Portal. Semantic sections, WCAG.
- `apps/web/app/globals.css` — Bổ sung styles cho announcements cards, process catalog cards.
- `services/p_process/test/announcements.test.js` — Tests cho endpoint announcements: danh sách, scope filtering, auth.
- `apps/web/test/h-page.test.tsx` — Tests cho H page: render khối, thông báo scope, lỗi/retry, empty state.
- `apps/web/test/p-page.test.tsx` — Tests cho P page: render danh mục, link DX-Ticket, empty state.
- `apps/web/e2e/fake-services.mjs` — Thêm mock `/api/v1/announcements` endpoint.
- `apps/web/e2e/portal.spec.ts` — Thêm E2E tests cho H announcements, P process catalog, WCAG.

## Tasks & Acceptance

**Execution:**
- [x] `contracts/openapi/p-api.yaml` -- Bổ sung endpoint `GET /api/v1/announcements` với schema và query params -- Chuẩn hóa API contract.
- [x] `services/p_process/src/adapters/postgres/migrations/0010_announcements.sql` -- Tạo bảng `dx_core.announcements` và seed data -- Lưu trữ thông báo nội bộ.
- [x] `services/p_process/src/adapters/postgres/schema.ts` -- Đăng ký migration 0010 -- Đồng bộ migration runner.
- [x] `services/p_process/src/domain/announcement.ts` -- Định nghĩa domain types và DTO mapper -- Phân định scope và validation.
- [x] `services/p_process/src/adapters/postgres/announcement-store.ts` -- Adapter truy vấn announcements từ PostgreSQL theo scope -- Lọc company + group viewer.
- [x] `services/p_process/src/application/read-announcements.ts` -- Use case đọc announcements với identity groups -- Tách biệt logic nghiệp vụ.
- [x] `services/p_process/src/adapters/http/routes/announcements.ts` & `app.ts` & `index.ts` -- Route handler OIDC, đăng ký và wire up -- Expose API bảo vệ.
- [x] `services/d_data/postgres/init/01_init_schema.sql` -- Đồng bộ bảng announcements -- Init container nhất quán.
- [x] `apps/web/lib/announcements.ts` -- BFF fetch client gọi P API -- Chuyển tiếp token an toàn.
- [x] `apps/web/app/portal/h/page.tsx` -- Nâng cấp UI H: 3 khối (thông báo, Resources, Odoo), xử lý lỗi/retry, WCAG -- Hub khởi tạo công việc.
- [x] `apps/web/app/portal/p/page.tsx` -- Nâng cấp UI P: danh mục quy trình, card DX-Ticket, CTA, WCAG -- Hub quy trình.
- [x] `apps/web/app/globals.css` -- Styles cho announcement cards và process cards -- Nhất quán thiết kế DX-OS.
- [x] `services/p_process/test/announcements.test.js` -- Tests backend: danh sách, scope filtering, unauthorized -- Xác minh bảo mật và logic lọc.
- [x] `apps/web/test/h-page.test.tsx` & `apps/web/test/p-page.test.tsx` -- Tests frontend: render, scope, lỗi, empty state -- Xác minh giao diện.
- [x] `apps/web/e2e/fake-services.mjs` & `apps/web/e2e/portal.spec.ts` -- Mock announcements + E2E tests cho H/P -- Kiểm tra end-to-end.

**Acceptance Criteria:**
- Given nhân viên đã đăng nhập, when mở `/portal/h`, then hiển thị 3 khối chức năng (Thông báo, Tri thức công ty, Công cụ làm việc) với heading rõ ràng và link quay lại Portal.
- Given nhân viên thuộc nhóm "Kỹ thuật", when H tải thông báo, then hiển thị thông báo toàn công ty + thông báo nhóm "Kỹ thuật", không hiển thị thông báo nhóm "Nhân sự".
- Given backend thông báo trả lỗi 503, when H tải, then khối thông báo hiển thị lỗi cục bộ và nút thử lại, khối Resources và Odoo vẫn hoạt động.
- Given nhân viên đã đăng nhập, when mở `/portal/p`, then hiển thị danh mục quy trình với DX-Ticket (mô tả + nút mở biểu mẫu) và ghi chú các quy trình sắp ra mắt.
- Given nhân viên chọn DX-Ticket trên P, when click mở biểu mẫu, then chuyển tới `/` là form công khai Story 1.3, form không cung cấp đường quay lại nội dung nội bộ.
- Given bàn phím hoặc 320 CSS px / zoom 200%, when điều hướng H và P, then focus logic, semantic heading, không cuộn ngang.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| ID | Verdict | Bằng chứng và xử lý |
|---|---|---|

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
