# Đối chiếu “Nhiệm vụ PMMNM.pdf” với PRD DX-LAB

Nguồn đối chiếu là tài liệu học tập/nhiệm vụ do người dùng cung cấp, **không phải thể lệ OLP hay đề thi chi tiết**. Các mục dưới đây là khoảng trống sản phẩm/đề xuất cho bản demo; không được chuyển thành “yêu cầu bắt buộc của cuộc thi” nếu chưa kiểm chứng với thể lệ và đề chính thức. Các ví dụ công cụ và giấy phép liệt kê cuối PDF cũng là gợi ý cần kiểm tra lại, không phải quyết định kiến trúc.

## Khoảng trống ưu tiên

1. **Chứng minh tính lắp ghép và quyền sở hữu dữ liệu.** Chương 1.5–1.6, 4.2, 4.4 của nguồn nhấn mạnh mô-đun trao đổi qua API, một nguồn dữ liệu cốt lõi và khả năng thay thế thành phần. PRD nêu tầm nhìn mô-đun và UJ-3 đóng góp cục bộ, nhưng chưa có tiêu chí kiểm tra đường ranh giữa DX-Ticket, Odoo, kho tri thức, dashboard và AI, hoặc thao tác xuất dữ liệu mà không phụ thuộc một giao diện. Đề xuất thêm một kết quả demo nhỏ: giải thích/sơ đồ luồng API và sự kiện của cùng mã ticket, nguồn ghi dữ liệu chuẩn, cùng cách thay một đầu ra thông báo hoặc mô hình AI mà không sửa dữ liệu lõi. Đây là mục tiêu sản phẩm/kiến trúc, không phải yêu cầu dùng một công cụ cụ thể.

2. **Poka-Yoke tại chuyển trạng thái, đặc biệt khi đóng ticket.** Chương 3.2, 6.1–6.2 yêu cầu rõ “xong” là gì và chặn chuyển trạng thái nếu thiếu dữ liệu/kết quả. PRD FR-4 kiểm tra đầu vào, FR-7 ghi các bước, nhưng chưa có điều kiện đóng và cách xử lý nhánh ngoại lệ. Đề xuất tiêu chí: không đóng được ticket nếu thiếu kết quả xử lý và bằng chứng bắt buộc theo loại yêu cầu; phản hồi lỗi hướng người dùng bổ sung; lưu dấu vết khi trưởng phòng xử lý ngoại lệ. Đưa một tình huống bị chặn vào demo để chứng minh [P] hơn là chỉ trình diễn CRUD.

3. **Tín hiệu hành động sớm cho lãnh đạo.** Chương 7.3–7.4 phân biệt chỉ số dẫn dắt (tồn đọng/nguy cơ trễ) với kết quả đã xảy ra (đúng SLA, CSAT). FR-10 có tồn đọng, đúng/quá SLA và lọc sâu; FR-11 chỉ phát hiện mẫu đã quá hạn. Đề xuất thêm hàng đợi “sắp hết SLA” với thời gian làm việc còn lại, người/nhóm phụ trách và đường dẫn đến ticket, để trưởng phòng can thiệp trước khi quá hạn. Ngưỡng cảnh báo cần được chốt và kiểm thử riêng; không suy ra đây là tính năng bắt buộc từ thể lệ.

4. **Định danh xuyên hệ thống và thu hồi quyền.** Chương 5.1 nêu một định danh xuyên hệ sinh thái và vô hiệu hóa quyền tập trung. FR-3/FR-9 kiểm soát quyền dữ liệu, nhưng PRD chưa xác định cùng một nhân viên được đối chiếu thế nào giữa DX-Portal, Odoo, API và dashboard; cũng chưa có kiểm tra sau khi người đó rời nhóm hoặc nghỉ việc. Đề xuất ghi yêu cầu kết quả: thay đổi tư cách nhóm/thu hồi tài khoản làm mất quyền truy cập ticket và liên kết thông báo trên mọi bề mặt; các thao tác vẫn được truy vết về một định danh. SSO cụ thể là quyết định kiến trúc sau PRD.

5. **Bằng chứng chấm demo về lỗi và khả năng dựng lại.** Phần “Góc nhìn cho cuộc thi” của PDF đề nghị demo end-to-end, ví dụ dữ liệu trước/sau, tình huống lỗi, kiến trúc và build/run. PRD SM-1–SM-4 có đường đi thành công và UJ-3 người mới đóng góp, nhưng chưa định nghĩa gói minh chứng tối thiểu cho buổi chấm: dữ liệu mẫu được đánh dấu, kịch bản lỗi form/chuyển trạng thái, sơ đồ dòng dữ liệu H→P→D→I và hướng dẫn dựng lại bản demo. Đây là gợi ý từ tài liệu nhiệm vụ; nếu biến thành ràng buộc thi cần đối chiếu lại với Quick Guide/thể lệ chính thức.

## Đã được bao phủ, không cần thêm chỉ vì PDF nhắc tới

- H→P→D→I bằng DX-Ticket; con người duyệt quyết định AI; Resources chứa SOP/FAQ đã duyệt.
- Dashboard, chỉ số SLA/CSAT, bản chốt ngày, lịch sử ticket và phân quyền dữ liệu.
- Hành trình người mới chạy một lát cắt sản phẩm và gửi đóng góp.
- DTI, forecast/ML, data lakehouse, agent/MCP gateway và bộ ứng dụng năng suất đầy đủ là các hướng mở rộng/tài liệu học tập; PDF không làm chúng thành phạm vi bắt buộc của bản demo OLP 2026.
