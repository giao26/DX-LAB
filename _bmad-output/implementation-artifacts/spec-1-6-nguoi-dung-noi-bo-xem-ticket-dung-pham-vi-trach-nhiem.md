---
title: 'Story 1.6: Người dùng nội bộ xem ticket đúng phạm vi trách nhiệm'
type: 'feature'
created: '2026-09-25'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 3
baseline_commit: '66afc6990539b42a99ca6153037b415f0b1fe78d'
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** API đọc ticket hiện công khai và trả đầy đủ PII; P chưa xác thực danh tính nội bộ, chưa lọc danh sách theo nhóm/phân công và chưa có đường tải tệp được bảo vệ.

**Approach:** Thêm xác thực Keycloak tại P, policy vai trò–nhóm–người phụ trách, DTO đã che dữ liệu, tải tệp có audit và Odoo gọi P bằng token ủy quyền.

## Boundaries & Constraints

**Always:** Mỗi request, P xác minh trực tuyến issuer, audience, scope, `sub`, client và entitlement hiện hành; không dùng identity header. Nhân viên thấy list nhóm đã che; assignee thấy liên hệ/tệp, Trưởng nhóm thấy nhóm mình, vai trò rộng thấy toàn tổ chức. Ngoài phạm vi và không tồn tại cùng trả 404. Read/download audit tác nhân/client, không ghi dữ liệu nhạy cảm. POST intake và polling email tối thiểu vẫn công khai.

**Never:** Không dùng mã ticket làm quyền, load-all rồi lọc, lộ PII/link tệp, cho Odoo đọc DB P hoặc làm thuật toán phân công Story 1.7. Migration chỉ cộng thêm; scope chưa rõ phải deny-by-default.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Danh sách nhóm | Nhân viên có scope/group hiện hành | Chỉ ticket cùng nhóm; mã, loại, trạng thái, SLA, tóm tắt; không PII/tệp | Token sai/thiếu scope: 401/403 |
| Chi tiết được phép | Assignee, lead cùng nhóm hoặc vai trò rộng | DTO theo policy; tải tệp qua P; ghi audit | Không có tệp: 404 chung |
| Ngoài phạm vi | Khác nhóm, chưa được phân công hoặc entitlement đã thu hồi | Không trả ticket/tệp hay dấu hiệu tồn tại | 404 cùng cấu trúc với ID không tồn tại |
| Mạo danh | Bearer hợp lệ, header actor/group giả | Chỉ token và entitlement đã xác minh được dùng | Không nâng quyền |

</frozen-after-approval>

## Code Map

- `services/p_process/src/adapters/http/` — giữ POST công khai; bảo vệ GET/download.
- `services/p_process/src/application/` — principal, policy, read use case và ports.
- `services/p_process/src/adapters/postgres/` cùng `services/d_data/postgres/init/01_init_schema.sql` — schema và query scoped trong SQL.
- `services/p_process/src/adapters/storage/filesystem-attachment-storage.ts` — đọc opaque key sau authorization.
- `services/p_process/src/index.ts`, `.env.example`, `docker-compose.yml` — wire introspection/entitlement và mapping quyền.
- `infra/keycloak/` — realm import chạy được cho roles, groups, clients, scopes, token exchange và service-account entitlement lookup; không dùng endpoint Keycloak tùy biến chưa tồn tại.
- `contracts/openapi/p-api.yaml` — security scheme, DTO và download contract.
- `apps/web/app/bff/tickets/[id]/route.ts` — polling công khai không PII.
- `services/h_human/addons/dx_core/` — list/detail Odoo không lưu dữ liệu nhạy cảm.
- `services/p_process/test/`, `apps/web/test/`, `services/h_human/addons/dx_core/tests/` — ma trận quyền, integration adapter thật và regression.

## Tasks & Acceptance

