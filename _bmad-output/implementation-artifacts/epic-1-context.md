# Epic 1 Context: Xử lý yêu cầu hỗ trợ trọn vòng đời

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Epic này tạo một lát cắt nghiệp vụ hoàn chỉnh từ lúc khách gửi yêu cầu đến khi nhân viên xử lý, đóng ticket và khách phản hồi CSAT. Hệ thống phải phân loại có người xác nhận, phân công công bằng, theo dõi SLA, bảo vệ dữ liệu theo trách nhiệm và duy trì một mã ticket xuyên suốt form, email, Odoo và các tích hợp; đồng thời thiết lập lõi P và chính sách quyền có thể dùng lại cho các epic sau.

## Stories

- Story 1.1: Người duy trì chuyển mã hiện có sang cấu trúc kiến trúc chuẩn
- Story 1.2: Người mới dựng các profile tái lập mà không cần tải AI
- Story 1.3: Khách tạo ticket hợp lệ
- Story 1.4: Khách nhận email xác nhận không trùng
- Story 1.5: Khách gửi tệp đính kèm riêng tư
- Story 1.6: Người dùng nội bộ xem ticket đúng phạm vi trách nhiệm
- Story 1.7: Hệ thống phân công công bằng và thông báo qua Odoo
- Story 1.8: Nhân viên xác nhận phân loại do AI đề xuất
- Story 1.9: Nhân viên xử lý ticket theo quy trình và SLA
- Story 1.10: Người phụ trách đóng ticket và khách gửi CSAT
- Story 1.11: Trưởng nhóm rà soát phản hồi CSAT thấp

## Requirements & Constraints

- Ticket yêu cầu họ tên, số điện thoại, email, loại yêu cầu và mô tả; cho phép tối đa một ảnh hoặc PDF không quá 10 MB. Hệ thống kiểm tra ở giao diện và nơi ghi dữ liệu, cấp mã cùng timestamp, liên kết khách theo số điện thoại và đánh dấu xung đột liên hệ.
- AI chỉ đọc mô tả đã loại định danh để đề xuất `Khiếu nại`, `Tư vấn` hoặc `Bảo hành`. Nhân viên phải xác nhận hoặc sửa trước khi nhận trách nhiệm; lỗi AI dùng loại khách chọn làm giá trị tạm, không bỏ qua bước xác nhận.
- Phân công chỉ chọn nhân viên sẵn sàng trong nhóm phù hợp, ưu tiên số lượt nhận chính thức thấp nhất rồi quay vòng theo ID tăng dần. Mỗi người có tối đa một ticket hoạt động hoặc giữ chỗ; chọn và giữ chỗ phải nguyên tử. Khi mọi người bận, ticket chờ FIFO và SLA vẫn chạy.
- Vòng đời dùng chung là `WAITING → IN_PROGRESS → CLOSED`; chỉ người phụ trách hiện tại được bắt đầu, cập nhật bước và đóng sau khi đủ kết quả. Ticket đã đóng không mở lại; xử lý tiếp tạo ticket mới có liên kết.
- SLA là hai giờ làm việc, thứ Hai–thứ Sáu, 08:00–12:00 và 13:00–17:00 theo `Asia/Ho_Chi_Minh`, trừ ngày nghỉ cấu hình. Mọi thời gian chờ vẫn được tính và dấu quá hạn được giữ sau khi đóng.
- Sự kiện đóng tạo đúng một email kết quả và lời mời CSAT bằng token mờ, hết hạn, dùng một lần. CSAT 1–2 sao tạo đúng một việc rà soát cho Trưởng nhóm; chưa phản hồi là trạng thái riêng, không được tính là điểm thấp.
- Nhân viên xem danh sách nhóm với PII đã che; chỉ người phụ trách xem liên hệ và tệp; Trưởng nhóm xem chi tiết nhóm; Trưởng phòng và Giám đốc xem toàn bộ. Chính sách này phải nhất quán trên API, Odoo, tệp, liên kết và dữ liệu xuất, kể cả sau khi quyền bị thu hồi.
- Thay đổi trạng thái, phân công, phân loại và kết quả rà soát phải có lịch sử gồm tác nhân, thời gian UTC, correlation/nguồn và giá trị trước/sau. Lệnh cùng side effect phải idempotent; cập nhật đồng thời dùng điều kiện phiên bản.

