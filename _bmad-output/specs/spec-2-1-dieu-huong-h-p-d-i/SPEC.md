---
id: SPEC-2-1-dieu-huong-h-p-d-i
companions:
  - acceptance-matrix.md
  - brownfield.md
  - ../../planning-artifacts/ux-designs/ux-DX-LAB-2026-09-18/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-DX-LAB-2026-09-18/EXPERIENCE.md
  - ../../planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md
sources: []
---

# Story 2.1 — Điều hướng H/P/D/I

## Vì sao

Nhân sự công ty cần vào đúng khu vực làm việc từ một Portal, không phải tự tìm URL từng công cụ. Phạm vi lấy từ Story 2.1 trong `../../planning-artifacts/epics.md`.

## Khả năng

- **CAP-1** — Ý định: nhân sự đăng nhập Portal bằng tài khoản công ty. Thành công: chỉ tài khoản đang hoạt động, token đúng issuer/audience và membership hợp lệ được xem nội dung; người chưa đăng nhập chuyển tới Keycloak, người không đủ điều kiện bị từ chối.
- **CAP-2** — Ý định: đi trực tiếp tới H/P/D/I. Thành công: bốn ô toàn phần có tên đầy đủ, mô tả ngắn; H/P mở trang tổng hợp có đường quay lại Portal; D/I mở đúng phần trong cùng Dashboard khi có quyền.
- **CAP-3** — Ý định: khách gửi DX-Ticket qua liên kết công khai. Thành công: biểu mẫu và xác nhận vẫn độc lập; phiên khách không cấp quyền Portal, Resources, Odoo hoặc Dashboard.
- **CAP-4** — Ý định: dùng Portal bằng bàn phím, trên điện thoại hoặc màn chiếu. Thành công: thứ tự H→P→D→I rõ, focus dễ thấy, không cuộn ngang tại 320 CSS px và zoom 200%.

## Ràng buộc

- Tuân thủ AD-5/6/17: một Next.js BFF, Keycloak Authorization Code PKCE; cookie Secure/HttpOnly/SameSite=Lax chỉ chứa ID phiên opaque có chữ ký; token nằm server-side, mutation dùng cookie có CSRF.
- Từng tài nguyên đích kiểm tra lại quyền và từ chối theo mặc định. Không trả cấu trúc, thông báo, liên kết hoặc dữ liệu nội bộ trước xác thực hay cho người bị từ chối.
- Giao diện tiếng Việt theo DESIGN/EXPERIENCE: Công nghệ mở, Xanh tin cậy và WCAG 2.2 AA. Chức năng chưa triển khai phải nói rõ, không tạo dữ liệu giả.

## Ngoài phạm vi

Không xây thư viện SOP (2.2), thông báo (2.3), KPI/BI hoặc AI (Epic 3/4); không sửa lỗi gửi ticket demo đang để lại.

## Dấu hiệu thành công

Chín tình huống trong acceptance-matrix được xác minh: đăng nhập và từ chối đúng quyền, H/P có quay lại, D/I cùng Dashboard, khách chỉ dùng luồng công khai, các ô dùng được bằng bàn phím và không tràn ngang ở kích thước/zoom yêu cầu.

## Câu hỏi còn mở

Ánh xạ membership công ty và quyền Dashboard từ realm hiện có cần được điều tra trong bước lập kế hoạch build; chưa coi đặc tả là ready-for-dev khi ánh xạ này chưa rõ.