**Execution:**
- [x] `services/p_process/src/application/` — tạo principal, ports, policy và DTO redaction; list summary phải loại PII thay vì cắt mô tả thô.
- [ ] `services/p_process/src/adapters/http/`, `src/index.ts` — bảo vệ list/detail/download, authenticate nhất quán, audit đúng outcome và xử lý IdP unavailable có cấu trúc; public status phải tự project đúng bốn trường; mọi protected response `no-store`; download xác minh size/checksum trước khi trả; giữ POST anonymous.
- [x] `services/p_process/src/adapters/postgres/`, `services/d_data/postgres/init/01_init_schema.sql` — migration additive, query scoped, audit list và fail-fast mapping; có chiến lược migration rõ cho ticket cũ.
- [x] `services/p_process/src/adapters/storage/` — đọc/ghi tệp an toàn, dọn partial write và chỉ audit download sau khi đọc thành công.
- [ ] `infra/keycloak/`, `infra/caddy/`, `contracts/openapi/p-api.yaml`, config — dùng canonical HTTPS issuer/callback nhất quán; Caddy phải route `/dx/*` và `/auth_oauth/*` sang Odoo trước matcher Keycloak; provision login/token-exchange stock Keycloak và contract 503/MIME chính xác.
- [ ] `apps/web/`, `services/h_human/addons/dx_core/` — validate public status; Odoo on-demand phải validate list/detail, giữ status an toàn cho 404/reauth, có lối đăng nhập lại khi subject token hết hạn, không persist projection/detail nhạy cảm và gọi lại P ở mỗi list/detail/download.
- [ ] Tests/CI — thêm exact public-status keys, SQL status filter, Keycloak group pagination, rollback-cleanup khi ROLLBACK lỗi, download integrity/no-store, controller Odoo executable harness và architecture assertions cho ingress/callback order; runtime smoke giữ login/token-exchange/introspection/Admin API/protected-read; giữ regression Story 1.3–1.5.

**Acceptance Criteria:**
- Given Web/Odoo gọi P, when token hợp lệ, then P áp dụng role–group–assignment trên từng tài nguyên.
- Given nhân viên chưa nhận ticket, when xem list/detail, then list đã che và detail/tệp bị từ chối không lộ tồn tại.
- Given assignee, lead đúng nhóm hoặc vai trò rộng, when đọc tài nguyên, then nhận đúng DTO và có audit an toàn.
- Given entitlement bị thu hồi, when request tiếp theo chạy, then tab/link cũ bị từ chối.
- Given Odoo desktop/mobile, when dùng bằng bàn phím, then mã, trạng thái, focus và hành động chính khả dụng, không lộ ngoài scope.

## Implementation Notes

- P introspect token và lấy entitlement ở từng request; issuer/audience/scope/`sub` cùng calling client allowlist đều được kiểm tra trước policy.
- List SQL chỉ chọn projection không PII; ticket thiếu `group_id` bị deny-all kể cả vai trò toàn tổ chức. Detail/tệp ngoài scope dùng cùng phản hồi 404.
- Odoo dùng token exchange và controller on-demand không tạo record projection/detail; mỗi lần render danh sách, mở chi tiết hoặc tải tệp đều gọi lại P bằng token mới đổi. Public BFF polling chỉ trả bốn trường an toàn.
- `slaDueAt` giữ `null` vì lịch SLA thuộc Story 1.9; không phát hành deadline suy đoán.
- Verification: P 51/51, Web 14/14, E2E 4/4, Odoo adapter 7/7, Next production build, architecture/config checks và integration Compose migration/SQL scope/pagination/audit/download đều PASS. Stock Keycloak 26.7.4 ephemeral import realm thành công; Odoo login authorization, password token, introspection, Admin API, token exchange và protected read đều PASS.
- Review loop 2 verification: kiểm tra độc lập đã chạy lại P, Web, E2E, Odoo, Next build, Python compile, Compose, architecture, PostgreSQL integration và stock-Keycloak ephemeral runtime smoke; tất cả PASS.

## Spec Change Log

