---
title: '2-1 — Portal điều hướng H/P/D/I'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: '06821630e319c0db6f6f83596b7a31d910bdfeae'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-2-1-dieu-huong-h-p-d-i/SPEC.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Web hiện chỉ có form khách; nhân sự chưa có Portal chung.

**Approach:** Thêm Portal `/portal`, trang H/P và một Dashboard D/I có phân quyền; giữ `/` là form công khai.

## Boundaries & Constraints

**Always:** Keycloak Code+PKCE; kiểm tra issuer/audience/nonce/state và tài khoản hoạt động. Cookie chỉ chứa ID phiên opaque có chữ ký, Secure/HttpOnly/SameSite=Lax; token server-side. Kiểm tra quyền hiện hành tại từng URL, không cache nội dung riêng. CSRF cho mutation dùng cookie. Tiếng Việt, WCAG 2.2 AA, Trust Blue, H→P→D→I, focus rõ, 320 CSS px/zoom 200% không tràn ngang.

**Quyết định:** Membership yêu cầu ít nhất một role hiện hành `employee`, `group_lead`, `department_head`, `director`; Dashboard D/I chỉ `director`. Không thêm role company_member.

**Never:** Khách nhận quyền nội bộ; token vào browser/log; link thay thế quyền tại P/Odoo; bịa dữ liệu SOP/thông báo/KPI/AI. Không triển khai 2.2/2.3/Epic 3/4 hay sửa lỗi demo đang để lại.

## I/O & Edge-Case Matrix

| Trạng thái / Khi | Kết quả |
| --- | --- |
| Chưa login / URL nội bộ | Chuyển Keycloak trước nội dung/link nội bộ |
| Token sai, state/nonce sai, replay callback | Không tạo phiên, lỗi an toàn |
| Disabled, mất membership/quyền, phiên hết hạn | Từ chối; không trả dữ liệu nội bộ |
| Keycloak/P lỗi | Fail closed, thông báo dịch vụ không khả dụng |
| return URL ngoài website | Không chuyển ra ngoài |
| Cookie bị sửa / logout không có CSRF | Từ chối |
| Khách gửi form | Giữ form/xác nhận, không tạo phiên nhân sự |

</frozen-after-approval>

## Code Map

- `apps/web/app/page.tsx`, `ticket-form.tsx`, `bff/tickets/route.ts`: luồng công khai cần giữ.
- `services/p_process/src/adapters/http/oidc-identity-verifier.ts`: introspection, online enabled/roles/groups; tái dùng qua endpoint P, không import xuyên package.
- `services/p_process/src/application/principal.ts`: bốn role hiện có; department_head có quyền ticket toàn tổ chức, chưa đồng nghĩa quyền I.
- `infra/caddy/Caddyfile`: `/auth*`, `/resources*` thuộc Keycloak; chọn callback `/bff/session/callback`, Resources tương lai dưới `/portal`.
- `apps/web/AGENTS.md`: đọc Next guide đi kèm trước code.

## Tasks & Acceptance

**Execution:**
- [x] `contracts/openapi/p-api.yaml`, `services/p_process/src/adapters/http/app.ts`, `routes/identity.ts`, `oidc-identity-verifier.ts` — endpoint identity dùng scope riêng `portal:read`, verifier online hiện có; chỉ sub/roles/groups, không PII. Các path rút gọn thuộc cùng thư mục adapters/http.
- [x] `infra/keycloak/dxlab-realm.json`, `docker-compose.yml`, `.env.example` — cấu hình OIDC Web/audience và policy đã chốt; không tự áp dụng vào realm đang chạy.
- [x] `apps/web/lib/session.ts`, `apps/web/app/bff/session/{login,callback,logout}/route.ts` — login, phiên, bảo vệ callback/CSRF, timeout và logout; kho phiên server-side có hạn và TTL, restart yêu cầu login lại.
- [x] `apps/web/app/portal/{layout,page}.tsx`, `portal/h/page.tsx`, `portal/p/page.tsx`, `portal/resources/page.tsx`, `portal/dashboard/page.tsx`, `app/globals.css` — guard trước render, bốn ô toàn phần, trang tổng hợp có quay lại; Dashboard dùng section D/I hợp lệ, Resources/chức năng chưa có nói rõ. Path portal và app rút gọn thuộc apps/web/app.
- [x] `apps/web/test/session.test.ts`, `apps/web/test/portal.test.tsx`, `apps/web/e2e/portal.spec.ts`, `services/p_process/test/identity.test.js` — matrix lỗi, quyền URL trực tiếp/thu hồi, login giả lập OIDC đúng giao thức, khách và keyboard/reflow.
- [x] `docs/portal.md` — đường dẫn, policy, cấu hình và cập nhật realm hiện có; không đụng dữ liệu demo.

