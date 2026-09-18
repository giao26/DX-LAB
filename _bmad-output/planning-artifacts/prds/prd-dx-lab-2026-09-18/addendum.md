# Phụ lục đầu vào cho PRD DX-OS

Tài liệu này giữ các quyết định và ví dụ kỹ thuật từ phiên brainstorm để dùng khi thiết kế kiến trúc. PRD chính mô tả hành vi sản phẩm và tiêu chí nghiệm thu.

## Tham chiếu demo

- Luồng gốc cần tái hiện bằng thành phần nguồn mở: P.A.R.A → DX-Portal → biểu mẫu DX-Ticket → cơ sở dữ liệu lõi → ứng dụng nhân viên → dashboard.
- Tài liệu cuộc thi và các mục 5–8 do người dùng cung cấp là nguồn bối cảnh. Đề lập trình chi tiết dự kiến được công bố tháng 11/2026; rà soát lại PRD khi có đề.

## Mốc cuộc thi và bằng chứng cần chuẩn bị

- Thể lệ OLP 2026 là nguồn quy định chính: đội tối đa ba sinh viên, có giảng viên dẫn dắt, đăng ký qua trường. Việc xác nhận đội và thủ tục đăng ký thuộc kế hoạch thi, không phải chức năng DX-OS.
- Lịch trong thể lệ: tháng 11 dự kiến công bố đề lập trình chi tiết; ngày 07–09/12/2026 chấm kho mã; ngày 10/12/2026 trình diễn. Không suy ra giờ hoặc ngày khóa nộp chính thức từ lịch chấm.
- Điểm PoF 50 gồm kho mã công khai, giấy phép OSI, bản phát hành, khả năng build từ mã nguồn, quản lý phụ thuộc và tài liệu/giao tiếp. Điểm sản phẩm 50 xét nguyên gốc kỹ thuật, độ hoàn thiện, sự thân thiện, phát triển bền vững và trình diễn/thu hút cộng đồng.
- Bộ bằng chứng nên gồm một release phiên bản dạng mở, hướng dẫn cài trên môi trường sạch và chạy ngoài thư mục mã nguồn, danh mục phụ thuộc/giấy phép, README/CHANGELOG/issue tracker, sơ đồ luồng dữ liệu và kịch bản demo với dữ liệu mẫu được ghi nhãn.

## Quy tắc nghiệp vụ đã chốt trong brainstorm

- Loại ticket: Khiếu nại, Tư vấn, Bảo hành. Trạng thái: Chờ xử lý, Đang xử lý, Đóng.
- Form bắt buộc số điện thoại, họ tên, email, loại vấn đề và mô tả; cho phép một ảnh hoặc PDF tối đa 10 MB.
- SLA hoàn tất: 2 giờ làm việc, thứ Hai–thứ Sáu 08:00–12:00 và 13:00–17:00 giờ Việt Nam; ngày nghỉ cấu hình riêng. Hàng đợi và bước chờ kiểm tra vẫn tính SLA.
- Phân công cân bằng qua nhân viên đang sẵn sàng, theo lượt ID tăng dần khi bằng số ticket đã giao; mỗi người tối đa một ticket đang xử lý. Khi mọi người bận, hàng đợi FIFO.
- Nhân viên xem ticket của nhóm mình và chịu trách nhiệm với ticket đã nhận; trưởng phòng và giám đốc xem toàn bộ. Quy tắc áp dụng tại API và dữ liệu dashboard.
- Tệp gốc gắn với ticket; SOP/FAQ chỉ vào Resources sau rà soát và duyệt.
- AI phân loại từ mô tả văn bản, không dùng thông tin định danh hoặc tệp đính kèm; nhân viên xác nhận/sửa loại trước khi xử lý.
- Khi có ít nhất 3 ticket bảo hành quá hạn trong 7 ngày cùng có một bước kiểm tra kéo dài trên 60 phút làm việc, AI phân tích và đề xuất cho giám đốc. Giám đốc quyết định; nếu chấp nhận, AI soạn bản nháp SOP và tạo việc để Người duyệt tri thức rà soát trước khi xuất bản.
- Khách chấm CSAT 1–5 sao sau khi đóng; 1–2 sao tạo việc cho trưởng nhóm xem lại.
- Dữ liệu sự kiện cập nhật cảnh báo trong ngày; cuối ngày lưu bản chốt chỉ số. Demo trình bày thiết kế và lịch sao lưu, không cần khôi phục trực tiếp.
- Ứng dụng nhân viên của bản demo chạy trực tuyến trên web và dùng được trên điện thoại; ngoại tuyến, camera và GPS nằm ngoài phạm vi.

