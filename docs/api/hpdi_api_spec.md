# Quy ước giao diện giữa các thành phần H–P–D–I

> **Trạng thái:** tài liệu quy ước kiến trúc. Các endpoint và schema triển khai chỉ có hiệu lực khi được định nghĩa trong `contracts/` theo Story 1.1. Không sử dụng các endpoint thử nghiệm trước đây như `/api/v1/events/human` hoặc `/api/v1/ai/ask`.

Nguồn quyết định: [Architecture Spine](../../_bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md), đặc biệt AD-3, AD-4, AD-7, AD-8, AD-10, AD-21, AD-22 và AD-23.

## 1. Nguồn hợp đồng duy nhất

- REST API được đặc tả bằng OpenAPI có phiên bản trong `contracts/openapi/`.
- Sự kiện tích hợp được đặc tả bằng JSON Schema có phiên bản trong `contracts/events/`.
- Client được sinh hoặc kiểm tra từ các hợp đồng này; kiểm thử tương thích producer–consumer là cổng CI.
- Không tự đặt endpoint, bảng, enum hoặc payload ngoài hợp đồng đã commit.
- Lỗi HTTP dùng `application/problem+json` theo RFC 9457.

Các thư mục `contracts/` chưa tồn tại trong skeleton hiện tại và sẽ được tạo ở Story 1.1.

## 2. Quy tắc chung cho command và sự kiện

- Command tạo mới và side effect có thể thử lại phải có `Idempotency-Key`.
- Cập nhật aggregate phải kèm `If-Match` hoặc điều kiện phiên bản tương đương; phiên bản cũ trả `412`, còn xung đột quy tắc nghiệp vụ trả `409`.
- P ghi thay đổi nghiệp vụ và sự kiện outbox trong cùng một giao dịch PostgreSQL.
- Việc chuyển giao là at-least-once; consumer khử trùng bằng `event_id`, retry có giới hạn và chuyển lỗi hết lượt sang dead-letter.
- Sự kiện mang một phiên bản schema trong `event_type` và `aggregate_version` tăng đơn điệu.
- Consumer lưu checkpoint phiên bản, bỏ qua phiên bản cũ, phát hiện khoảng trống và đồng bộ lại từ snapshot endpoint được định nghĩa trong OpenAPI.
- Thêm trường tùy chọn là thay đổi tương thích. Đổi tên/xóa trường, siết nullability hoặc xóa enum yêu cầu phiên bản major mới.

## 3. Web/BFF và Odoo gọi P

Web/BFF và Odoo chỉ thay đổi trạng thái qua command API của P. Chúng không đọc hoặc ghi trực tiếp bảng P.

- Trình duyệt đăng nhập bằng Authorization Code với PKCE qua Keycloak.
- Cookie BFF chỉ chứa mã phiên mờ đã ký; mutation dùng cookie phải chống CSRF.
- Intake ẩn danh phải kiểm tra CSRF/origin, giới hạn tốc độ và dùng `Idempotency-Key`.
- Odoo dùng OAuth 2.0 Token Exchange để P nhận được cả `sub` của nhân viên và danh tính client gọi.
- Tác vụ máy dùng client credentials và không giả danh người dùng.
- P kiểm tra issuer, audience, scope, vai trò, nhóm và quyền nhận ticket trên mọi yêu cầu tài nguyên.
- Header danh tính do caller tự cung cấp không được tin cậy.

## 4. P phát sự kiện sang Node-RED và Odoo

Luồng chuyển giao chuẩn:

1. Worker outbox của P gửi HTTP POST bằng client credentials tới webhook Node-RED nội bộ có phiên bản.
2. Node-RED chuyển đồng bộ sự kiện tới endpoint Odoo có phiên bản và idempotent.
3. Odoo ghi `event_id` vào durable inbox trong cùng giao dịch cập nhật projection.
4. Odoo trả `2xx`; Node-RED chuyển phản hồi này cho P làm xác nhận duy nhất.
5. Mất phản hồi dẫn tới retry an toàn; durable inbox ngăn áp dụng sự kiện hai lần.

Node-RED không sở hữu send-once semantics, không sửa trạng thái ticket và không kết nối để ghi trực tiếp PostgreSQL của P.

## 5. P phối hợp với I

Tích hợp AI là bất đồng bộ và do P sở hữu:

- Sau khi tạo ticket, P tạo classification job; khi phát hiện nút thắt, P tạo analysis job.
- Ngữ cảnh công việc gồm `job_id`, `analysis_id` khi có, digest đầu vào/bằng chứng, phiên bản model, prompt và nguồn, số lần thử và thời hạn.
- I phải trả lại đúng ngữ cảnh đó cùng kết quả có kiểu dữ liệu.
- I trả kết quả qua command P đã xác thực và idempotent; chỉ P thực hiện chuyển trạng thái công việc AI.
- P từ chối idempotent kết quả đã cũ, sai digest, sai phiên bản hoặc thuộc trạng thái kết thúc.
- Khi AI lỗi hoặc hết hạn, loại yêu cầu do khách chọn vẫn được dùng tạm để phân công và nhân viên vẫn phải xác nhận.
- I không được tự thay đổi ticket, gửi email, phê duyệt khuyến nghị hoặc xuất bản SOP.

## 6. Dữ liệu báo cáo

- P cung cấp reporting view và snapshot có phiên bản, gồm `as_of`, kỳ dữ liệu, khóa phạm vi `group_id`, phiên bản định nghĩa chỉ số, dấu truy vết ticket/sự kiện nguồn và các chỉ số đã duyệt.
- Tài khoản database của Superset chỉ được đọc các view báo cáo, không đọc bảng riêng của P.
- BFF lấy reporting-scope grant ngắn hạn từ P và ánh xạ chính xác nhóm được phép vào RLS của Superset.
- Thiếu hoặc không nhận diện được phạm vi phải từ chối toàn bộ dữ liệu.
- Dashboard chỉ trình bày; filter trên giao diện không cấp thêm quyền.
- Thay đổi đã commit phải xuất hiện trong dữ liệu trình bày trong vòng 60 giây; giao diện phải báo thời điểm dữ liệu mới nhất khi quá giới hạn.

## 7. Kiểm thử hợp đồng bắt buộc

- Command lặp cùng `Idempotency-Key` không tạo thêm bản ghi hoặc side effect.
- Cập nhật với phiên bản cũ trả `412`; xung đột nghiệp vụ trả `409` và không ghi đè dữ liệu.
- Retry sự kiện không cập nhật projection Odoo hai lần.
- Sự kiện cũ bị bỏ qua; khoảng trống phiên bản kích hoạt đồng bộ lại.
- Người dùng khác nhóm hoặc chưa nhận ticket bị từ chối.
- Header giả mạo danh tính qua Odoo bị từ chối và audit ghi cả người dùng lẫn client gọi.
- Kết quả AI sai digest, hết hạn hoặc đã bị thay thế không làm đổi trạng thái nghiệp vụ.
- Callback AI lặp cùng khóa idempotency chỉ hoàn tất công việc một lần; callback thiếu xác thực bị từ chối.
- Retry hết giới hạn tạo dead-letter có thể quan sát; checkpoint được giữ qua lần khởi động lại consumer.
