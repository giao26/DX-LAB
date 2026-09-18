# Đối chiếu chương 6.2–6.5 với PRD DX-OS

Đối chiếu các bản văn người dùng cung cấp về tầng dữ liệu, form, ứng dụng nhân viên và tự động hóa với `prd.md` và `addendum.md` ngày 18/09/2026. Các đoạn trong tài liệu nguồn là mô tả kiến trúc ví dụ Google; PRD sản phẩm nguồn mở không cần sao chép công cụ hoặc công thức của ví dụ. Người dùng đã chọn ứng dụng nhân viên trực tuyến trên web, dùng được trên điện thoại.

## Khoảng trống yêu cầu sản phẩm cần xem xét

1. **Tiếp nhận hộ khách từ kênh nội bộ.** Mục 6.2.1 và 6.3.1 có luồng nhân viên nhận yêu cầu qua điện thoại hoặc hiện trường rồi tạo ticket, bên cạnh form công khai. PRD FR-4 và UJ-1 mới đặc tả khách tự gửi form. Nếu sản phẩm cần phủ kênh này, cần ghi rõ nhân viên được tạo hộ, nguồn tiếp nhận và người tạo được lưu, cùng kiểm tra đầu vào như form; quan hệ giữa người nhập hộ và người được phân công cần rõ. Không nhất thiết đưa vào kịch bản demo chính nếu thời gian giới hạn.

2. **Nhận diện khách cũ và tạo hồ sơ mới có kiểm soát.** Mục 6.2.1–6.2.2 đòi hỏi ticket liên kết một khách hàng đã có hoặc một khách hàng mới. PRD chỉ có thông tin khách trong ticket, chưa có yêu cầu rằng những yêu cầu lặp lại của cùng khách được nối vào một hồ sơ, và cách xử lý khi số điện thoại/email trùng hoặc không khớp. Đây là hành vi sản phẩm; không bắt buộc mô tả thuật toán quét cột Sheets trong PRD. Cần tránh tự động gộp nhầm hai khách chỉ vì một trường liên hệ trùng.

3. **Khóa sửa hồ sơ đã đóng, giữ vết đính chính.** Mục 6.2.1 yêu cầu chốt hồ sơ khi hoàn tất. FR-7 đã cấm tự mở lại và yêu cầu kết quả xử lý, nhưng chưa nói liệu nội dung/kết quả/thời điểm của ticket Đóng có thể bị sửa âm thầm. Bổ sung tiêu chí: người dùng nghiệp vụ không sửa trực tiếp các sự kiện đã chốt; mọi đính chính có quyền phải tạo sự kiện có người, thời điểm, lý do và giá trị trước/sau. Điều này bảo vệ SLA, CSAT và báo cáo lịch sử.

4. **Thông báo đúng một lần theo sự kiện, có trạng thái giao hàng.** Mục 6.5.1–6.5.3 nêu lỗi kích hoạt kép từ nhiều kênh. PRD đòi email xác nhận/hoàn tất, cảnh báo Odoo và tính nhất quán, nhưng chưa có tiêu chí kiểm tra thông báo không bị gửi trùng khi cùng sự kiện được xử lý lại hoặc khi nguồn gửi trùng, cũng như cách nhìn thấy thất bại để gửi lại. Có thể thêm tiêu chí sản phẩm rằng mỗi sự kiện nghiệp vụ chỉ tạo một thông báo cùng loại cho cùng người nhận; thất bại được ghi và thử lại, không làm mất ticket. `notification_outbox`, Node-RED và khóa idempotency thuộc kiến trúc, không cần khóa trong PRD.

## Đã được bao phủ hoặc chủ ý nằm ngoài phạm vi

- **Tạo ticket hợp lệ, ID và timestamp phía máy chủ:** FR-4; email nay là bắt buộc theo quyết định sau tài liệu mẫu.
- **Phân loại, phân công, đổi trạng thái và Poka-Yoke:** FR-5–FR-7; yêu cầu kết quả trước khi Đóng và quyền Người phụ trách rõ hơn ví dụ Sheets.
- **CSAT và email sau Đóng:** FR-8 đã yêu cầu 1–5 sao, ticket liên kết đúng và không thể ghi bằng đoán ID; không cần Apps Script Web App hoặc URL chỉ dựa vào `ticket_id`.
- **Quyền cấp dòng:** FR-9 cố ý chặt hơn ví dụ: nhân viên xem danh sách ticket của nhóm có che PII; Người phụ trách mới xem liên hệ và đính kèm; trưởng phòng, giám đốc xem toàn bộ.
- **Ứng dụng di động, offline, camera/GPS:** phần chức năng trực tuyến trên màn điện thoại đã có ở FR-7 và ràng buộc chất lượng; offline và phần cứng bị loại khỏi bản dự thi theo quyết định người dùng.
- **Cảnh báo khiếu nại sang Telegram:** FR-3 dùng Odoo làm kênh nội bộ theo quyết định người dùng. Cảnh báo riêng cho loại Khiếu nại trong tài liệu mẫu là ví dụ triển khai, chưa có quyết định rằng nó phải là tín hiệu riêng trong demo.
- **Google Sheets Table, AppSheet, Apps Script, n8n, công thức cột, `Log_Email`:** cơ chế của mẫu tham chiếu, không phải yêu cầu của sản phẩm nguồn mở. Addendum đã định hướng PostgreSQL, API giao dịch và Node-RED nhưng chưa khóa thiết kế.
- **Bản ghi Đóng vào P.A.R.A Areas:** chủ ý sửa sai trong addendum: ticket nghiệp vụ vẫn ở hệ thống dữ liệu; P.A.R.A quản tài liệu/SOP, không thay vòng đời database.

## Thứ tự đề xuất khi bổ sung PRD

Ưu tiên 2–4 vì bảo vệ tính đúng của dữ liệu và các thông báo trong luồng demo hiện tại. Mục 1 có thể ghi là mở rộng hoặc đưa vào bản dự thi nếu muốn chứng minh hai kênh tiếp nhận đúng theo chương 6.2. Không biến mô tả Google thành tiêu chí nghiệm thu công nghệ.
