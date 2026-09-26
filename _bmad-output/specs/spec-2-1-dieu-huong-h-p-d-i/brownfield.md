# Hiện trạng cần nối vào

- `apps/web/app/page.tsx` đang là biểu mẫu DX-Ticket công khai; giữ đường vào công khai khi bổ sung Portal.
- Web dùng Next.js 16.3.5/React 19.3.0, chưa có auth/Portal/Dashboard; đọc guide Next.js đi kèm trước viết code theo `apps/web/AGENTS.md`.
- `infra/caddy/Caddyfile` dành `/auth*` và `/resources*` cho Keycloak; không đặt callback BFF hay Resources tại URL xung đột.
- `infra/keycloak/dxlab-realm.json` có client `web`, các role employee/group_lead/department_head/director. Audience hiện có p-process/odoo; cần cấu hình Web audience và portal:read. Theo quyết định đã chốt, membership dựa trên role nội bộ hiện hành và tài khoản hoạt động, không dựa riêng vào việc tồn tại trong realm.
- UX mô tả Dashboard Giám đốc; PRD nhắc nhân viên xem theo phạm vi. Story này dùng policy đã chốt: chỉ director vào shell D/I; không thay đổi quyền ticket của department_head.
- Quyền P/Odoo hiện có tiếp tục kiểm tra tại đích. Link Portal không thay thế phân quyền.
- D/I chỉ xây shell điều hướng ở story này; Resources và thông báo chưa triển khai không hiển thị dữ liệu mẫu như dữ liệu thật.
