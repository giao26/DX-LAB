# Hướng Dẫn Biên Dịch & Khởi Chạy Từ Mã Nguồn (Building From Source)

Tài liệu này hướng dẫn chi tiết cách cấu hình, biên dịch (build) và khởi chạy toàn bộ hệ thống **DX-LAB (DX-OS)** hoàn toàn từ mã nguồn sử dụng các công cụ nguồn mở tiêu chuẩn.

---

## 1. Yêu Cầu Tiền Quyết (Prerequisites)

Tất cả các công cụ được sử dụng đều là công cụ mã nguồn mở được phát hành tự do:
- **Hệ điều hành**: Linux (Ubuntu 22.04 LTS / Debian 12 / Fedora), macOS hoặc Windows (WSL2)
- **Container Engine**: Docker Engine 24.0+ & Docker Compose v2.20+ (hoặc Podman / Podman Compose)
- **Build Tool**: GNU Make 4.0+
- **Ngôn ngữ & Quản lý gói**:
  - Python 3.11+ và `uv` (hoặc `pip`)
  - Node.js 20 LTS và `npm` 10+
  - Git 2.30+

---

## 2. Cấu Hình Trước Khi Dịch (Pre-build Configuration)

> [!IMPORTANT]
> Toàn bộ hệ thống được tham số hóa thông qua biến môi trường. **Tuyệt đối không sửa thủ công mã nguồn hoặc tệp header** để thay đổi thông số cấu hình.

1. Khởi tạo tệp môi trường `.env` từ tệp mẫu:
   ```bash
   cp .env.example .env
   ```
2. Tùy chỉnh các thông số cấu hình trong `.env` nếu cần (cổng mạng, mật khẩu cơ sở dữ liệu, model AI).
3. Chạy lệnh chuẩn bị tự động:
   ```bash
   make setup
   # hoặc: bash scripts/setup.sh
   ```

---

## 3. Biên Dịch Hệ Thống (Building)

Biên dịch container image cho các tầng thành phần sử dụng Docker:

```bash
# Biên dịch toàn bộ các dịch vụ từ mã nguồn
make build

# Hoặc biên dịch bằng lệnh docker compose chuẩn
docker compose build --no-cache
```

Lệnh trên sẽ tự động:
- Biên dịch image mở rộng cho Odoo tại `services/h_human/Dockerfile`
- Biên dịch image Node-RED kèm workflow tại `services/p_process/Dockerfile`
- Biên dịch image Superset cấu hình sẵn tại `services/d_data/superset/Dockerfile`
- Biên dịch service FastAPI + Haystack RAG tại `services/i_intelligence/haystack_rag/Dockerfile`

---

## 4. Khởi Chạy Hệ Thống (Execution)

Khởi động toàn bộ cụm dịch vụ:
```bash
make up
# Hoặc: docker compose up -d
```

Kiểm tra trạng thái hoạt động:
```bash
make status
# Hoặc: docker compose ps
```

Xem nhật ký thời gian thực (logs):
```bash
make logs
```

---

## 5. Truy Cập Các Tầng Dịch Vụ

Sau khi khởi chạy thành công, các dịch vụ sẽ lắng nghe trên các cổng mặc định:
- **Tầng H (Odoo ERP)**: http://localhost:8069
- **Tầng P (Node-RED Workflow)**: http://localhost:1880
- **Tầng D (PostgreSQL)**: localhost:5432
- **Tầng D (Apache Superset BI)**: http://localhost:8088
- **Tầng I (Haystack RAG API)**: http://localhost:8000/docs (Swagger UI)
- **Tầng I (Qdrant Vector DB)**: http://localhost:6333/dashboard
- **Tầng I (Ollama LLM Engine)**: http://localhost:11434

---

## 6. Dừng & Dọn Dẹp

Dừng toàn bộ hệ thống:
```bash
make down
```

Dọn dẹp container và giải phóng volume khi cần:
```bash
make clean
```
