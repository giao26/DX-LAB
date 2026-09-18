# Đối chiếu Chương 7 [D] với PRD DX-OS

Nguồn: năm đoạn người dùng đính kèm về các mục 7.2, 7.2.3–7.2.4, 7.3, 7.4 và Data Fabric; đối chiếu với `prd.md` và `addendum.md`. Đây là ghi chú rà soát đầu vào, không phải yêu cầu áp nguyên văn mọi mô tả trong tài liệu nguồn. Các quyết định trực tiếp sau đó của người dùng được ưu tiên: nhân viên chỉ xem ticket của nhóm, trưởng phòng/giám đốc xem toàn bộ; chốt số liệu mỗi ngày để phát hiện vấn đề kịp thời; bản demo trình bày thiết kế và lịch sao lưu, không khôi phục trực tiếp.

## Đã phản ánh đúng trong PRD

- **7.2.1–7.2.3, DSS:** FR-10 nêu dashboard cập nhật từ ticket, bộ lọc thời gian/trạng thái/loại, truy từ chỉ số tới ticket; FR-7 và FR-11 nêu SLA cùng bước kiểm tra; FR-9 áp phân quyền cho API và báo cáo. Mục 7 và SM-3 đo SLA, tỷ lệ quá hạn, thời gian bước, CSAT. PRD phân biệt tỷ lệ CSAT 4–5 sao với điểm trung bình 1–5, khắc phục sự mơ hồ của nguồn.
- **7.2.4, chốt kỳ:** FR-10 yêu cầu bản chốt ngày có thời điểm, bên cạnh dashboard cập nhật trong ngày; phù hợp với lựa chọn mới nhất của người dùng. Không nên thay bằng snapshot tháng như ví dụ Google Sheets/Apps Script.
- **7.3.1–7.3.3, chủ quyền và PARA:** §5 yêu cầu xuất dữ liệu nghiệp vụ và tri thức đã duyệt ở định dạng mở, có mã định danh và nguồn gốc; FR-1/2, FR-12 và phụ lục giữ SOP/FAQ đã duyệt trong Resources. Tệp gốc của ticket vẫn thuộc hồ sơ ticket, không tự động biến thành tài liệu công bố. PARA là cách tổ chức tài liệu, không phải nơi chuyển bản ghi ticket khi đóng.
- **7.3.4–7.3.5, bảo vệ:** §5 yêu cầu thiết kế lịch sao lưu bao phủ ticket, tệp đính kèm, SOP, bản thứ hai, thời gian giữ và kiểm tra bản sao; §6.2 loại thao tác khôi phục trực tiếp khỏi demo, đúng lựa chọn người dùng.
- **7.4 và đoạn Data Fabric:** §6.2 đặt data lake, lakehouse, semantic layer, data fabric quy mô doanh nghiệp ngoài cam kết bản dự thi. Đây là lộ trình tương lai, không phải điều kiện để hoàn thành lát cắt DX-Ticket.

## Khoảng trống thực chất nên cân nhắc trước khi khóa PRD

1. **Bản chốt ngày chưa nêu khả năng đối soát.** FR-10 mới yêu cầu lưu chỉ số và thời điểm chốt. Theo mục 7.2.4, bản chốt còn cần nhận dạng kỳ, định nghĩa/phiên bản cách tính, phạm vi dữ liệu và quyền truy vết tới ticket/sự kiện nguồn. Không cần sao chép toàn bộ bảng ticket mỗi ngày; ít nhất phải có dấu nguồn để giải thích khi dashboard hiện tại khác số chốt. Đây là yêu cầu hành vi dữ liệu quan trọng cho một demo DSS có thể kiểm chứng. Có thể bổ sung một điều kiện kiểm tra vào FR-10.
2. **Thiết kế sao lưu chưa có lịch cụ thể trong PRD/phụ lục.** §5 hiện ghi rằng thiết kế *phải nêu* lịch, phạm vi, vị trí và thời gian giữ, nhưng không ghi đề xuất đã thảo luận: sao lưu mỗi ngày, bản thứ hai tách máy chủ, giữ 7 bản ngày/4 bản tuần/12 bản tháng và thử khôi phục định kỳ. Vì người dùng chỉ yêu cầu *trình bày thiết kế và lịch*, việc thiếu lịch cụ thể làm đầu ra demo chưa hoàn toàn reviewable. Nên đưa số liệu này vào phụ lục dưới nhãn đề xuất vận hành có thể cấu hình, tránh biến thời gian giữ thành quy định cứng khi chưa có chính sách doanh nghiệp.
3. **Từ điển chỉ số tối thiểu chưa được gọi tên.** Các phép đo đã liệt kê nhưng chưa có một điều kiện kiểm tra bảo đảm cùng định nghĩa “ticket mới”, “tồn đọng”, “quá SLA”, “thời gian bước” và mẫu số CSAT được dùng ở dashboard, bản chốt ngày và đầu vào AI. Mục 7.2 và tài liệu Data Fabric đều muốn tránh nhiều nơi tính khác nhau; bản dự thi chỉ cần một bộ định nghĩa chỉ số nhỏ, chưa cần Cube/Rill hay OpenMetadata. Có thể thêm vào FR-10 hoặc §5.

## Không đưa thành yêu cầu MVP

- Cấm PowerPoint/Excel trong họp, bắt buộc mọi nhân sự xem dashboard chung, hoặc nhúng dashboard toàn công ty lên trang chủ: đây là chính sách vận hành doanh nghiệp trong mục 7.2.3, mâu thuẫn nếu hiểu là mọi người xem toàn bộ dữ liệu; PRD phải giữ phân quyền theo nhóm và vai trò đã chốt.
- Looker Studio, Google Sites/Sheets/Apps Script, NAS sản phẩm cụ thể, MinIO, BigQuery, Snowflake, Airbyte, dbt, Great Expectations, OpenMetadata, Cube/Rill: là ví dụ kỹ thuật hoặc lộ trình. Đề án nguồn mở của người dùng chọn thành phần khác; lựa chọn công cụ và giấy phép thuộc bước kiến trúc.
- “PDF không thể sửa”, “đồng bộ NAS một chiều ngăn mọi ransomware”, “khôi phục 100%”: các khẳng định tuyệt đối trong tài liệu nguồn không nên chuyển thành tiêu chí nghiệm thu. Nên mô tả bảo vệ bằng quyền truy cập, kiểm tra toàn vẹn, bản sao tách biệt và thử khôi phục.
- Kho dữ liệu định dạng kép toàn bộ, báo cáo pháp lý có chữ ký, NAS ngoại tuyến 3-2-1, data lake/lakehouse/data fabric, tự phục vụ BI toàn doanh nghiệp: tương lai hoặc phụ thuộc bối cảnh triển khai, không cần cho demo DX-Ticket 2026.
