# Tầng P: Process Core (TypeScript / Fastify)

Dịch vụ lõi quy trình độc lập sở hữu toàn bộ bất biến nghiệp vụ và trạng thái chuẩn tắc của DX-LAB theo **Kiến trúc Lục giác (Hexagonal Architecture)**.

## Quyền Sở Hữu & Bất Biến Nghiệp Vụ:
- **Canonical Business State (AR-1, AR-2)**: Chỉ module TypeScript trong lõi P được phép ghi trạng thái ticket, phân công công bằng, SLA, CSAT và vòng đời SOP.
- **Không truy cập trực tiếp (AR-4, AR-21)**: Odoo, Web, Node-RED, Superset hoặc AI không được phép đọc/ghi trực tiếp vào cơ sở dữ liệu của P.
- **Transactional Outbox (AR-3)**: Mọi sự kiện tích hợp ra bên ngoài đều được ghi nguyên tử vào bảng `dx_core.outbox_events` trong cùng giao dịch cơ sở dữ liệu.
- **Idempotency (AR-3)**: Mọi thao tác ghi hoặc side-effect đều được kiểm soát bởi bảng `dx_core.idempotency_keys`.

## Cấu Trúc Lục Giác:
- `src/domain/`: Thực thể, kiểu dữ liệu, bất biến nghiệp vụ thuần túy không phụ thuộc framework.
- `src/application/`: Định nghĩa các cổng (ports), use cases và điều phối quy trình.
- `src/adapters/http/`: Bộ chuyển đổi HTTP (Fastify server, routing, RFC 9457 error handling).
- `src/adapters/postgres/`: Bộ chuyển đổi cơ sở dữ liệu PostgreSQL (Drizzle ORM client, schema, migrations).
- `src/adapters/storage/`: Kho tệp riêng tư ngoài web root; chỉ PostgreSQL giữ metadata, MIME đã phát hiện và SHA-256.
- `src/adapters/postgres/migrations/`: Thư mục lưu trữ migration kỹ thuật ban đầu (`0001_initial_technical_schema.sql`).

## Scripts:
- `npm run build`: Biên dịch mã nguồn TypeScript sang JavaScript (`dist/`).
- `npm run lint`: Kiểm tra kiểu dữ liệu TypeScript nghiêm ngặt (`tsc --noEmit`).
- `npm run test`: Chạy kiểm thử tự động.
- `npm start`: Khởi chạy server Fastify đã build.

## Tệp đính kèm riêng tư

Đặt `ATTACHMENT_STORAGE_PATH` tới thư mục chỉ tiến trình P có quyền đọc/ghi. Docker Compose dùng volume `attachment_data` tại `/app/private-attachments`; không mount thư mục này vào Web hoặc Caddy. Mỗi ticket nhận tối đa một JPG, PNG, WebP hoặc PDF không quá 10 MB và P luôn xác minh extension, MIME khai báo, magic bytes và checksum trước khi ghi ticket.

## Nâng cấp phạm vi truy cập

Migration `0006_ticket_access_scope.sql` chỉ bổ sung `group_id` và `assigned_sub`. Ticket cũ giữ `group_id = NULL` và bị từ chối trên mọi truy vấn đọc, kể cả vai trò toàn tổ chức. Vận hành phải gán nhóm rõ ràng sau khi rà soát; không backfill bằng suy đoán từ loại hoặc mô tả ticket.