**Acceptance Criteria:**
- Given nhân sự hợp lệ, when mở Portal, then H/P/D/I có tên đầy đủ và mô tả; toàn ô là link.
- Given đã login, when chọn H/P, then mở đúng trang tổng hợp và quay lại Portal được.
- Given có quyền, when chọn D/I, then cùng Dashboard mở đúng section; không quyền thì đích từ chối.
- Given khách, when dùng form/xác nhận rồi mở Portal/Resources/Odoo/Dashboard, then phiên khách không cấp quyền.
- Given 320 CSS px hoặc zoom 200%, when Tab/Enter qua các ô, then thứ tự rõ, focus thấy được, không cuộn ngang.

## Implementation Notes

- P bổ sung `/api/v1/identity` với scope riêng `portal:read`, tái dùng verifier online và chỉ trả sub/roles/groups. Web kiểm tra lại tại từng đích riêng; Dashboard yêu cầu director.
- Callback Code+PKCE S256 tiêu thụ state một lần, kiểm tra cookie login có chữ ký, chữ ký RS256 qua JWKS và issuer/audience/azp/nonce/thời hạn. Token ở server trong kho global có giới hạn cho một process; TTL phiên bằng giá trị nhỏ hơn giữa thời hạn access token và 30 phút, login chờ 5 phút. Restart cần login lại; nhiều replica cần kho TTL dùng chung.
- Portal có bốn ô tiếng Việt H/P/D/I, H/P quay lại Portal, một Dashboard D/I và thông báo rõ chức năng chưa triển khai. Giữ intake công khai. Cookie Secure/HttpOnly/Lax chỉ chứa ID opaque có chữ ký; logout cần CSRF+Origin và xóa cache để không khôi phục nội dung riêng. H mở đúng `/dx/tickets/workspace`, route Odoo hiện có yêu cầu `auth=user`.
- Runner E2E build Web standalone cô lập, dùng IdP/P giả đúng giao thức, quản lý trực tiếp process Node và chờ đóng hoàn tất; tránh lỗi teardown taskkill của Playwright trên Windows. IdP giả ký RSA và kiểm tra PKCE, không có đường bỏ qua xác thực trong production.
- Chỉ thay cấu hình realm; không import/rebuild/sửa dữ liệu demo đang chạy. Compose cho phép secret trống khi core không dùng Web; Web vẫn từ chối login và không tạo phiên khi secret thiếu/ngắn.
- Sau review: giữ scope ticket cũ, nối WEB_OIDC_* overrides, guard URL con không cạnh tranh với layout, selector D/I đi qua query/fragment, logout phiên hết hạn dọn cookie/cache, trang lỗi cho login lại. Kiểm tra lại phiên sau await và subject binding trước tạo phiên; fragment lạ fallback về tiêu đề.

## Spec Change Log

## Review Triage Log

