# Tầng P: Process / Automation Layer (Node-RED)

Thư mục này chứa cấu hình và các kịch bản luồng tự động hóa (flows) cho **Node-RED**.

## Thành Phần Chức Năng:
- **Workflow**: Tiếp nhận các sự kiện nghiệp vụ từ Odoo (Tầng H) và điều phối luồng xử lý liên dịch vụ.
- **Validation**: Kiểm tra tính hợp lệ dữ liệu, định dạng JSON Schema trước khi đưa vào cơ sở dữ liệu.
- **Automation**: Tự động hóa tác vụ định kỳ (Cron), gửi thông báo và kích hoạt các pipeline AI (Tầng I).

## Cấu Trúc:
- `data/flows.json`: Tệp lưu trữ định nghĩa các luồng xử lý Node-RED.
- `data/settings.js`: Tệp cấu hình bảo mật, CORS và API endpoint.
- `package.json`: Khai báo các node mở rộng từ npm.
- `Dockerfile`: Image xây dựng dịch vụ Node-RED độc lập.
