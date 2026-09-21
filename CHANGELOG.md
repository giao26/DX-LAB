# Changelog

Mọi thay đổi quan trọng của dự án **DX-LAB (DX-OS)** sẽ được ghi chép chi tiết trong tệp này.
Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Đã thay đổi (Changed)
- Thay runtime Ollama bằng adapter OpenRouter bất đồng bộ dùng model cố định `qwen/qwen3-8b`, chính sách ZDR/data-collection deny và fixture offline cho CI.
- Giảm chuẩn tài nguyên profile `ai` vì không còn tải hoặc chạy mô hình ngôn ngữ cục bộ.

### Kế hoạch phát triển (Planned)
- Hoàn thiện module `dx_core` trên Odoo để quản lý hồ sơ nhân viên và phân quyền RBAC.
- Xây dựng luồng workflow tự động hóa xác thực dữ liệu trên Node-RED.
- Cấu hình semantic layer và bảng điều khiển trực quan hóa dữ liệu trên Apache Superset.
- Hoàn thiện indexing RAG trên nguồn tri thức đã công bố và embedding manifest.

---

## [0.1.0-alpha] - 2026-09-18

### Đã thêm (Added)
- Khởi tạo khung sườn kiến trúc chuẩn H-P-D-I (Human - Process - Data - Intelligence).
- Thiết lập hồ sơ tuân thủ tiêu chí PoF của cuộc thi OLP PMNM 2026:
  - Giấy phép nguồn mở `LICENSE` (GNU AGPLv3) và thông cáo mục đích `NOTICE`.
  - Hướng dẫn biên dịch và khởi chạy từ mã nguồn độc lập (`BUILD.md`, `INSTALL.md`).
  - Danh mục quản lý phụ thuộc và bản quyền bên thứ ba (`DEPENDENCIES.md`).
  - Bộ quy tắc đóng góp và ứng xử cộng đồng (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`).
  - Hệ thống mẫu theo dõi lỗi và yêu cầu tính năng (`.github/ISSUE_TEMPLATE/`).
  - Kịch bản tự động hóa CI workflow cho GitHub Actions.
- Kịch bản triển khai container hợp nhất qua `docker-compose.yml` cho cả 7 dịch vụ:
  - Tầng H: Odoo ERP
  - Tầng P: Node-RED Automation
  - Tầng D: PostgreSQL & Apache Superset
  - Tầng I: Qdrant, Haystack Service & Ollama LLM
- Kịch bản vận hành `Makefile`, `scripts/setup.sh`, `scripts/build.sh`, và `scripts/release.sh` (đóng gói chuẩn mở `.tar.gz`).