| ID | Verdict | Bằng chứng và xử lý |
| --- | --- | --- |
| B1 | medium | Realm web bỏ scope ticket đã tồn tại; đổi này không cần cho Portal và làm mất khả năng các consumer hiện có. Patch: giữ scope cũ, thêm portal:read. |
| B2 | medium | Compose dùng OIDC_ISSUER và hardcode dù example/docs quảng bá WEB_OIDC_*. Patch: nối các biến Web với fallback hiện tại. |
| B3 | medium | Layout/page cùng redirect khi thiếu phiên, layout luôn dùng /portal nên không bảo đảm URL con sau login. Patch: chỉ guard URL con ở page khi không có phiên; layout không trả header nội bộ trước xác thực. |
| B4 | medium | Fragment D/I không tới server; callback chỉ nhận /dashboard nên mất phần khi login lại. Patch: mang cùng selector D/I trong query của liên kết hiện có, giữ fragment để focus; không thêm chức năng hay endpoint. |
| B5 | low | Store có trần 10.000 pending/5 phút, nên burst đủ lớn có thể chặn login. Tình huống tấn công này không thuộc dùng demo thường ngày; thêm rate/admission policy là nhánh trạng thái mới. Reject theo quy tắc low/complexity, không thay giới hạn hữu hạn đã duyệt. |
| B6 | medium | endSession từ chối phiên hết hạn trước khi route xóa cookie/cache; thao tác logout từ trang mở lâu trả 403. Patch: cleanup phiên đã mất với Origin và CSRF field hợp lệ, vẫn xác minh CSRF đúng cho phiên sống. |
| B7 | medium | Error page chỉ có về trang công khai, không có đường login/retry cho token bị thu hồi. Patch: thêm link đăng nhập lại an toàn, không tái dùng token cũ. |
| B8 | low | querySelector nhận hash bất kỳ, #] ném lỗi và hash không tồn tại bỏ focus. Patch trực tiếp: getElementById cho d/i và fallback h1. |
| B9 | medium | Test identity mới stub verifier, E2E giả cả P nên thiếu phép nối endpoint với verifier production và scope mới. Patch: contract test endpoint dùng verifier thật với HTTP IdP fixture, deny thiếu scope/disabled/mất role; kiểm tra realm scope/audience cấu hình. Không truy cập demo thật. |
| E1 | medium | requirePortal lấy phiên trước await identity; logout/TTL trong khoảng await chưa được kiểm tra lại. Patch: reread cùng cookie sau await trước render; test race. |
| E2 | low | Cùng lỗi fragment B8, giữ một patch nhưng ghi nhận riêng phát hiện này. |
| E3 | medium | getSession nằm ngoài try và readId gọi config; cookie đúng shape khi secret thiếu/short ném 503 ra ngoài guard. Patch: bắt lỗi đọc phiên rồi dùng trang service unavailable; giữ redirect login ngoài catch lỗi. |
| G1 | medium | Fixtures luôn sub=staff ở cả ID token/P, bỏ subject binding vẫn pass. Patch: callback ID token hợp lệ + P sub khác phải reject, không tạo phiên. |

- Kết quả xử lý: B1–B4, B6–B9, E1–E3 và G1 đã sửa, test liên quan pass. B5 reject theo quy tắc low/complexity. Không có finding chuyển deferred-work hay yêu cầu đổi phạm vi.

## Verification

- Kiểm thử triển khai: Web lint PASS, unit 29/29 PASS (gồm phiên hoàn tất login hết hạn rồi không phục hồi, route logout POST từ chối thiếu CSRF và hủy phiên khi hợp lệ, URL Odoo đúng), build production PASS; Chrome E2E 10/10 PASS gồm hồi quy công khai, cookie Secure, URL trực tiếp bị từ chối, focus section D/I, từ chối department_head, thu hồi membership, lỗi IdP/P, logout+Back, bàn phím, reflow 320 CSS px/200% và axe. P lint/build PASS, test 80/80 PASS.
- Root kiểm tra kiến trúc PASS với signing-secret giả chỉ trong môi trường kiểm thử. Chưa chạy với Keycloak/HTTPS thật; E2E dùng Secure cookie trên Chrome localhost và IdP/P giả. Triển khai HTTPS/realm thật là công việc vận hành theo `docs/portal.md`.

- `apps/web`: `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:e2e` — pass.
- `services/p_process`: `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`; contract identity và regression quyền hiện có pass.
- Không chạy/rebuild môi trường demo đang hoạt động. Kiểm thử cô lập với fake IdP/P; ghi rõ mọi hạn chế trình duyệt thực tế.
- Xác minh cuối bởi root sau patch: Web lint/build PASS, 48/48 unit PASS; P lint/build PASS, 82/82 test PASS; production standalone Chrome E2E 16/16 PASS, runner exit 0. Ma trận 7 dòng có test đã chạy/pass (token/state/replay, phiên hết hạn, thu hồi quyền, lỗi dependency, return URL, cookie/CSRF, luồng khách). Ảnh desktop/320px được kiểm tra trực quan; axe và reflow 200% pass.
- Compose `core config --quiet` với secret rỗng PASS; toàn bộ architecture conformance PASS, exit 0, không warning. Môi trường demo thật không bị thay đổi, xác minh HTTPS/Keycloak thực vẫn chưa thực hiện.