## Lịch sao lưu đề xuất để trình bày ở demo

- Mỗi ngày lúc 00:30: tạo bản sao nhất quán của dữ liệu ticket, tệp đính kèm và SOP đã duyệt, kèm thời điểm chốt và danh sách tệp để đối chiếu.
- Sau mỗi bản sao ngày: chuyển một bản mã hóa sang nơi lưu thứ hai tách khỏi máy chủ vận hành. Một bản dài hạn mỗi tháng có thể lưu trên phương tiện tách mạng khi điều kiện cho phép.
- Chính sách giữ bản minh họa: 7 bản ngày, 4 bản tuần và 12 bản tháng. Đây là đề xuất vận hành để trình bày, không phải thời hạn lưu trữ đã được phê duyệt cho mọi doanh nghiệp.
- Kiểm tra bản sao sau mỗi lần tạo và thử khôi phục định kỳ hằng tháng khi triển khai thực tế. Bản dự thi chỉ trình bày cách kiểm tra, không cần khôi phục trực tiếp trước ban giám khảo.

## Gợi ý kỹ thuật đã xuất hiện, chưa coi là yêu cầu sản phẩm

- Repo đã có Odoo, Node-RED, PostgreSQL, Superset, Qdrant, Haystack và Ollama dưới dạng khung triển khai.
- Đề xuất từ brainstorm: API nghiệp vụ ghi dữ liệu có giao dịch; PostgreSQL giữ lịch sử bước xử lý và hàng đợi thông báo; Node-RED định tuyến sự kiện; Superset đọc tập dữ liệu giới hạn quyền.
- Các lựa chọn thư viện, giấy phép phụ thuộc, môi trường phát triển nhẹ và giao thức tích hợp cần được kiểm tra trong bước kiến trúc và triển khai.

## Chiều sâu H từ tài liệu người dùng

- P.A.R.A có bốn vùng Projects, Areas, Resources và Archives. Projects có kết quả và điểm kết thúc; Areas là trách nhiệm duy trì; Resources chứa tri thức dùng lại đã duyệt; Archives giữ hồ sơ lịch sử. Hồ sơ ticket sống trong dữ liệu nghiệp vụ, không chuyển thành thư mục Archives chỉ vì trạng thái Đóng.
- DX-Portal được mô tả với ba vùng: truyền thông tập trung, nút khởi tạo công việc và thư viện tri thức.
- Odoo là nơi nhắn tin nội bộ được người dùng chọn. Nhóm được phân theo ranh giới bảo mật, chủ đề theo luồng công việc; có kênh toàn tổ chức, kênh khối/dự án và kênh đặc quyền. Quản trị viên kiểm soát mở nhóm, đóng chủ đề và thu hồi quyền khi nhân sự rời tổ chức. Saved Messages là vùng đệm cá nhân để gom chỉ đạo ngoài giờ rồi chuyển thành tác vụ chính thức.
- Phạm vi thao tác trực tiếp ở demo đã chốt: tra SOP/FAQ từ Resources và xem thông báo ticket trong Odoo. Mức độ triển khai toàn bộ quy tắc nhóm/chủ đề/Saved Messages còn ở câu hỏi mở của PRD.