- Review loop 1 — Review phát hiện auth config phụ thuộc endpoint Keycloak không tồn tại, list summary có thể lộ PII, Odoo bỏ detail/download, audit outcome và coverage adapter thật còn thiếu. Đã bổ sung realm import chạy được, redaction riêng, audit/list/download semantics, Odoo pagination/detail/download và verification migration/SQL/storage/Odoo. Tránh trạng thái demo không thể đăng nhập hoặc UI chỉ giả vờ mở detail. KEEP: SQL scope deny-by-default, 404 chống enumeration, polling công khai tối thiểu, owner rule Odoo, allowlist calling client và toàn bộ regression Story 1.3–1.5.
- Review loop 1 verification — Chạy stock Keycloak phát hiện và sửa `token-exchange-standard:v1` không hợp lệ trên 26.7.4 cùng realm thiếu `sub` mapper; đã thêm kiểm tra kiến trúc hồi quy. E6 được xử lý bằng partial-write cleanup và rollback cleanup có test.
- Review loop 2 — Review phát hiện transient Odoo vẫn persist dữ liệu và cho tab cũ đọc sau revoke, realm chưa provision đường login Odoo, issuer public/internal chưa thống nhất và CI chưa chạy Keycloak runtime. Đã yêu cầu projection/detail Odoo on-demand không persist, login/token-exchange runnable, canonical issuer qua ingress/backchannel và smoke test stock Keycloak trong CI. Tránh trạng thái unit test xanh nhưng UI giữ dữ liệu sau revoke hoặc demo chỉ chạy khi lấy token thủ công. KEEP: SQL scope/redaction/404 deny-by-default, stock Admin API entitlement mỗi request, safe list summary, audit thành công sau storage read, cleanup file, BFF shape validation, OpenAPI detail đã sửa, Odoo pagination/detail/download semantics và toàn bộ test đang xanh.
- Review loop 3 — Review chứng minh workspace `/dx/*` rơi vào Next.js và callback `/auth_oauth/*` bị `/auth*` gửi sang Keycloak; smoke chỉ mở login page nên không bắt lỗi ingress. Đã yêu cầu route order Caddy, canonical HTTPS/callback nhất quán, Odoo reauth/status/DTO validation, Keycloak group pagination và các verification gap cụ thể. Tránh demo login thành công ở Keycloak nhưng không thể quay về/mở workspace Odoo. KEEP: on-demand Odoo không persist, stock realm/token exchange/Admin API đã chạy thật, SQL scope/redaction/404, safe audit/attachment cleanup, OpenAPI và toàn bộ regression đang xanh.

## Review Triage Log

