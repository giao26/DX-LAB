---
title: 'Story 1.2: Người mới dựng các profile tái lập mà không cần tải AI'
type: 'feature'
created: '2026-09-19'
status: 'done'
baseline_commit: '01331b4183e405c68399bd5c10a56639a83546c5'
route: 'dispatch'
review_loop_iteration: 0
context:
  - _bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/TECHNOLOGY-SOURCES.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hiện tại `docker-compose.yml` mở toàn bộ các cổng dịch vụ nội bộ ra host, chưa có dịch vụ `p-process`, không phân chia `profiles` (`core`, `demo`, `ai`), thiếu cơ chế nạp fixture mẫu cho môi trường `core`, thiếu reverse proxy Caddy duy nhất theo AD-11, và người đóng góp mới bắt buộc phải khởi động toàn bộ dịch vụ nặng (kể cả AI) dù chỉ muốn phát triển hoặc kiểm thử logic cốt lõi.

**Approach:** Cấu hình Docker Compose với 3 profiles rõ ràng (`core`, `demo`, `ai`); thiết lập mạng nội bộ cô lập và Caddy làm cổng ingress công khai duy nhất cho profile `demo`; khai báo dịch vụ `p-process` trong Compose; xây dựng script nạp fixture idempotent `scripts/load-fixtures.py` cho `core`; cung cấp script kiểm tra sức khỏe và tài nguyên `scripts/check-health.py`; đồng thời cập nhật `.env.example`, `BUILD.md` và `README.md`.

## Boundaries & Constraints

**Always:**
- Profile `core` chỉ chạy `p-process`, `postgres` và test doubles/Mailpit; tuyệt đối không khởi động Odoo, Superset, Node-RED hay các mô hình AI (AR-14).
- Caddy là dịch vụ duy nhất mở cổng host công khai trong profile `demo` (cổng 80, 443); PostgreSQL, P nội bộ, Node-RED editor, Superset admin, Keycloak admin phải giữ trong mạng nội bộ (AD-11).
- Mọi container image và dependencies phải khóa phiên bản cố định theo Technology Sources (PostgreSQL 16-alpine, Caddy 2.11.4, Keycloak 26.7.4, Mailpit 1.31.1, Ollama 0.34.2, Qdrant 1.19.1); cấm dùng tag `latest` (AR-25).
- Lệnh nạp fixture phải idempotent: chạy lại không làm nhân đôi dữ liệu, giữ nguyên ID ổn định (Story 1.2 AC 3).
- Tách biệt môi trường `dev`, `test`, `demo` qua biến môi trường độc lập, không sửa mã nguồn (AR-24).

**Never:**
- Không tải hoặc yêu cầu tải mô hình AI trong profile `core` (Story 1.2 AC 2).
- Không sử dụng mật khẩu mặc định rò rỉ trong kho mã hoặc wildcard CORS (NFR-14, AD-11).
- Không tạo trước dữ liệu fixture của các tính năng chưa triển khai (chỉ nạp metadata/hạ tầng đã có ở Story 1.1).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Khởi chạy profile core | `docker compose --profile core up` | Chỉ có `p-process` và `postgres` khởi động thành công, endpoint `/health` của P sẵn sàng | Báo lỗi nếu thiếu biến môi trường hoặc cổng bị xung đột |
| Khởi chạy nạp fixture core | `python scripts/load-fixtures.py --profile core` | Nạp dữ liệu kỹ thuật mẫu có nhãn demo thành công | Ghi nhận lỗi kết nối DB nếu Postgres chưa sẵn sàng |
| Nạp lại fixture lần thứ hai | Chạy lại `python scripts/load-fixtures.py --profile core` | Dữ liệu không bị nhân đôi, ID giữ nguyên (idempotent) | Bỏ qua các bản ghi đã tồn tại (ON CONFLICT DO NOTHING) |
| Kiểm tra sức khỏe profile | `python scripts/check-health.py --profile core` | Báo cáo trạng thái các container và readiness của P/Postgres | Liệt kê chi tiết dịch vụ chưa sẵn sàng mà không để lộ secret |
| Kiểm tra tài nguyên tối thiểu | Máy không đủ RAM/CPU chạy demo/ai | Script kiểm tra đưa ra cảnh báo về cấu hình phần cứng còn thiếu | Nêu rõ số CPU, RAM còn thiếu theo chuẩn tài liệu hóa |

</frozen-after-approval>

## Code Map

- `docker-compose.yml` -- Định nghĩa 3 profiles (`core`, `demo`, `ai`), khai báo dịch vụ `p-process`, `caddy`, `keycloak`, phân tách mạng `public-net`, `app-net`, `data-net` theo AD-11.
- `infra/caddy/Caddyfile` -- Cấu hình định tuyến duy nhất từ Caddy tới Web, Odoo, Keycloak và Superset runtime nhúng (`/analytics/*`).
- `.env.example` -- Bổ sung các biến cấu hình cho P, Keycloak, Caddy, Mailpit và profiles.
- `fixtures/core/initial_demo_metadata.sql` -- Dữ liệu kỹ thuật demo mẫu ban đầu có nhãn rõ ràng.
- `scripts/load-fixtures.py` -- Script nạp fixture idempotent theo profile được chọn.
- `scripts/check-health.py` -- Script kiểm tra readiness của các dependency bắt buộc theo profile và kiểm tra tài nguyên phần cứng tối thiểu.
- `scripts/test-architecture.py` -- Bổ sung kiểm tra cấu hình profiles trong compose và xác nhận không lộ cổng nội bộ ra host.
- `BUILD.md` & `README.md` -- Cập nhật hướng dẫn khởi chạy theo từng profile (`core`, `demo`, `ai`), yêu cầu phần cứng tối thiểu và cách nạp fixture.

