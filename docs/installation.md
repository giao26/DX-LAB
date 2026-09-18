# Hướng Dẫn Cài Đặt Chi Tiết Các Tầng Dịch Vụ DX-LAB

Tài liệu này cung cấp hướng dẫn kỹ thuật chi tiết để cài đặt, cấu hình và tinh chỉnh từng tầng dịch vụ trong DX-LAB.

---

## 1. Triển Khai Qua Docker Compose (Khuyến Nghị)

Đây là phương thức đơn giản và đồng bộ nhất để chạy toàn bộ 4 tầng:

```bash
# Bước 1: Chuẩn bị tệp cấu hình
cp .env.example .env

# Bước 2: Tải và biên dịch các image
docker compose build

# Bước 3: Khởi động toàn bộ cụm dịch vụ
docker compose up -d
```

---

## 2. Triển Khai Thủ Công Từng Dịch Vụ (Independent Setup)

### A. Tầng H: Odoo Community
- **Vị trí**: `services/h_human/`
- **Cấu hình**: `services/h_human/config/odoo.conf`
- **Tập lệnh addons**: Đặt các module mở rộng tại `services/h_human/addons/`

### B. Tầng P: Node-RED Workflow
- **Vị trí**: `services/p_process/`
- **Cấu hình**: `services/p_process/data/settings.js`
- **Cài đặt thư viện**:
  ```bash
  cd services/p_process
  npm install
  ```

### C. Tầng D: PostgreSQL & Superset
- **PostgreSQL**: Kịch bản SQL khởi tạo nằm tại `services/d_data/postgres/init/01_init_schema.sql`
- **Superset**:
  Khởi tạo tài khoản quản trị Superset:
  ```bash
  docker compose exec superset superset fab create-admin \
      --username admin \
      --firstname Admin \
      --lastname DXLab \
      --email admin@dxlab.local \
      --password admin_dxlab
  docker compose exec superset superset db upgrade
  docker compose exec superset superset init
  ```

### D. Tầng I: Qdrant, Haystack RAG & Ollama
- **Qdrant**: Truy cập dashboard tại `http://localhost:6333/dashboard`
- **Ollama**:
  Kéo mô hình ngôn ngữ lớn để sử dụng:
  ```bash
  docker compose exec ollama ollama pull qwen2.5:7b
  docker compose exec ollama ollama pull bge-m3
  ```
- **Haystack RAG Service**:
  Khởi động độc lập qua Python:
  ```bash
  cd services/i_intelligence/haystack_rag
  pip install -r requirements.txt
  uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
  ```