- B1 — `high`: Stock Keycloak không có `/dx-entitlements/me` và chưa có realm/client provisioning; protected reads không thể chạy trong demo. Route `bad_spec`.
- B2 — `false`: Ticket cũ `group_id=NULL` bị deny-all là hành vi đã khóa để không đoán scope; migration notes phải làm rõ nhưng không được backfill suy đoán.
- B3 — `medium`: Mapping JSON lỗi âm thầm tạo ticket vô scope; cần fail-fast thay vì mất ticket khỏi mọi list. Route `bad_spec`.
- B4 — `high`: Cắt 160 ký tự mô tả không phải redaction và có thể lộ PII trên list. Route `bad_spec`.
- B5 — `medium`: List read chưa audit dù frozen intent yêu cầu read/download audit. Route `bad_spec`.
- B6 — `medium`: Audit download được ghi trước khi storage read thành công. Route `bad_spec`.
- B7 — `low`: UUID sai trả 404 trước auth còn UUID đúng trả 401; không lộ tồn tại nhưng làm protected contract không nhất quán. Route `patch`.
- B8 — `low`: 401 thiếu `WWW-Authenticate: Bearer`; sửa header trực tiếp. Route `patch`.
- B9 — `medium`: IdP timeout/network/JSON lỗi rơi vào 500 hoặc bị đánh đồng credential. Route `bad_spec`.
- B10 — `medium`: Odoo luôn xin cả download scope nên user read-only có thể không list được. Route `bad_spec`.
- B11 — `high`: Odoo chỉ lấy trang đầu, giấu ticket sau 20. Route `bad_spec`.
- B12 — `high`: Odoo bỏ response detail và mở lại list projection. Route `bad_spec`.
- B13 — `high`: Odoo không có hành động download attachment được P authorize. Route `bad_spec`.
- B14 — `high`: OpenAPI `allOf` kết hợp base `additionalProperties:false` làm detail runtime không hợp schema. Route `patch`.
- V1 — `medium`: Test OIDC gộp issuer/audience/scope nên từng check có thể regress mà suite vẫn xanh. Route `patch`.
- V2 — `medium`: Integration tự UPDATE `group_id`, không kiểm mapping intake thật. Route `patch`.
- V3 — `medium`: Test role mock bỏ qua nhánh SQL lead/org-wide production. Route `patch`.
- V4 — `high`: Download chưa chạy qua SQL và filesystem thật; leak/hỏng đường dẫn có thể lọt. Route `patch`.
- V5 — `medium`: Rollback cleanup sau save chưa có failure-path test. Route `patch`.
- V6 — `high`: CI upgrade schema không áp dụng/kiểm 0005–0006. Route `patch`.
- V7 — `high`: Odoo token exchange/refresh/owner/detail chưa có executable test. Route `bad_spec` cùng B10–B13.
- V8 — `defer (medium, unverified)`: Windows renderer fix ngoài Story 1.6 chưa có collision/publish tests; cần test riêng của tooling để xác nhận.
- V9 — `high`: Odoo action detail bỏ payload; trùng bằng chứng B12 và route `bad_spec`.
- E1 — `defer (medium)`: Zero-byte multipart bị BFF Story 1.5 bỏ qua; đây là thay đổi có trước Story 1.6, cần sửa ở attachment intake.
- E2 — `medium`: BFF status không validate shape upstream trước khi trả 200. Route `bad_spec`.
- E3 — `high`: `active` truthy không-boolean có thể qua verifier; correction `=== true` là `patch`.
- E4 — `medium`: IdP timeout/malformed JSON thành 500; trùng B9, route `bad_spec`.
- E5 — `low`: `status=` rỗng thành unfiltered list; correction trực tiếp là `patch`.
- E6 — `defer (medium)`: Story 1.5 storage save không dọn partial file khi write/close lỗi.
- E7 — `defer (medium)`: Process chết giữa file save và DB commit có thể để orphan; cần reconciliation design của attachment lifecycle.
- E8 — `defer (high, unverified)`: Commit ACK mất có thể khiến cleanup xóa file đã commit; cần fault-injection PostgreSQL để xác nhận.
- E9 — `false`: Page/count lệch dưới concurrent writes chỉ ảnh hưởng total tức thời; transaction snapshot tăng độ phức tạp không tương xứng.
- E10 — `medium`: Missing storage vẫn audit download thành công; trùng B6, route `bad_spec`.
- E11 — `high`: Odoo chỉ lấy 20 ticket; trùng B11, route `bad_spec`.
- E12 — `high`: Odoo bỏ detail payload; trùng B12, route `bad_spec`.
- E13 — `medium`: Public status contract thiếu `PROCESSING` dù runtime có trạng thái này. Route `patch`.
- E14 — `low`: Legacy `getTicketById` hiện dead nhưng không tạo leak/runtime failure; reject vì xóa chéo Story 1.5 không đáng rủi ro.
- R2-EC1 — `medium`, route `defer`: JSON/base64 gần giới hạn 10 MB có thể vượt cap BFF; đây là hành vi intake Story 1.5 có trước Story 1.6.
- R2-EC2 — `carried defer (medium)`: cùng vị trí và claim E1; zero-byte multipart vẫn bị coi như không có attachment.
- R2-EC3 — `medium`, route `patch`: introspection 429/4xx do dependency/config bị báo sai thành credential 401; non-success của endpoint phải thành IdP unavailable.
- R2-EC4 — `low`, rejected`: realm và mapping Story 1.6 cố ý dùng group ID phẳng hợp lệ; hỗ trợ nested path cần thêm mô hình mapping không đáng cho cấu hình hiện tại.
- R2-EC5 — `carried false`: cùng vị trí và claim E9; page/count chỉ có thể lệch total tức thời, không chứng minh lỗi quyền hoặc mất dữ liệu trong snapshot đã trả.
- R2-EC6 — `medium`, route `patch`: Odoo không validate từng item là object nên payload lỗi có thể gây `AttributeError` ngoài lỗi tích hợp có cấu trúc.
- R2-EC7 — `low`, route `patch`: record transient hết hạn khiến `_check_owner()` gọi `ensure_one()` trên empty recordset và trả 500 thay vì 404.
- R2-EC8 — `low`, rejected`: va chạm UUID với partial file là cực hiếm; vòng retry thêm nhánh/phức tạp không tương xứng.
- R2-EC9 — `false`: frozen matrix chỉ yêu cầu audit cho detail/download được phép; không có claim rằng mọi lần từ chối phải được audit.
- R2-VG1 — `medium`, route `patch`: test PostgreSQL chỉ đọc page đầu; thiếu kiểm chứng hai page SQL disjoint, ordered và cùng total cho Odoo consumer.
- R2-VG2 — `medium`, route `patch`: verifier re-fetch mỗi request nhưng test chỉ revoke `enabled`; thiếu mutation role/group qua hai lần gọi để khóa regression stale entitlement.
- R2-VG3 — `high`, route `bad_spec`: CI chỉ mock/parse realm, nên token exchange hoặc Admin API config sai vẫn xanh; cần smoke stock Keycloak runtime.
- R2-VG4 — `medium`, route `patch`: download tests chưa pin detected MIME và RFC 5987 attachment disposition.
- R2-VG5 — `high`, route `patch`: CI copy integration script vào `/app/ticket-integration.mjs`, làm relative import trỏ `/dist` và fail trước assertions; phải copy vào `/app/test/`.
- R2-BH1 — `false`: policy hiện tại định nghĩa `group_lead` áp dụng cho mọi group membership hiện hành; frozen intent không có quan hệ lead riêng theo từng group.
- R2-BH2 — `false`: trùng claim R2-EC9; denied audit không được frozen matrix yêu cầu.
- R2-BH3 — `high`, route `bad_spec`: Odoo transient vẫn persist list/detail và không gọi P khi render record cũ, nên revoke không vô hiệu hóa tab/link cũ.
- R2-BH4 — `high`, route `bad_spec`: realm chưa có redirect/provider Odoo dùng được; demo không tạo được subject token qua luồng login đã provision.
- R2-BH5 — `false`: frozen Approach giao UI nội bộ cho Odoo và Code Map chỉ giao Web public polling; không yêu cầu thêm dashboard nội bộ Web trong story này.
- R2-BH6 — `high`, route `bad_spec`: P expect issuer hostname nội bộ trong khi token qua Caddy có issuer public; exact issuer check làm caller thật bị 401.
- R2-BH7 — `carried defer (medium)`: cùng vị trí và claim E1 về zero-byte multipart Story 1.5.
- R2-BH8 — `medium`, route `defer`: trùng nguyên nhân R2-EC1; JSON base64 cap là intake Story 1.5 có trước story này.
- R2-BH9 — `low`, route `patch`: auth scheme HTTP case-insensitive nhưng verifier chỉ nhận đúng `Bearer `; regex case-insensitive là sửa trực tiếp.
- R2-BH10 — `medium`, route `patch`: trùng R2-EC3; introspection non-success phải được phân loại dependency failure.
- R2-BH11 — `medium`, route `patch`: OpenAPI protected operations thiếu response 503 mà runtime phát hành.
- R2-BH12 — `medium`, route `patch`: OpenAPI chỉ mô tả octet-stream nhưng runtime trả detected image/PDF MIME.
- R2-BH13 — `carried false`: cùng vị trí và claim E9 về page/count snapshot.
- R2-BH14 — `maybe-false`, route `defer (medium, unverified)`: chưa có dữ liệu quy mô/latency để biết fetch-all offset có gây timeout; cần load test theo volume vận hành.
- R2-BH15 — `medium`, route `patch`: lỗi socket trong `response.read()` download nằm ngoài catch và thành Odoo 500.
- R2-BH16 — `low`, route `patch`: trùng R2-EC7 về stale transient ID trả 500.
- R2-BH17 — `false`: PII được lấy trong cùng process P rồi redaction trước API boundary; không có caller trái phép nhận DTO nhạy cảm.
- R3-VG1 — `medium`, route `patch`: public-status route forward getter verbatim và test không assert exact keys; cần project bốn trường tại P và khóa PII extras.
- R3-VG2 — `medium`, route `patch`: SQL status filter chưa có test real-store cho cả items và total.
- R3-VG3 — `high`, route `bad_spec`: test Odoo chỉ đọc source/XML, không execute list/detail/download controller; sai route/render/header vẫn xanh.
- R3-BH1 — `high`, route `bad_spec`: Caddy không route `/dx/*` sang Odoo nên workspace rơi vào Next.js.
- R3-BH2 — `high`, route `bad_spec`: `/auth_oauth/signin` bị matcher `/auth*` gửi sang Keycloak thay vì callback Odoo.
- R3-BH3 — `medium`, route `bad_spec`: realm/provider hardcode HTTP localhost trong khi public hostname được quảng bá configurable; issuer/redirect có thể lệch.
- R3-BH4 — `medium`, route `bad_spec`: implicit token hết hạn nhưng Odoo session không có refresh/reauth path, khiến workspace mất truy cập cho tới logout thủ công.
- R3-BH5 — `medium`, route `bad_spec`: Odoo đổi mọi 401/403/404/outage thành 502, làm stale/revoked tab bị báo sai là lỗi hạ tầng.
- R3-BH6 — `medium`, route `patch`: detail JSON không validate schema nên malformed 200 có thể render ticket trống hoặc link download hỏng.
- R3-BH7 — `carried false`: cùng claim R2-EC9/R2-BH2; frozen matrix không yêu cầu audit denied attempts.
- R3-BH8 — `carried defer (medium, unverified)`: cùng vị trí/claim R2-BH14 về offset/load; cần volume/latency load test.
- R3-BH9 — `carried false`: cùng vị trí/claim E9/R2-EC5 về page/count snapshot.
- R3-BH10 — `medium`, route `patch`: download không đối chiếu bytes với size/checksum đã lưu nên corruption/tamper không được phát hiện.
- R3-BH11 — `carried defer (medium)`: cùng vị trí/claim E7; process crash hoặc xóa metadata có thể để orphan file, cần lifecycle reconciliation riêng.
- R3-BH12 — `low`, route `patch`: protected auth/404 errors thiếu `Cache-Control: no-store`; thêm header là correction trực tiếp.
- R3-BH13 — `carried defer (medium)`: cùng vị trí/claim R2-EC1/R2-BH8 về JSON base64 cap Story 1.5.
- R3-BH14 — `medium`, route `defer`: polling interval overlap là hành vi Web polling có trước scope Story 1.6; cần sửa riêng để abort/serialize request.
- R3-BH15 — `false`: CI upgrade database có mục tiêu kiểm migrations apply tuần tự/schema; behavior integration đã chạy trên schema cùng version, không claim phải dùng chính DB upgrade.
- R3-BH16 — `high`, route `bad_spec`: login smoke chỉ nhận HTML Keycloak, không bắt callback/workspace ingress nên hai lỗi route vẫn qua CI.
- R3-EC1 — `carried defer (medium)`: cùng vị trí/claim E1 về zero-byte multipart Story 1.5.
- R3-EC2 — `medium`, route `patch`: `json.load` có thể ném OSError sau open và thoát khỏi lỗi client có cấu trúc.
- R3-EC3 — `medium`, route `patch`: ROLLBACK ném lỗi trước cleanup file, vừa orphan file vừa che lỗi DB ban đầu.
- R3-EC4 — `medium`, route `bad_spec`: Keycloak user groups chỉ lấy page mặc định; membership ở page sau bị bỏ và từ chối sai.
- R3-EC5 — `carried false`: cùng vị trí/claim E9 về count snapshot.
- R3-EC6 — `carried false`: cùng claim R2-EC9 về denied audit.
- R3-EC7 — `high`, route `bad_spec`: trùng R3-BH16; login smoke không hoàn tất callback/session/workspace.

## Design Notes

Introspection/entitlement lookup mỗi request đáp ứng thu hồi tức thời. Claim role/group và mapping loại ticket→`group_id` là cấu hình; không ánh xạ được thì deny-all. API nội bộ dùng DTO riêng; polling công khai chỉ trả trạng thái an toàn.

## Verification

**Commands:**
- `npm test --prefix services/p_process` — TypeScript build và toàn bộ unit/HTTP tests qua.
- `npm run test:integration --prefix services/p_process` — migration, SQL scope, audit và download qua với PostgreSQL.
- `npm test --prefix apps/web` — BFF/UI regressions và redaction qua.
- `npm run build --prefix apps/web` — Next.js build thành công theo tài liệu phiên bản trong repo.
- `python scripts/test-architecture.py` — contract/security boundary checks qua.
