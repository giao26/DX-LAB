# Portal H/P/D/I

`/` và xác nhận DX-Ticket vẫn công khai. `/portal`, `/portal/h`, `/portal/p`, `/portal/resources` yêu cầu tài khoản Keycloak hoạt động có role hiện hành employee, group_lead, department_head hoặc director. `/portal/dashboard?section=d#d` và `/portal/dashboard?section=i#i` cùng Dashboard, chỉ director; query giữ phần đã chọn khi phải đăng nhập lại. H/P có đường quay lại. Resources, thông báo, KPI và AI hiện chỉ thông báo chưa triển khai, không dữ liệu mẫu. Odoo kiểm tra quyền riêng tại đích.

Web dùng Authorization Code + PKCE S256, callback `/bff/session/callback`. ID token được xác minh chữ ký RS256 bằng JWKS Keycloak, issuer, audience web, azp, nonce và thời hạn. P `/api/v1/identity` yêu cầu audience p-process và scope portal:read, tra online enabled/roles/groups mỗi request; chỉ trả sub/roles/groups. Lỗi IdP/P từ chối truy cập. Mọi trang riêng kiểm tra lại trước render, không cache.

Cookie __Host-dx-session chỉ chứa ID ngẫu nhiên ký HMAC, Secure/HttpOnly/SameSite=Lax/path=/; token chỉ trong bộ nhớ server. Kho global trên một process giới hạn 10.000 mục mỗi loại, login TTL 5 phút, phiên tối đa 30 phút và không vượt access token expiry. Restart mất phiên, cần login lại. Chạy một Web process/replica; muốn scale cần thay store bằng kho chia sẻ có TTL. Không refresh token. Logout POST cần CSRF và Origin khớp, hủy phiên Web; SSO Keycloak vẫn tồn tại.

Đặt DX_PUBLIC_ORIGIN HTTPS, WEB_OIDC_ISSUER (issuer công khai), WEB_OIDC_BACKCHANNEL_ISSUER (Keycloak nội bộ), WEB_OIDC_CLIENT_ID=web, P_PROCESS_BASE_URL và WEB_SESSION_SECRET ngẫu nhiên ít nhất 32 ký tự. Không dùng secret mẫu. Compose cho phép secret rỗng để profile core vẫn đọc cấu hình khi Web không chạy; Web từ chối xác thực khi secret thiếu hoặc ngắn, không tạo phiên. URL trả về chỉ chấp nhận các route Portal đã biết. Không log token/cookie. Logout gửi Clear-Site-Data cache để không khôi phục trang riêng từ bộ nhớ trình duyệt; history guard yêu cầu lại trang Portal khi đi Back/Forward.

`npm.cmd run test:e2e` build và chạy Web production ở localhost:3100 với fake IdP/P ở localhost:3101; runner quản lý trực tiếp process Node và đóng cả hai khi kết thúc. Fake IdP ký JWT RSA và xác minh PKCE khi đổi code, không có bypass trong code production. Chrome chấp nhận Secure cookie ở localhost; kiểm thử này không thay thế xác minh HTTPS/Keycloak thực trên môi trường triển khai.

Realm JSON chỉ là cấu hình cho import mới, không tự áp dụng realm đang chạy. Quản trị viên cần cập nhật client web trên realm hiện có: Standard Flow bật, Direct Access Grants tắt, PKCE S256 bắt buộc, redirect URI chính xác https://<domain>/bff/session/callback; scope portal:read được đưa vào token, audience web và p-process. Đồng bộ issuer/origin trong cấu hình triển khai; giữ role và policy P/Odoo hiện hành. Không chạy import, rebuild hoặc thay dữ liệu demo để áp dụng story này.

## Kiểm thử vận hành local — 26/09/2026

Theo yêu cầu kiểm thử vận hành, đã tạo `.env` local với khóa phiên ngẫu nhiên, cập nhật client Web trên realm hiện có và build/recreate riêng Web/P. Không xóa volume, không reset mật khẩu hoặc thay quyền tài khoản. Tài khoản demo director đã hoàn tất tên/họ bắt buộc của Keycloak ở lần đăng nhập đầu; file Admin CLI tạm đã xóa.

Đã kiểm thử qua Chrome với HTTPS localhost và Keycloak/P thật: staff.warranty và director đăng nhập thành công, Portal có bốn ô, H/P có đường quay lại; staff bị từ chối Dashboard còn director mở được phần I; cookie đủ Secure/HttpOnly/SameSite=Lax; logout xóa cookie phiên. Browser kiểm thử bỏ qua lỗi CA local, không tắt xác minh TLS trong cấu hình ứng dụng.

Để kiểm thử bằng tay, mở `https://localhost/portal` trong hai cửa sổ/profile trình duyệt tách biệt. Dùng tài khoản demo `staff.warranty` và `director`, mật khẩu fixture `dxlab-demo-2026`. Với mỗi tài khoản, thử H/P và quay lại Portal; thử D/I để thấy đúng khác biệt quyền; đăng xuất về biểu mẫu công khai. Dùng bàn phím Tab/Enter và kiểm tra màn hình hẹp/zoom 200%. Logout chỉ hủy phiên Web; phiên SSO Keycloak còn tồn tại nên đăng nhập lại có thể không hỏi mật khẩu. Dùng profile/cửa sổ ẩn danh riêng để đổi tài khoản.

Giới hạn vận hành còn lại: `/dx/tickets/workspace` của Odoo trả HTTP 502 ở lần kiểm tra này. Portal/H/P và Dashboard đã hoạt động; chuyển từ H vào Odoo chưa xác minh được. Thư viện SOP, thông báo, KPI và AI vẫn là phần chưa triển khai như phạm vi story. Chưa kiểm thử thu hồi role/disable tài khoản trên realm thật; các tình huống này đã có kiểm thử tự động cô lập. Sprint giữ `review` để người dùng duyệt vận hành.
