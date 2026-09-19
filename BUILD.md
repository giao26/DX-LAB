# Build và Khởi chạy DX-LAB từ mã nguồn

## Trạng thái hỗ trợ

> **Đã hoàn thành Story 1.1 và Story 1.2.**
> Hệ thống hiện đã hỗ trợ đầy đủ 3 profiles Compose độc lập: `core`, `demo`, và `ai`.
> Cổng ingress duy nhất Caddy (AD-11) bảo vệ toàn bộ mạng nội bộ, dịch vụ lõi `p-process` (Fastify TypeScript) và `postgres` được cô lập trong `data-net`/`app-net`, script nạp fixture idempotent `scripts/load-fixtures.py` và script kiểm tra tài nguyên/readiness `scripts/check-health.py` đã sẵn sàng.

## Quy trình Onboarding cho người đóng góp mới (Profile `core`)

Profile `core` được thiết kế tối ưu cho người mới đóng góp: chỉ khởi động `p-process` và `postgres`, khởi động dưới 5 giây, tiêu tốn ít tài nguyên và **hoàn toàn không yêu cầu tải bất kỳ mô hình AI nào** (AR-14, FR-13).

### Bước 1: Chuẩn bị cấu hình môi trường
Sao chép tệp mẫu môi trường sang `.env` (tệp `.env` đã được cấu hình trong `.gitignore`, đảm bảo secret không bị rò rỉ vào Git - AR-24, NFR-14):

```bash
cp .env.example .env
```

### Bước 2: Đánh giá tài nguyên phần cứng
Chạy script kiểm tra phần cứng để đảm bảo máy đáp ứng yêu cầu tối thiểu của profile dự định chạy:

```bash
# Kiểm tra tài nguyên cho profile core (mặc định)
python scripts/check-health.py --check-resources

# Kiểm tra tài nguyên cho profile demo hoặc ai
python scripts/check-health.py --profile demo --check-resources
python scripts/check-health.py --profile ai --check-resources
```

### Bước 3: Khởi chạy profile mong muốn bằng Docker Compose

```bash
# Khởi chạy profile core (chỉ P và PostgreSQL)
docker compose --profile core up -d

# Khởi chạy profile demo (thêm Caddy, Keycloak, Odoo, Node-RED, Superset, Mailpit)
docker compose --profile demo up -d

# Khởi chạy profile ai (thêm Qdrant, Ollama, Haystack RAG)
docker compose --profile ai up -d
```

### Bước 4: Kiểm tra trạng thái sức khỏe & readiness

```bash
python scripts/check-health.py --profile core
```

Endpoint kiểm tra sức khỏe của dịch vụ lõi P: `http://localhost:3000/health`.

### Bước 5: Nạp dữ liệu kỹ thuật mẫu (Fixture)

```bash
# Chạy thử nghiệm kiểm tra tính hợp lệ và cấu trúc idempotent
python scripts/load-fixtures.py --dry-run

# Nạp dữ liệu fixture cho profile core (an toàn khi chạy lại nhiều lần)
python scripts/load-fixtures.py --profile core
```

### Bước 6: Chạy kiểm thử kiến trúc tự động

```bash
python scripts/test-architecture.py
```

## Bảng thông số tài nguyên tối thiểu theo Profile

| Profile | Thành phần | CPU tối thiểu | RAM tối thiểu | Ổ đĩa khả dụng | Mục đích sử dụng |
| --- | --- | --- | --- | --- | --- |
| **`core`** | `p-process`, `postgres` | 2 cores | 2 GB | 10 GB | Phát triển nghiệp vụ cốt lõi, kiểm thử unit/contract; **không tải AI hay ERP** |
| **`demo`** | `core` + `caddy`, `keycloak`, `odoo`, `node-red`, `superset`, `mailpit` | 4 cores | 8 GB | 20 GB | Trình diễn toàn diện luồng H→P→D qua Caddy ingress |
| **`ai`** | `core` + `qdrant`, `ollama`, `haystack-rag` | 8 cores | 16 GB | 40 GB | Khởi động mô hình ngôn ngữ cục bộ và pipeline RAG |

> [!TIP]
> Nếu máy tính cá nhân không đủ 16 GB RAM cho profile `ai`, hãy sử dụng profile `core` để phát triển và kiểm thử hành vi nghiệp vụ. Mọi logic cốt lõi đều được kiểm thử đầy đủ qua fixture mà không cần mô hình AI.

## Cấu trúc mạng và bảo mật ingress (AD-11, NFR-14)

- **`public-net`**: Chỉ có dịch vụ **Caddy** mở cổng công khai ra máy host (`80:80`, `443:443`).
- **`app-net`**: Mạng ứng dụng nội bộ (`p-process`, `odoo`, `keycloak`, `node-red`, `superset`, `mailpit`).
- **`data-net`**: Mạng dữ liệu riêng biệt (`postgres`, `qdrant`, `ollama`).
- **Tuyệt đối không mở cổng trực tiếp** của PostgreSQL, P nội bộ, Node-RED editor, Superset admin hay Keycloak admin ra môi trường mạng công khai.
- Superset chỉ được truy cập qua Caddy tại đường dẫn nhúng `/analytics/*`; toàn bộ trang quản trị Superset được giữ kín trong mạng nội bộ.

