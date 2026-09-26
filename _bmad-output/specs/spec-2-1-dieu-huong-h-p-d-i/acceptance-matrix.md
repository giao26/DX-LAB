# Ma trận chấp nhận — Story 2.1

Nguồn: Story 2.1, `../../planning-artifacts/epics.md`; mỗi dòng giữ một tiêu chí nguồn.

| AC | Cho trước / Khi | Thì | CAP |
| --- | --- | --- | --- |
| 1 | Chưa đăng nhập / mở Portal hoặc URL con | Chuyển Keycloak; không tải nội dung, thông báo hoặc liên kết nội bộ | 1 |
| 2 | Tài khoản công ty hoạt động / token hợp lệ issuer, audience, membership | Cho vào Portal; cookie Secure, HttpOnly, SameSite=Lax | 1 |
| 3 | Ngoài công ty, disabled hoặc thiếu membership / login hay URL trực tiếp | Từ chối, không lộ cấu trúc/thông báo/dữ liệu nội bộ | 1 |
| 4 | Nhân sự mở Portal / trang tải | H/P/D/I ở vùng ưu tiên; mỗi ô là toàn phần link tên đầy đủ + mô tả; Công nghệ mở/Xanh tin cậy | 2 |
| 5 | Nhân sự / chọn H hoặc P | Trang tổng hợp tương ứng, luôn quay lại Portal | 2 |
| 6 | Có quyền Dashboard / chọn D hoặc I | Cùng ứng dụng Dashboard, đúng phần D hoặc I | 2 |
| 7 | Thiếu quyền chức năng / bấm link hay mở URL trực tiếp | Đích kiểm tra lại quyền, deny mặc định, không lộ dữ liệu | 1, 2 |
| 8 | Khách có link công khai / mở hoặc gửi DX-Ticket | Chỉ biểu mẫu và xác nhận; phiên khách không mở Portal/Resources/Odoo/Dashboard | 3 |
| 9 | Màn chiếu, điện thoại hoặc zoom 200% / quan sát và điều hướng | Thứ tự H→P→D→I, không cuộn ngang 320 CSS px, bàn phím và focus rõ | 4 |
