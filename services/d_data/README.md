# Tầng D: Data & Analytics Layer (PostgreSQL & Apache Superset)

Thư mục này quản lý cơ sở dữ liệu quan hệ trung tâm và hệ thống Business Intelligence (BI) phục vụ trực quan hóa dữ liệu.

## Thành Phần Chức Năng:
- **PostgreSQL**: Hệ quản trị cơ sở dữ liệu lõi lưu trữ dữ liệu có cấu trúc của DX-OS, bảng sự kiện kiểm toán (audit logs) và dữ liệu đồng bộ giữa các tầng.
- **Apache Superset**: Nền tảng phân tích kinh doanh cung cấp bảng điều khiển (Dashboards), biểu đồ KPI vận hành và báo cáo tự động.

## Cấu Trúc:
- `postgres/init/01_init_schema.sql`: Kịch bản khởi tạo database, schema và bảng ban đầu khi container chạy lần đầu.
- `superset/config/superset_config.py`: File cấu hình bảo mật, kết nối PostgreSQL và tính năng trực quan hóa của Superset.
- `superset/Dockerfile`: Image Superset tùy chỉnh.
