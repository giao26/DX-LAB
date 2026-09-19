# Tầng P: Process / Automation Layer (Node-RED)

Thư mục này chứa cấu hình và các kịch bản luồng tự động hóa (flows) cho **Node-RED**.

## Vai trò trong kiến trúc H–P–D–I:
- **Lập lịch và chuyển giao (Schedule & Delivery)**: Tiếp nhận sự kiện outbox từ lõi P (`services/p_process`) và chuyển tiếp tới Odoo (Tầng H) hoặc các dịch vụ bên ngoài.
- **Không chứa bất biến nghiệp vụ**: Tuyệt đối không chứa quy tắc nghiệp vụ cốt lõi hay thay đổi trực tiếp cơ sở dữ liệu của P. Mọi trạng thái nghiệp vụ thuộc về lõi Fastify P (AR-26).
- **Tích hợp**: Đóng vai trò adapter chuyển giao giao thức.

## Cấu Trúc:
- `data/flows.json`: Tệp lưu trữ định nghĩa các luồng xử lý Node-RED.
- `data/settings.js`: Tệp cấu hình bảo mật, CORS và API endpoint.
- `package.json`: Khai báo các node mở rộng từ npm (phiên bản cố định).
- `Dockerfile`: Image xây dựng dịch vụ Node-RED độc lập.
