# DX-LAB — Hệ điều hành doanh nghiệp số DX-OS

DX-LAB là dự án phần mềm nguồn mở phục vụ demo OLP 2026. Sản phẩm mô hình hóa hoạt động doanh nghiệp theo chuỗi **H → P → D → I**: con người làm việc trong môi trường số, quy trình tạo dữ liệu có kiểm soát, dữ liệu hỗ trợ điều hành và AI đưa ra đề xuất để con người quyết định.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Version: 0.1.0-alpha](https://img.shields.io/badge/Version-0.1.0--alpha-green.svg)](VERSION)

## Trạng thái hiện tại

> **Đã hoàn thành Story 1.1 (Chuyển mã sang cấu trúc kiến trúc chuẩn).**
> Toàn bộ tài sản Node-RED đã được di chuyển sang `services/p_automation`, lõi quy trình Fastify TypeScript độc lập đã được khởi tạo tại `services/p_process` theo kiến trúc lục giác, thư mục hợp đồng tập trung `contracts/` (OpenAPI 3.1 & JSON Schema Draft 2020-12) đã được kích hoạt, và script kiểm tra quy tắc kiến trúc tự động `scripts/test-architecture.py` đã sẵn sàng.
> 
> *Lưu ý*: Việc cấu hình phân vùng mạng Caddy, Keycloak OIDC và các profile tái lập (`core`, `demo`, `ai`) tiếp tục được thực hiện trong Story 1.2. Xem [hướng dẫn triển khai](docs/installation.md) để biết lộ trình chi tiết.

## Phân Định Trách Nhiệm & Chủ Quyền Dữ Liệu (AR-1, AR-4, AR-21, AR-26)

| Thành phần | Đường dẫn | Công nghệ | Vai trò & Quyền sở hữu | Ranh giới dữ liệu |
|---|---|---|---|---|
| **DX-Portal / BFF** | `apps/web/` | Next.js 16 / React 19 | Giao diện cổng thông tin, tiếp nhận ticket ẩn danh, hiển thị Dashboard D/I. | Browser trust boundary; không truy cập trực tiếp DB hay internal API. |
| **P (Process Core)** | `services/p_process/` | Fastify 5 / TypeScript 6 / Drizzle | **Chủ quyền duy nhất** đối với trạng thái ticket, phân công công bằng, SLA, CSAT và vòng đời SOP. | Sở hữu riêng PostgreSQL schema `dx_core` và các bảng nghiệp vụ; cung cấp outbox & reporting views. |
| **P (Automation)** | `services/p_automation/` | Node-RED 5 / Node.js | Lập lịch (cron) và chuyển giao tích hợp (delivery adapter). | **Không chứa bất biến nghiệp vụ**, không đọc/ghi trực tiếp DB của P. |
| **H (Human / ERP)** | `services/h_human/` | Odoo 17 CE / Python | Giao diện xử lý của nhân viên, chat nội bộ, rà soát bản nháp SOP. | Lưu projection tối thiểu; mọi thay đổi trạng thái gọi qua API của P. |
| **D (Data / BI)** | `services/d_data/` | Apache Superset 6 / PostgreSQL | Trực quan hóa chỉ số vận hành và Dashboard điều hành. | Chỉ đọc các SQL reporting views do P sở hữu thông qua scoped guest token. |
| **I (Intelligence)** | `services/i_intelligence/` | Haystack 3 / Qdrant / Ollama | Dịch vụ cố vấn (Advisory): phân loại yêu cầu, phát hiện nút thắt, gợi ý SOP. | Chỉ xử lý dữ liệu đã ẩn danh/giảm thiểu; không tự ý thay đổi ticket hay xuất bản SOP. |
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
  notification/              # Sẽ tạo: SMTP/notification adapter và Mailpit
apps/
  web/                       # Sẽ tạo: DX-Portal, form và Dashboard
infra/                       # Sẽ tạo: Compose profiles, Caddy và Keycloak
fixtures/                    # Sẽ tạo: dữ liệu demo và test xác định
scripts/
  test-architecture.py       # Kiểm thử kiến trúc tự động (khóa tag, cấm secret, hợp đồng)
docs/                        # Kiến trúc, API và triển khai
```

Kiến trúc đích có ba profile thành phần: `core`, `demo`, `ai`. Tên lệnh và overlay chính xác chỉ được công bố sau khi chúng tồn tại và được kiểm chứng. `dev`, `test` và `demo` là các môi trường tách biệt, không phải tên thay thế cho profile.

## Kiểm thử kiến trúc tự động

Để đảm bảo các quy tắc kiến trúc (khóa phiên bản dependency, cấm tag `:latest`, không lộ secret, tuân thủ cấu trúc phân tầng lục giác, hợp đồng giao tiếp chuẩn và migration kỹ thuật ban đầu), dự án cung cấp bộ kiểm thử kiến trúc tự động:

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
- [BUILD.md](BUILD.md) — tình trạng build hiện tại và cổng chất lượng cần đạt.
- [Technology Sources](_bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/TECHNOLOGY-SOURCES.md) — phiên bản seed và bằng chứng cần khóa.

## Đóng góp

Đọc [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) trước khi đóng góp. [CONTRIBUTING.md](CONTRIBUTING.md) hiện vẫn thuộc skeleton cũ; không làm theo hướng dẫn build hoặc coi Node-RED là nơi sửa quy tắc quy trình trong tài liệu đó cho đến khi Story 1.1–1.2 cập nhật. Hành trình đóng góp chính thức sẽ dùng profile `core` để không yêu cầu tải Odoo, Superset hoặc model AI.

## Giấy phép

DX-LAB được phát hành theo **GNU Affero General Public License v3.0 (AGPL-3.0)**. Xem [LICENSE](LICENSE), [NOTICE](NOTICE) và [DEPENDENCIES.md](DEPENDENCIES.md).