## Technical Decisions

- P là nơi duy nhất thay đổi ticket, phân công, bước xử lý và CSAT. Luật nghiệp vụ nằm trong lõi domain/application TypeScript; Odoo, Web, Node-RED và AI chỉ đi qua API hoặc sự kiện đã commit.
- Giao dịch nghiệp vụ ghi thay đổi cùng outbox. Consumer dùng inbox bền vững, khử trùng theo `event_id`, kiểm tra `aggregate_version`, retry có giới hạn và chuyển lỗi cuối sang dead-letter có cảnh báo vận hành.
- OpenAPI và JSON Schema trong `contracts/` là hợp đồng tích hợp chuẩn. Odoo giữ projection tối thiểu và gọi command P bằng token ngắn hạn qua OAuth Token Exchange; P kiểm tra và audit cả người dùng lẫn ứng dụng gọi.
- Keycloak là OIDC issuer duy nhất. P kiểm tra audience, scope, vai trò, nhóm và quan hệ phân công tại từng tài nguyên; mã ticket không phải quyền truy cập.
- Tệp nằm ngoài web root qua storage port; PostgreSQL chỉ giữ metadata, checksum, MIME và kích thước. Endpoint tải tệp kiểm tra quyền, chữ ký, phần mở rộng và giới hạn dung lượng.
- Công việc AI có vòng đời `QUEUED | RUNNING | SUCCEEDED | FAILED | EXPIRED | SUPERSEDED`, kèm ID, digest đầu vào, phiên bản model/prompt, số lần thử và hạn. Kết quả muộn, sai digest hoặc sai ngữ cảnh bị từ chối idempotent.
- Profile `core` chỉ cần P, PostgreSQL và test double; `demo` thêm Web, Keycloak, Odoo, Node-RED và Superset; `ai` thêm Haystack và Qdrant. Môi trường, secret, dữ liệu và volume phải tách biệt; phiên bản phụ thuộc, image và model phải được khóa.

## UX & Interaction Patterns

- Form khách dùng bố cục một cột, nhãn trên trường và giữ dữ liệu khi lỗi; focus chuyển tới tóm tắt lỗi có liên kết từng trường. Thành công chỉ thông báo một lần mã ticket và trạng thái email.
- Odoo là bề mặt tác nghiệp của nhân viên và Trưởng nhóm. Mọi màn hình liên quan phải làm nổi bật mã ticket, trạng thái bằng chữ, bước hiện tại, hành động tiếp theo và lỗi có cách khắc phục; màu chỉ là tín hiệu bổ trợ.
- Luồng xem thông báo, mở ticket, xác nhận hoặc sửa loại, nhận trách nhiệm, ghi bước và đóng phải dùng được trên desktop lẫn trình duyệt điện thoại, bằng bàn phím, không cuộn ngang tại 320 CSS px hoặc zoom 200%.
- Hành động đóng phải xác nhận ngay trong ngữ cảnh và nêu hậu quả ngắn gọn. CSAT dùng nhóm radio có tên từ 1 đến 5 sao, giữ lựa chọn khi gửi lỗi và xác nhận kết quả bằng văn bản.

## Cross-Story Dependencies

- Story 1.1–1.2 tạo cấu trúc, hợp đồng, profile và ranh giới triển khai cho toàn bộ lát cắt còn lại.
- Ticket hợp lệ và mã ticket từ Story 1.3 là đầu vào cho email, tệp, quyền, phân công, AI, xử lý và CSAT; Story 1.4–1.5 bổ sung side effect và bằng chứng nhưng không được làm thay đổi tính nguyên tử của việc tạo ticket.
- Chính sách quyền ở Story 1.6 áp dụng xuyên suốt Story 1.7–1.11. Phân công tạm ở Story 1.7 chỉ thành trách nhiệm chính thức sau xác nhận phân loại ở Story 1.8.
- Story 1.9 chỉ bắt đầu sau khi có loại cuối cùng và người phụ trách; Story 1.10 chỉ đóng sau khi hoàn tất quy trình. Việc đóng giải phóng năng lực để phân công ticket chờ tiếp theo.
- Story 1.11 phụ thuộc phản hồi CSAT hợp lệ từ Story 1.10 và projection Odoo chống trùng từ nền tảng tích hợp chung.
