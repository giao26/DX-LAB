# Epic 1 Context: Xử lý yêu cầu hỗ trợ trọn vòng đời

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Thiết lập lát cắt nghiệp vụ cốt lõi từ tiếp nhận yêu cầu hỗ trợ, phân loại AI có người xác nhận, phân công công bằng theo nhóm, xử lý theo SLA 2 giờ làm việc, đóng ticket và thu thập đánh giá CSAT, đồng thời chuyển đổi mã nguồn sang cấu trúc chuẩn (Fastify lõi P, Node-RED tự động hóa, Docker Compose profiles) và phân quyền chặt chẽ theo vai trò/nhóm.

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

- Tiếp nhận ticket (FR-4): Họ tên, điện thoại, email bắt buộc, loại yêu cầu, mô tả, tối đa 1 tệp <= 10MB (ảnh/PDF). Khóa trùng theo số điện thoại; gửi email xác nhận idempotent.
- Phân loại AI & Phân công (FR-5, FR-6): AI gợi ý loại (Khiếu nại, Tư vấn, Bảo hành). Nhân viên phải xác nhận loại trước khi nhận xử lý. Phân công công bằng vòng tròn (Round-Robin) theo số lượt nhận thấp nhất và ID tăng dần; mỗi nhân viên tối đa 1 ticket đang hoạt động; hàng đợi FIFO khi tất cả bận; chọn và giữ chỗ nguyên tử trong một transaction DB.
- Vòng đời & SLA (FR-7): Trạng thái WAITING -> IN_PROGRESS -> CLOSED. SLA 2 giờ làm việc (Thứ 2 - Thứ 6: 08:00-12:00, 13:00-17:00 Asia/Ho_Chi_Minh). Quá hạn không bị reset khi đóng.
- Đóng ticket & CSAT (FR-8): Đóng gửi đúng 1 email kết quả kèm liên kết CSAT dùng 1 lần (token mờ, hết hạn). CSAT 1-2 sao tự động tạo việc rà soát cho Trưởng nhóm.
- Bảo mật & Quyền riêng tư (FR-9, NFR-5): PII bị che trên danh sách chung; chỉ người phụ trách và cấp quản lý được xem chi tiết và tệp đính kèm. AI phân loại chỉ nhận mô tả, không nhận PII.

## Technical Decisions

- Chủ quyền dữ liệu (AR-1, AR-2): Chỉ module domain/application TypeScript trong lõi Fastify P (services/p_process) được phép ghi trạng thái ticket, phân công, SLA, CSAT.
- Ranh giới dịch vụ & Tái cấu trúc brownfield (AR-26): Node-RED chuyển sang services/p_automation, chỉ đóng vai trò lập lịch và chuyển giao tích hợp; không chứa bất biến nghiệp vụ.
- Hợp đồng tích hợp (AR-21): OpenAPI và JSON Schema đặt tại thư mục contracts/ là nguồn giao diện chuẩn duy nhất.
- Độ tin cậy phân tán & Outbox (AR-3, NFR-13): Transaction P ghi thay đổi cùng bảng outbox; consumer khử trùng bằng event_id, theo dõi aggregate_version, dead-letter cho lỗi quá số lần thử.
- Lưu trữ tệp riêng tư (AR-9): Adapter lưu file ngoài web root, metadata/checksum/MIME/kích thước lưu trong PostgreSQL; endpoint tải file bắt buộc kiểm tra quyền P.
- Profiles Compose (AR-14, AR-24): Cung cấp profile core (chỉ P, PostgreSQL, test double) phục vụ phát triển/kiểm thử không cần tải AI hay Odoo.

## UX & Interaction Patterns

- Form khách (UX-DR-5): Bố cục một cột trên mobile, nhãn rõ ràng, email bắt buộc, focus tóm tắt lỗi khi validation thất bại, thông báo thành công hiển thị mã ticket một lần.
- Thao tác nhân viên (UX-DR-3, UX-DR-17): Giao diện Odoo và Web hiển thị mã ticket nổi bật, trạng thái bằng chữ/biểu tượng, hoạt động nhất quán trên cả desktop và trình duyệt mobile (>= 320 CSS px).
- Đánh giá CSAT (UX-DR-14): Đánh giá 1–5 sao dạng radio có nhãn hỗ trợ bàn phím; không tính 'Chưa phản hồi' như 0 sao hay điểm thấp.

## Cross-Story Dependencies

- Story 1.1 tạo nền tảng repository, cấu trúc thư mục services/p_process, services/p_automation, contracts/ và migration schema ban đầu. Mọi story tiếp theo đều phụ thuộc vào Story 1.1.
- Story 1.2 thiết lập Docker Compose profile core để chạy và kiểm thử độc lập cho Story 1.1 và các story nghiệp vụ tiếp theo.
- Story 1.3 - 1.6 xây dựng tiếp nhận ticket, email xác nhận, lưu tệp và quyền xem.
- Story 1.7 - 1.11 xây dựng phân công, phân loại AI, vòng đời SLA, đóng ticket và xử lý CSAT.