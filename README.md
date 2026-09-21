# DX-LAB — Hệ điều hành doanh nghiệp số DX-OS

DX-LAB là dự án phần mềm nguồn mở phục vụ demo OLP 2026. Sản phẩm mô hình hóa hoạt động doanh nghiệp theo chuỗi **H → P → D → I**: con người làm việc trong môi trường số, quy trình tạo dữ liệu có kiểm soát, dữ liệu hỗ trợ điều hành và AI đưa ra đề xuất để con người quyết định.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Version: 0.1.0-alpha](https://img.shields.io/badge/Version-0.1.0--alpha-green.svg)](VERSION)

## Trạng thái hiện tại

> **Đã hoàn thành Story 1.1 và Story 1.2 (Dựng các profile tái lập không cần tải AI).**
> Toàn bộ tài sản Node-RED đã được di chuyển sang `services/p_automation`, lõi quy trình Fastify TypeScript độc lập đã được khởi tạo tại `services/p_process` theo kiến trúc lục giác, thư mục hợp đồng tập trung `contracts/` (OpenAPI 3.1 & JSON Schema Draft 2020-12) đã được kích hoạt, tệp cấu hình ingress duy nhất `infra/caddy/Caddyfile` (AD-11) bảo vệ mạng nội bộ, tệp môi trường mẫu `.env.example`, fixture kỹ thuật mẫu idempotent `fixtures/core/initial_demo_metadata.sql`, script nạp fixture `scripts/load-fixtures.py`, script kiểm tra sức khỏe/tài nguyên `scripts/check-health.py`, và bộ kiểm thử kiến trúc tự động `scripts/test-architecture.py` đã hoàn thiện.

## Phân Định Trách Nhiệm & Chủ Quyền Dữ Liệu (AR-1, AR-4, AR-21, AR-26)

| Thành phần | Đường dẫn | Công nghệ | Vai trò & Quyền sở hữu | Ranh giới dữ liệu |
|---|---|---|---|---|
| **DX-Portal / BFF** | `apps/web/` | Next.js 16 / React 19 | Giao diện cổng thông tin, tiếp nhận ticket ẩn danh, hiển thị Dashboard D/I. | Browser trust boundary; không truy cập trực tiếp DB hay internal API. |
| **P (Process Core)** | `services/p_process/` | Fastify 5 / TypeScript 6 / Drizzle | **Chủ quyền duy nhất** đối với trạng thái ticket, phân công công bằng, SLA, CSAT và vòng đời SOP. | Sở hữu riêng PostgreSQL schema `dx_core` và các bảng nghiệp vụ; cung cấp outbox & reporting views. |
| **P (Automation)** | `services/p_automation/` | Node-RED 5 / Node.js | Lập lịch (cron) và chuyển giao tích hợp (delivery adapter). | **Không chứa bất biến nghiệp vụ**, không đọc/ghi trực tiếp DB của P. |
| **H (Human / ERP)** | `services/h_human/` | Odoo 17 CE / Python | Giao diện xử lý của nhân viên, chat nội bộ, rà soát bản nháp SOP. | Lưu projection tối thiểu; mọi thay đổi trạng thái gọi qua API của P. |
| **D (Data / BI)** | `services/d_data/` | Apache Superset 6 / PostgreSQL | Trực quan hóa chỉ số vận hành và Dashboard điều hành. | Chỉ đọc các SQL reporting views do P sở hữu thông qua scoped guest token. |
| **I (Intelligence)** | `services/i_intelligence/` | Haystack 3 / Qdrant / OpenRouter | Dịch vụ cố vấn (Advisory): phân loại yêu cầu, phát hiện nút thắt, gợi ý SOP. | Chỉ xử lý dữ liệu đã ẩn danh/giảm thiểu; không tự ý thay đổi ticket hay xuất bản SOP. |
| **Caddy Ingress** | `infra/caddy/` | Caddy 2.11 | Cổng vào công khai duy nhất cho Web, Odoo, Keycloak và `/analytics/*`. | AD-11: Cổng host duy nhất (80, 443); bảo vệ các dịch vụ nội bộ. |
| **Contracts** | `contracts/` | OpenAPI 3.1 / JSON Schema 2020-12 | Nguồn hợp đồng giao tiếp chuẩn duy nhất giữa các dịch vụ. | Bắt buộc cho toàn bộ REST API (`openapi/`) và sự kiện outbox (`events/`). |

## Cấu trúc thư mục

```text
contracts/
  openapi/                   # Hợp đồng REST API chuẩn (OpenAPI 3.1)
  events/                    # Hợp đồng sự kiện tích hợp (JSON Schema Draft 2020-12)
  reporting/                 # Sẽ tạo: dataset, scope key và RLS mapping
  exports/                   # Sẽ tạo: schema định dạng mở và từ điển dữ liệu
services/
  p_process/                 # Lõi quy trình Fastify TypeScript (Hexagonal Architecture)
    src/domain/              # Domain models, invariants và types thuần túy
    src/application/         # Use cases và application ports
    src/adapters/http/       # Inbound HTTP adapter (Fastify routes, /health)
    src/adapters/postgres/   # Outbound PostgreSQL adapter, Drizzle ORM, migrations
  p_automation/              # Node-RED flows: chỉ lập lịch và chuyển giao tích hợp
  h_human/                   # Odoo 17, custom addons và adapter P
  d_data/                    # Superset, dataset và PostgreSQL init
  i_intelligence/            # FastAPI, Haystack RAG, Qdrant vector store
infra/
  caddy/                     # Caddyfile: ingress duy nhất (AD-11)
fixtures/
  core/                      # initial_demo_metadata.sql: Dữ liệu kỹ thuật mẫu idempotent
scripts/
  load-fixtures.py           # Nạp fixture idempotent theo profile
  check-health.py            # Kiểm tra sức khỏe, readiness và tài nguyên phần cứng
  test-architecture.py       # Kiểm thử kiến trúc tự động (profiles, ingress, bảo mật)
docs/                        # Kiến trúc, API và triển khai
.env.example                 # Mẫu biến môi trường cho các profile (dev, test, demo)
```

## Bảng thông số tài nguyên tối thiểu theo Profile

| Profile | Thành phần | CPU tối thiểu | RAM tối thiểu | Ổ đĩa khả dụng | Mục đích sử dụng |
| --- | --- | --- | --- | --- | --- |
| **`core`** | `p-process`, `postgres` | 2 cores | 2 GB | 10 GB | Phát triển cốt lõi, kiểm thử nhanh; **không tải AI** |
| **`demo`** | `core` + `caddy`, `keycloak`, `odoo`, `node-red`, `superset`, `mailpit` | 4 cores | 8 GB | 20 GB | Trình diễn luồng H→P→D qua Caddy ingress |
| **`ai`** | `core` + `qdrant`, `haystack-rag`; OpenRouter bên ngoài | 4 cores | 4 GB | 15 GB | Pipeline RAG dùng suy luận hosted qua HTTPS |

Trước khi chạy `ai`, đặt `OPENROUTER_API_KEY` trong `.env` đã bị Git ignore. Model sinh được cố định trong backend là `qwen/qwen3-8b`; không đưa khóa vào browser hoặc source. Dùng `AI_PROVIDER=fixture` để phát triển và chạy test hoàn toàn offline.

## Hướng dẫn Quick Start (Profile `core` không cần AI)

Dành cho người mới tham gia đóng góp và phát triển mã nguồn:

```bash
# 1. Tạo cấu hình môi trường từ mẫu (.env được Git ignore)
cp .env.example .env

# 2. Đánh giá tài nguyên máy tính
python scripts/check-health.py --check-resources

# 3. Khởi chạy profile core
docker compose --profile core up -d

# 4. Kiểm tra sức khỏe và readiness
python scripts/check-health.py --profile core

# 5. Nạp dữ liệu fixture mẫu (idempotent, an toàn khi chạy lại)
python scripts/load-fixtures.py --profile core

# 6. Chạy toàn bộ kiểm thử kiến trúc tự động
python scripts/test-architecture.py
```

## Kiểm thử kiến trúc tự động

Để đảm bảo các quy tắc kiến trúc (khóa phiên bản dependency, cấm tag `:latest`, không lộ secret, tuân thủ cấu trúc phân tầng lục giác, hợp đồng giao tiếp chuẩn, phân vùng mạng Caddy AD-11 và phân tách 3 profiles), dự án cung cấp bộ kiểm thử kiến trúc tự động:

```bash
# Chạy kiểm thử kiến trúc toàn diện
python scripts/test-architecture.py

# Kiểm tra tính hợp lệ của manifest dịch vụ lõi P
node -e "require('./services/p_process/package.json')"
```

## Tài liệu

- [Architecture Spine](_bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md) — nguồn quyết định kiến trúc ưu tiên.
- [Kiến trúc H–P–D–I](docs/architecture/hpdi_architecture.md) — bản giải thích tiếng Việt.
- [Quy ước API](docs/api/hpdi_api_spec.md) — ranh giới command, sự kiện và tích hợp.
- [Hướng dẫn triển khai](docs/installation.md) — trạng thái skeleton và điều kiện phát hành lệnh cài đặt.
- [BUILD.md](BUILD.md) — hướng dẫn build, thông số tài nguyên tối thiểu và quy trình onboarding.
- [Technology Sources](_bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/TECHNOLOGY-SOURCES.md) — phiên bản seed và bằng chứng cần khóa.

## Đóng góp

Đọc [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) trước khi đóng góp. [CONTRIBUTING.md](CONTRIBUTING.md) hiện vẫn thuộc skeleton cũ; không làm theo hướng dẫn build hoặc coi Node-RED là nơi sửa quy tắc quy trình trong tài liệu đó cho đến khi Story 1.1–1.2 cập nhật. Hành trình đóng góp chính thức sẽ dùng profile `core` để không yêu cầu tải Odoo, Superset hoặc model AI.

## Giấy phép

DX-LAB được phát hành theo **GNU Affero General Public License v3.0 (AGPL-3.0)**. Xem [LICENSE](LICENSE), [NOTICE](NOTICE) và [DEPENDENCIES.md](DEPENDENCIES.md).
