# Tầng H: Human / ERP Layer (Odoo Community)

Thư mục này chứa cấu hình và module mở rộng (`addons`) cho nền tảng quản trị nguồn lực doanh nghiệp **Odoo Community Edition**.

## Thành Phần Chức Năng:
- **Employee**: Quản lý hồ sơ, cấu trúc phòng ban và vị trí làm việc.
- **User**: Định danh tài khoản người dùng đăng nhập hệ thống.
- **Role & Access**: Ma trận phân quyền và nhóm quyền theo tiêu chuẩn RBAC.
- **Knowledge**: Cổng lưu trữ và chia sẻ tri thức doanh nghiệp.

## Cấu Trúc Thư Mục:
- `config/odoo.conf`: File cấu hình Odoo kết nối với PostgreSQL.
- `addons/dx_core/`: Module Odoo tùy biến cốt lõi cho dự án DX-LAB.
- `Dockerfile`: Image xây dựng Odoo kèm các phụ thuộc cần thiết.
