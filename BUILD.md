# Build DX-LAB từ mã nguồn

## Trạng thái hỗ trợ

> **Chưa có đường build/khởi chạy đầy đủ được hỗ trợ.** Repository hiện là brownfield skeleton trước Story 1.1–1.2. Compose, Makefile, script và `.env.example` đang phản ánh kiến trúc thử nghiệm cũ, không phải cấu hình demo hoặc production đã được kiểm chứng.

Hiện tại không chạy các lệnh sau với kỳ vọng dựng được kiến trúc DX-LAB đích:

```text
cp .env.example .env
make setup
make build
make up
docker compose build
docker compose up -d
make clean
```

`make clean` còn xóa volume nên có thể làm mất dữ liệu cục bộ. `docker compose config` chỉ kiểm tra cú pháp skeleton; kết quả thành công không chứng minh kiến trúc, bảo mật hoặc hành vi nghiệp vụ đúng.

Xem [hướng dẫn triển khai](docs/installation.md) và [Architecture Spine](_bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md) trước khi thay đổi hạ tầng.

## Công việc nền bắt buộc

### Story 1.1 — Chuyển cấu trúc repository

- Lập inventory schema, dữ liệu, chủ sở hữu và phụ thuộc của skeleton.
- Di chuyển Node-RED từ `services/p_process` sang `services/p_automation`.
- Tạo lõi TypeScript/Fastify tại `services/p_process`.
- Tạo `apps/web`, `contracts/openapi`, `contracts/events` và `infra`.
- Di trú schema được giữ lại bằng migration có phiên bản và kiểm thử.
- Không tạo sớm bảng nghiệp vụ trước story sở hữu nhu cầu đó.

### Story 1.2 — Tạo môi trường có thể tái lập

- Bổ sung Caddy, Keycloak, mạng public/application/data và database/user riêng.
- Cung cấp profile `core`, `demo`, `ai` cùng overlay môi trường `dev`, `test`, `demo`.
- Sinh secret ngoài Git; loại bỏ mật khẩu mặc định, wildcard CORS và cổng đặc quyền công khai.
- Khóa dependency, image, OCA module và model bằng lockfile, digest, commit hoặc manifest.
- Cung cấp fixture idempotent, migration, health/readiness check và clean-host smoke test.

## Toolchain đích

Phiên bản seed đã xác minh nằm trong [Technology Sources](_bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/TECHNOLOGY-SOURCES.md). Trước khi chấp nhận build, repository phải khóa chính xác:

- Node.js, pnpm, TypeScript, Fastify, Drizzle và Next.js qua manifest cùng `pnpm-lock.yaml`;
- Python, Haystack và adapter I qua `pyproject.toml` cùng `uv.lock`;
- mọi image Compose bằng digest bất biến;
- OCA `auth_oidc` bằng commit SHA;
- model sinh và embedding bằng manifest có ID, digest, giấy phép và cấu hình phần cứng.

Không dùng tag `latest`, version range trôi nổi hoặc model alias chưa được ghi trong manifest phát hành.

## Profile build mục tiêu

| Profile | Thành phần | Điều kiện sử dụng |
| --- | --- | --- |
| `core` | P, PostgreSQL, test doubles | Đường phát triển và đóng góp mặc định; không tải Odoo, Superset hoặc model AI |
| `demo` | `core`, Web, Keycloak, Odoo, Node-RED, Superset, Mailpit | Demo H→P→D với các phiên đăng nhập tách biệt |
| `ai` | Dịch vụ I, Qdrant và Ollama bổ sung | Demo phân loại, phân tích và bản nháp SOP bằng model đã ghim |

Caddy phải là dịch vụ duy nhất mở cổng HTTP/HTTPS. PostgreSQL, P nội bộ, Node-RED editor, Superset admin, Keycloak admin, Qdrant, Ollama và Haystack nằm trong mạng riêng.

## Cổng chất lượng trước khi công bố Quick Start

Chỉ thêm lệnh build có thể sao chép vào tài liệu sau khi CI và clean-host smoke test chứng minh:

1. `core`, `demo` và `ai` dựng được từ source với lockfile/digest đã commit.
2. Migration và health/readiness check hoàn tất; create/side effect dùng `Idempotency-Key`, cập nhật aggregate dùng version precondition và transaction P ghi trạng thái cùng outbox atomically.
3. Kiểm thử domain, PostgreSQL integration/migration, OpenAPI/event contract và hành trình UJ-1/UJ-2 đạt.
4. Odoo và Node-RED chỉ gọi P hoặc xử lý sự kiện đã commit, không ghi trực tiếp bảng P.
5. Consumer khử trùng bằng `event_id`, giữ thứ tự `aggregate_version`, xử lý delivery trùng/đảo thứ tự và chuyển lỗi hết lượt retry sang dead-letter; email, notification, AI work và side effect tích hợp không bị phát lặp theo nghĩa nghiệp vụ.
6. Đăng nhập, phân quyền nhóm và Superset RLS từ chối mặc định khi thiếu scope.
7. Profile AI index, retrieve và generate được một lần bằng model manifest đã ghim; kiểm thử mặc định vẫn chạy không cần model.
8. Không còn mật khẩu mặc định, cổng đặc quyền công khai, wildcard CORS, tag trôi nổi hoặc secret trong Git.
9. CPU, RAM, dung lượng tối thiểu, chế độ không AI và thời gian khởi động đã được đo, ghi lại.
10. Bản phát hành được dựng lại trên máy sạch và cung cấp checksum, SBOM, changelog, hướng dẫn cài đặt cùng giấy phép phụ thuộc/model.

## Lệnh sẽ được bổ sung sau

Khi các cổng trên đạt, tài liệu phải cung cấp và kiểm chứng tối thiểu:

- lệnh chuẩn bị secret và fixture cho từng môi trường;
- lệnh build/up/down/status/logs cho từng profile;
- lệnh migration, health/readiness và test;
- lệnh tải model theo manifest cho profile `ai`;
- lệnh sao lưu, phục hồi thử và dọn môi trường kiểm tra an toàn.

Không công bố tên overlay hoặc câu lệnh giả định trước khi file và CI tương ứng tồn tại.
