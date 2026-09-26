---
title: 'Sửa redirect lỗi đăng nhập Portal sau reverse proxy'
type: 'bugfix'
created: '2026-09-26'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">
## Intent

Trang lỗi callback/login đang dựng Location từ request.url nội bộ của Next.js (0.0.0.0:3000), khiến Chrome báo ERR_ADDRESS_INVALID. Dùng origin công khai đã cấu hình cho redirect lỗi; khi origin thiếu/không hợp lệ trả lỗi 503 tại chỗ, không redirect về host nội bộ hoặc host do request cung cấp. Kiểm thử lỗi callback và cấu hình login thiếu ở sau proxy, giữ nguyên xác thực và kiểm tra lại đăng nhập hai tài khoản trên HTTPS demo.
</frozen-after-approval>

## Implementation Notes

- Điều tra: hai catch ở apps/web/app/bff/session/{login,callback}/route.ts dùng request.url; thành công/logout dùng DX_PUBLIC_ORIGIN. Không có câu hỏi intent hay thao tác dữ liệu không thể hoàn tác; thay hai route và test hồi quy nhỏ. Đọc guide Route Handlers đi kèm Next.js trước code. Triển khai demo là bước vận hành sau code kiểm chứng.
- Thêm helper session-error-response dùng origin được cấu hình, không dùng Host/forwarded-host/request.url. Cấu hình origin thiếu/sai trả HTML tiếng Việt 503 tại chỗ với no-store, CSP và đường về trang công khai; callback vẫn xóa cookie pending-login.

- Kiểm chứng: 54 unit tests Web và lint đạt; 16 E2E đạt trước bổ sung fallback HTML và assertions review. Docker production build/TypeScript đạt sau toàn bộ sửa đổi; đã cập nhật riêng container Web, giữ nguyên dữ liệu demo.
- HTTPS demo thực tế: callback không hợp lệ trả 307 với Location https://localhost/bff/session/error?status=403. Đăng nhập mới staff.warranty/director đều mở Portal 4 ô và trang H/P; staff bị từ chối Dashboard đúng phân quyền, director mở được Dashboard. Cookie Secure/HttpOnly/SameSite=Lax và logout xóa phiên được xác minh cho cả hai.

## Review Triage Log

- R1 medium: thiếu test callback dependency503 với pending cookie/state hợp lệ. Đã thêm test tạo login rồi giả IdP outage; xác minh redirect public status503.
- R2 medium: test chưa chứng minh no-store và security flags khi origin sai. Đã bổ sung assert Cache-Control, cookie expiry/Secure/HttpOnly/SameSite và không Location.
- R3 low: fallback JSON khó dùng trong điều hướng browser; sửa trực tiếp sang HTML 503 tiếng Việt có đường quay về và CSP, không thêm API/nhánh trạng thái. Không finding deferred.