## Tasks & Acceptance

**Execution:**
- [x] `docker-compose.yml` -- Thêm dịch vụ `p-process`, cấu hình `profiles: [core, demo]`, `profiles: [demo]`, `profiles: [ai]`, phân bổ mạng `public-net`, `app-net`, `data-net` và bỏ port binding public của các dịch vụ nội bộ (AD-11).
- [x] `infra/caddy/Caddyfile` -- Tạo tệp cấu hình Caddy làm điểm vào công khai duy nhất cho Web, Odoo, Keycloak và `/analytics/*`.
- [x] `.env.example` -- Bổ sung đầy đủ biến môi trường cho P, Caddy, Keycloak và hướng dẫn tạo tệp `.env`.
- [x] `fixtures/core` & `scripts/load-fixtures.py` -- Xây dựng tệp fixture kỹ thuật mẫu và script nạp fixture idempotent cho profile `core`.
- [x] `scripts/check-health.py` -- Xây dựng script kiểm tra sức khỏe, readiness và kiểm tra tài nguyên phần cứng tối thiểu theo tài liệu.
- [x] `scripts/test-architecture.py` -- Cập nhật bộ test kiến trúc để kiểm tra hợp lệ các profiles Compose và đảm bảo chỉ Caddy mở cổng public.
- [x] `BUILD.md` & `README.md` -- Tài liệu hóa hướng dẫn khởi động `core` độc lập không cần AI, bảng thông số tài nguyên tối thiểu và quy trình onboarding.

**Acceptance Criteria:**
- Given máy sạch có Docker, when làm theo README tạo `.env` từ `.env.example`, then secret được lưu trong tệp ignored và không cần sửa mã nguồn.
- Given lệnh chạy profile `core`, when Compose khởi động, then chỉ có P và PostgreSQL chạy; không khởi động Odoo, Superset, Node-RED hay Ollama.
- Given lệnh `python scripts/load-fixtures.py --profile core`, when chạy nhiều lần, then dữ liệu không bị nhân đôi và giữ nguyên ID ổn định có nhãn demo.
- Given profile `demo`, when Compose khởi động, then Caddy là dịch vụ duy nhất mở cổng host công khai, các dịch vụ dữ liệu/quản trị nằm trong mạng riêng.
- Given script `scripts/check-health.py`, when chạy, then báo cáo rõ ràng trạng thái readiness và cảnh báo nếu tài nguyên phần cứng không đạt mức tối thiểu đã tài liệu hóa.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence / Resolution | Route |
|---|---|---|---|
| `scripts/check-health.py`: exit condition masked stopped containers | high | Updated `sys.exit` to require `res_code == 0 and svc_code == 0` and check internal P readiness | patch |
| `infra/caddy/Caddyfile`: missing routes for P (`/api/*`, `/health`) and Odoo websocket | high | Added Caddy routes proxying `/api/*` & `/health` to `p-process:3000` and `/websocket*` to `odoo:8069` | patch |
| `scripts/load-fixtures.py`: crash on empty demo/ai fixtures and path concatenation bug | medium | Created placeholder fixtures for demo/ai and fixed `--fixtures-dir` argument handling | patch |
| `docker-compose.yml`: mailpit only in demo profile | medium | Added `core` to mailpit profiles (`profiles: [core, demo]`) for email outbox test double | patch |
| `services/d_data/postgres/init/01_init_schema.sql`: missing Keycloak DB creation | medium | Added idempotent `CREATE DATABASE dxlab_keycloak` to postgres init script | patch |
| `scripts/test-architecture.py`: inline list syntax in compose & unexecuted scripts | medium | Supported inline list parsing and executed load-fixtures / check-health via subprocess in tests | patch |
| `.github/workflows/ci.yml` & `Makefile`: compose config only tested default profile | medium | Updated CI and Makefile to validate all profiles and run `test-architecture.py` | patch |

## Design Notes

- Phân tầng mạng Docker: `public-net` (chỉ Caddy và Web BFF), `app-net` (P, Node-RED, Keycloak, Odoo, Superset), `data-net` (PostgreSQL, Qdrant, Ollama).
- Profile `core` tối ưu hóa thời gian khởi động (< 5 giây) và tiêu tốn tài nguyên tối thiểu, thích hợp cho kiểm thử tự động trên máy phát triển cá nhân.

## Verification

**Commands:**
- `python scripts/test-architecture.py` -- expected: PASS tất cả các kiểm tra kiến trúc (profiles, ingress, security).
- `python scripts/check-health.py --check-resources` -- expected: Trả về trạng thái kiểm tra tài nguyên phần cứng thành công.
- `python scripts/load-fixtures.py --dry-run` -- expected: Nạp fixture hợp lệ không phát sinh lỗi.

**Manual checks (if no CLI):**
- Kiểm tra `docker compose config` hợp lệ cho cả 3 profiles: `core`, `demo`, `ai`.