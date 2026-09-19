---
title: 'Story 1.1: Người duy trì chuyển mã hiện có sang cấu trúc kiến trúc chuẩn'
type: 'refactor'
created: '2026-09-19'
status: 'done'
baseline_commit: '25a1b41f44a1bed60a9faadc952f580240863d9c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - _bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/TECHNOLOGY-SOURCES.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Repository ban đầu (brownfield) đang đặt tài sản Node-RED trực tiếp trong `services/p_process`, chưa có dịch vụ Fastify P độc lập để sở hữu trạng thái nghiệp vụ, thiếu thư mục hợp đồng tập trung `contracts/`, và chưa có kiểm thử kiến trúc để đảm bảo quy tắc khóa phiên bản cùng ranh giới truy cập dữ liệu.

**Approach:** Di chuyển Node-RED sang `services/p_automation`, khởi tạo khung dịch vụ lõi Fastify TypeScript tại `services/p_process` theo kiến trúc lục giác, tạo thư mục `contracts/` với hợp đồng chuẩn OpenAPI và JSON Schema, thiết lập migration kỹ thuật ban đầu cho PostgreSQL (metadata/outbox/audit), và bổ sung script kiểm thử kiến trúc tự động.

## Boundaries & Constraints

**Always:**
- Chỉ có module domain/application TypeScript trong lõi Fastify P (`services/p_process`) được ghi trạng thái ticket, phân công, SLA, CSAT và vòng đời SOP (AR-1, AR-2).
- Tài sản Node-RED được chuyển hoàn toàn sang `services/p_automation`, chỉ đóng vai trò lập lịch và chuyển giao tích hợp, không chứa bất biến nghiệp vụ (AR-26).
- Mọi giao diện liên dịch vụ giữa Web, P, Odoo, Node-RED và AI phải tuân thủ hợp đồng giao tiếp chuẩn trong `contracts/` (AR-21).
- Mọi dependency và container image phải khóa phiên bản cố định theo Technology Sources; tuyệt đối cấm sử dụng tag `latest` hoặc phiên bản thả nổi (NFR-4, AR-25).
- Story 1.1 chỉ tạo migration khởi tạo cùng metadata kỹ thuật (audit log, outbox events, idempotency keys); các bảng nghiệp vụ ticket, phân công, CSAT và SOP chỉ được tạo ở Story thực sự cần chúng (Story 1.1 AC 2).

**Never:**
- Không commit mật khẩu thật, khóa bí mật hoặc token vào kho mã; mọi cấu hình nhạy cảm phải đọc từ biến môi trường qua `.env.example` (NFR-14).
- Không cho phép Odoo, Node-RED, Superset hoặc AI đọc/ghi trực tiếp vào cơ sở dữ liệu riêng của P (AR-4, AR-21).
- Không tạo trước schema nghiệp vụ ticket, phân công hoặc CSAT trong migration nền tảng này (AC 2).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Chạy kiểm tra kiến trúc | Chạy script kiểm thử kiến trúc toàn repo | Báo cáo kiểm tra thành công, toàn bộ dependency đã khóa, không có tag `latest`, không có secret | Trả về mã lỗi khác 0 và liệt kê file/dòng vi phạm |
| Phát hiện dependency `latest` hoặc secret | Tệp cấu hình chứa chuỗi `:latest` hoặc secret bị lộ | Script kiểm thử kiến trúc phát hiện, chặn commit/build | Thông báo lỗi chi tiết vị trí và yêu cầu sửa phiên bản |
| Khởi động Fastify lõi P | Khởi chạy server P ở môi trường cục bộ | Server lắng nghe cổng cấu hình, endpoint `/health` trả về mã 200 và trạng thái sẵn sàng | Báo lỗi thiếu cấu hình hoặc cổng bị xung đột |
| Kiểm tra hợp đồng contracts/ | Cú pháp OpenAPI và JSON Schema trong `contracts/` | Các tệp hợp đồng hợp lệ theo chuẩn OpenAPI 3.1 và JSON Schema Draft 2020-12 | Báo lỗi định dạng schema cụ thể |

</frozen-after-approval>

## Code Map

- `services/p_process/` -- Di chuyển toàn bộ tài sản Node-RED cũ sang `services/p_automation/`; tái sử dụng thư mục này để tạo lõi Fastify TypeScript mới.
- `services/p_automation/` -- Thư mục mới tiếp nhận toàn bộ Node-RED flows (`data/flows.json`), settings, package.json và Dockerfile.
- `services/p_process/package.json` -- Khai báo dự án Node.js với Fastify 5.12.5, TypeScript 6.0.3, Drizzle ORM 0.45.2, `pg` 8.23.0 và script build/lint/test.
- `services/p_process/tsconfig.json` -- Cấu hình biên dịch TypeScript nghiêm ngặt (strict mode, target ES2022).
- `services/p_process/src/index.ts` -- Điểm khởi chạy Fastify server, cấu hình plugin, logging JSON có cấu trúc và healthcheck endpoint.
- `services/p_process/src/adapters/postgres/migrations/` -- Chứa migration kỹ thuật ban đầu cho PostgreSQL (dx_core: audit_logs, outbox_events, idempotency_keys).
- `contracts/openapi/p-api.yaml` -- Hợp đồng giao tiếp RESTful API chuẩn của P cho các tác vụ tiếp nhận và tra cứu.
- `contracts/events/` -- JSON Schema cho các sự kiện outbox phát sinh từ P sang các hệ thống khác.
- `docker-compose.yml` -- Cập nhật đường dẫn build của `node-red` sang `./services/p_automation` và khóa phiên bản hình ảnh (thay thế `ollama:latest` bằng phiên bản cố định `ollama/ollama:0.34.2`).
- `scripts/test-architecture.py` -- Script kiểm tra kiến trúc tự động: quét tag `latest`, phát hiện secret cứng, kiểm tra ranh giới thư mục và hợp đồng.
- `README.md` -- Cập nhật sơ đồ kiến trúc, danh mục dịch vụ, chủ quyền dữ liệu và hướng dẫn điều hướng cho người mới.

