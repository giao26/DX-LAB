# Hiện trạng cần nối vào

- `apps/web/app/page.tsx` đang là biểu mẫu DX-Ticket công khai; giữ đường vào công khai khi bổ sung Portal.
- Web dùng Next.js 16.3.5/React 19.3.0, chưa có auth/Portal/Dashboard; đọc guide Next.js đi kèm trước viết code theo `apps/web/AGENTS.md`.
- `infra/caddy/Caddyfile` dành `/auth*` và `/resources*` cho Keycloak; không đặt callback BFF hay Resources tại URL xung đột.
- `infra/keycloak/dxlab-realm.json` có client `web`, các role employee/group_lead/department_head/director. Audience hiện có p-process/odoo; chưa có audience web hay membership công ty riêng. Phải điều tra và ghi rõ policy, không suy đoán rằng mọi tài khoản realm đều thuộc công ty.
- UX mô tả Dashboard Giám đốc; Story 2.1 nói người có quyền Dashboard. Lập kế hoạch phải xác định ánh xạ quyền trước triển khai.
- Quyền P/Odoo hiện có tiếp tục kiểm tra tại đích. Link Portal không thay thế phân quyền.
- D/I chỉ xây shell điều hướng ở story này; Resources và thông báo chưa triển khai không hiển thị dữ liệu mẫu như dữ liệu thật.
