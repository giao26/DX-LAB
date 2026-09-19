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
- `src/adapters/postgres/migrations/`: Thư mục lưu trữ migration kỹ thuật ban đầu (`0001_initial_technical_schema.sql`).

## Scripts:
- `npm run build`: Biên dịch mã nguồn TypeScript sang JavaScript (`dist/`).
- `npm run lint`: Kiểm tra kiểu dữ liệu TypeScript nghiêm ngặt (`tsc --noEmit`).
- `npm run test`: Chạy kiểm thử tự động.
- `npm start`: Khởi chạy server Fastify đã build.