## Tasks & Acceptance

**Execution:**
- [x] `services/p_automation` -- Di chuyển toàn bộ tài sản Node-RED từ `services/p_process` sang `services/p_automation` và kiểm tra tính toàn vẹn của Dockerfile cùng flows.
- [x] `services/p_process` -- Khởi tạo dự án Fastify TypeScript mới với cấu trúc lục giác (`src/domain`, `src/application`, `src/adapters/http`, `src/adapters/postgres`), tệp `package.json`, `tsconfig.json` và endpoint `/health`.
- [x] `contracts` -- Tạo thư mục `contracts/openapi` và `contracts/events` chứa OpenAPI spec khung và các JSON Schema sự kiện mẫu ban đầu.
- [x] `services/p_process/src/adapters/postgres/migrations` -- Viết tệp migration kỹ thuật ban đầu tạo schema `dx_core` cùng các bảng nền tảng: `audit_logs`, `outbox_events`, `idempotency_keys`.
- [x] `docker-compose.yml` -- Sửa build context của `node-red` thành `./services/p_automation` và khóa thẻ hình ảnh `ollama` thành `ollama/ollama:0.34.2`.
- [x] `scripts/test-architecture.py` -- Tạo script kiểm thử kiến trúc tự động hóa để kiểm tra quy tắc cấm `latest`, cấm secret cứng và kiểm tra cấu trúc thư mục chuẩn.
- [x] `README.md` -- Cập nhật tài liệu kiến trúc, bản đồ năng lực H-P-D-I và chỉ dẫn điều hướng cho người đóng góp mới.

**Acceptance Criteria:**
- Given repository hiện có, when hoàn tất chuyển đổi cấu trúc, then tài sản Node-RED nằm tại `services/p_automation` và lõi Fastify P mới nằm tại `services/p_process`.
- Given cơ sở dữ liệu PostgreSQL, when áp dụng migration kỹ thuật ban đầu, then chỉ có schema `dx_core` cùng các bảng hạ tầng kỹ thuật (`audit_logs`, `outbox_events`, `idempotency_keys`), không có bảng ticket hay CSAT.
- Given thư mục `contracts/`, when kiểm tra, then chứa OpenAPI spec và JSON Schema làm nguồn giao diện chuẩn duy nhất.
- Given script `scripts/test-architecture.py`, when chạy trên toàn bộ repository, then kiểm thử vượt qua (exit code 0), xác nhận không có tag `latest` và không có secret cứng.
- Given tài liệu `README.md`, when người đóng góp đọc, then xác định rõ vai trò sở hữu của từng thành phần Web, P, Odoo, Node-RED, Superset, AI và hợp đồng tích hợp.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence / Resolution | Route |
|---|---|---|---|
| `services/p_process/package.json`: npm test runs without building dist/ | high | pretest script added ("pretest": "tsc") ensuring clean build before testing | patch |
| `domain/types.ts`: EventEnvelope used camelCase instead of snake_case | high | Aligned properties to snake_case to strictly conform to event-envelope.schema.json | patch |
| `services/p_process/src/adapters/http/app.ts`: 404 bypasses RFC 9457 problem details | medium | Added setNotFoundHandler returning application/problem+json and test case | patch |
| `services/p_process/Dockerfile`: Unpinned node:24-alpine and missing package-lock.json | medium | Pinned to node:24.21.0-alpine and added package-lock.json copy + npm ci | patch |
| `contracts/`: missing customerPhone and description for FR-4/FR-5 | medium | Added customerPhone and description to OpenAPI and ticket-created schema | patch |
| `scripts/test-architecture.py`: missed 01_init_schema.sql check and loose contract regex | medium | Enhanced test-architecture.py with YAML/JSON validation, init schema check, and p_automation lock | patch |
| `.gitignore`: obsolete services/p_process/data/node_modules path | low | Updated path to services/p_automation/data/node_modules/ | patch |
| `docker-compose.yml`: p_process container definition missing | medium | Defined in Story 1.2 scope (Compose core profile); logged to deferred-work.md | defer |

## Design Notes

- Kiến trúc lục giác (Hexagonal Architecture) phân tách rõ `domain` (chứa quy tắc nghiệp vụ thuần túy), `application` (điều phối use case) và `adapters` (kết nối HTTP, database PostgreSQL, storage).
- Các sự kiện tích hợp tuân theo Transactional Outbox pattern để đảm bảo tính nhất quán phân tán và khả năng phát lại an toàn (AR-3).

## Verification

**Commands:**
- `python scripts/test-architecture.py` -- expected: Toàn bộ kiểm thử kiến trúc đạt kết quả PASS (exit code 0).
- `node -e "require('./services/p_process/package.json')"` -- expected: `package.json` của P hợp lệ, không có lỗi cú pháp.

**Manual checks (if no CLI):**
- Kiểm tra các tệp luồng của Node-RED trong `services/p_automation/data` được bảo toàn nguyên vẹn.
- Xác nhận không có dependency nào dùng tag `latest` trong `docker-compose.yml`.