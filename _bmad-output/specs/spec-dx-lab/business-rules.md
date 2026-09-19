# Quy tắc nghiệp vụ DX-LAB

## 1. Vai trò và phạm vi dữ liệu

| Vai trò | Danh sách ticket | Chi tiết liên hệ và tệp | Quyền nghiệp vụ |
| --- | --- | --- | --- |
| Khách hàng | Không có cổng theo dõi trong bản demo | Chỉ gửi dữ liệu qua form và phản hồi qua liên kết CSAT | Tạo ticket, gửi một đánh giá cho ticket đã đóng |
| Nhân viên trong nhóm | Ticket thuộc nhóm, đã che dữ liệu liên hệ | Chỉ ticket mà mình đã nhận trách nhiệm | Xác nhận loại, xử lý và đóng ticket mình phụ trách |
| Trưởng nhóm | Ticket và chi tiết trong nhóm mình | Toàn bộ chi tiết trong nhóm | Rà soát CSAT 1–2 sao |
| Trưởng phòng | Toàn bộ ticket | Toàn bộ chi tiết | Theo dõi và điều phối giữa các nhóm |
| Giám đốc | Toàn bộ ticket và chỉ số | Dữ liệu cần thiết cho quyết định | Chấp nhận hoặc từ chối khuyến nghị cải tiến |
| Người duyệt tri thức | Công việc SOP được giao | Bản nháp và nguồn dẫn chứng | Phê duyệt hoặc từ chối công bố SOP |

Keycloak `sub` là định danh người dùng xuyên hệ thống. Email chỉ là thuộc tính liên hệ. P quyết định phạm vi quyền cho API, Odoo, dashboard, tệp và dữ liệu xuất; thiếu phạm vi hợp lệ phải từ chối mặc định.

## 2. Tiếp nhận ticket

- Bắt buộc: họ tên, số điện thoại, email, loại khách chọn và mô tả.
- Loại yêu cầu gồm `Khiếu nại`, `Tư vấn`, `Bảo hành`.
- Cho phép tối đa một tệp ảnh hoặc PDF, không quá 10 MB; kiểm tra phần mở rộng, chữ ký tệp, loại nội dung và kích thước.
- Mã ticket và thời điểm nhận do hệ thống cấp. ID nội bộ là UUID; mã `TCK-...` chỉ dùng cho người đọc và không cấp quyền truy cập.
- Số điện thoại chuẩn hóa khớp khách cũ thì liên kết hồ sơ đó. Số mới tạo khách mới. Dữ liệu liên hệ xung đột được đánh dấu rà soát, không tự ghi đè.
- Một lần tạo hợp lệ sinh đúng một ý định email xác nhận; trạng thái và lần thử gửi được lưu.

## 3. Phân loại và phân công

- AI phân loại chỉ nhận mô tả tự do; không nhận loại khách chọn, tên, email, số điện thoại hoặc tệp.
- Hồ sơ giữ riêng `loại khách chọn`, `loại AI đề xuất` và `loại nhân viên xác nhận`, cùng người và thời điểm xác nhận.
- Phân loại là công việc bất đồng bộ. Nếu AI lỗi hoặc hết hạn, loại khách chọn được dùng để phân công tạm nhưng nhân viên vẫn phải xác nhận trước khi xử lý.
- Chọn nhân viên sẵn sàng trong nhóm của loại tạm thời; người đang có ticket hoạt động hoặc giữ chỗ bị loại.
- Ưu tiên số lượt nhận chính thức thấp nhất. Khi bằng nhau, chọn theo vòng ID nhân viên tăng dần kể từ người được chọn gần nhất.
- Chọn người và giữ chỗ diễn ra nguyên tử. Mỗi nhân viên có tối đa một ticket hoạt động hoặc giữ chỗ.
- Khi mọi người bận, ticket xếp FIFO theo thời điểm nhận rồi ID.
- Bộ đếm chỉ tăng khi nhân viên xác nhận loại và nhận trách nhiệm. Nếu sửa loại làm đổi nhóm, giữ chỗ cũ được thu hồi, ticket được phân lại và lịch sử chuyển giao được ghi.

## 4. Vòng đời và SLA

```text
WAITING → IN_PROGRESS → CLOSED
```

- Không được vào `IN_PROGRESS` trước khi người nhận xác nhận loại cuối cùng và trách nhiệm.
- Chỉ người phụ trách hiện tại được đóng ticket; kết quả xử lý là bắt buộc.
- Ticket đã đóng không mở lại trong bản demo. Công việc tiếp theo tạo ticket mới liên kết ticket cũ.
- SLA là hai giờ làm việc từ lúc tiếp nhận hợp lệ tới lúc đóng.
- Lịch làm việc: thứ Hai–thứ Sáu, 08:00–12:00 và 13:00–17:00, múi giờ `Asia/Ho_Chi_Minh`, trừ ngày nghỉ cấu hình.
- Ticket ngoài giờ bắt đầu tính ở ca kế tiếp. Thời gian chờ phân công, kiểm tra và linh kiện vẫn tính SLA.
- Dấu quá hạn được giữ sau khi đóng. Đính chính hồ sơ đóng phải lưu người sửa, thời điểm và giá trị trước/sau.
- Mỗi loại có quy trình phiên bản hóa riêng; Bảo hành phải có ít nhất một bước kiểm tra ghi thời điểm bắt đầu và kết thúc.

## 5. Đóng ticket và CSAT

- Sự kiện đóng tạo đúng một email kết quả và lời mời CSAT; retry không tạo ý định gửi mới.
- Liên kết CSAT dùng mã mờ, hết hạn, chỉ dùng một lần và gắn với đúng ticket; không dùng mã ticket làm quyền.
- CSAT nhận 1–5 sao và nhận xét tùy chọn. Chưa phản hồi là trạng thái riêng, không được tính như điểm 0.
- Điểm 1–2 tạo đúng một công việc rà soát cho trưởng nhóm của ticket.
- Chỉ số CSAT chính là tỷ lệ phản hồi 4–5 sao trên số phản hồi hợp lệ và luôn đi cùng số lượt phản hồi. Điểm trung bình 1–5, nếu hiển thị, phải có tên riêng.

## 6. Dashboard và bản chốt ngày

- Chỉ số gồm ticket mới, tồn đọng, đã đóng, đúng/quá SLA, thời gian từng bước và CSAT.
- Cho phép lọc theo thời gian, trạng thái, loại yêu cầu và truy ngược từ chỉ số tới ticket trong phạm vi quyền.
- Dữ liệu đã ghi phải xuất hiện trong 60 giây mà không sửa báo cáo thủ công.
- Bản chốt ngày chạy idempotent, lưu `as_of`, kỳ dữ liệu, phạm vi nhóm, phiên bản định nghĩa chỉ số và dấu truy vết ticket/sự kiện nguồn.
- Dashboard, bản chốt ngày và dữ liệu cấp cho AI dùng cùng định nghĩa do P sở hữu.

## 7. Phát hiện điểm nghẽn và cải tiến SOP

Điểm nghẽn chỉ được tạo khi đồng thời thỏa:

1. Có ít nhất ba ticket `Bảo hành`.
2. Ticket được tiếp nhận trong bảy ngày lịch gần nhất.
3. Tất cả đều quá SLA hai giờ làm việc.
4. Cùng có một bước kiểm tra kéo dài **trên** 60 phút làm việc.

Đúng 60 phút hoặc chỉ hai ticket không kích hoạt. Bước còn mở được tính tới thời điểm đánh giá. Cùng một khóa bằng chứng chỉ tạo một khuyến nghị.

- P xác định điều kiện và bằng chứng; AI chỉ giải thích và soạn nội dung.
- Dữ liệu cho AI được tổng hợp hoặc che định danh và chỉ tham chiếu SOP đã công bố kèm phiên bản.
- Giám đốc chấp nhận hoặc từ chối khuyến nghị; quyết định và người quyết định được lưu.
- Chấp nhận tạo công việc AI soạn bản nháp SOP. Bản nháp được Odoo chuyển tới người duyệt tri thức.
- Bản nháp không xuất hiện trong Resources hoặc chỉ mục AI. Chỉ phiên bản được duyệt mới được công bố.
- Đánh giá cải tiến so sánh tỷ lệ Bảo hành quá hạn trước/sau nhưng không tự khẳng định quan hệ nhân quả.

## 8. Sự kiện, kiểm toán và vận hành

- Lệnh tạo hoặc side effect có `Idempotency-Key`; cập nhật bản ghi có điều kiện phiên bản.
- Thay đổi P và sự kiện outbox được ghi trong cùng giao dịch. Consumer có inbox bền vững, khử trùng theo `event_id` và theo dõi `aggregate_version`.
- Odoo chỉ xác nhận nhận sự kiện sau khi inbox và projection đã commit; mất phản hồi dẫn tới retry an toàn.
- Trạng thái, phân công, xác nhận loại, phê duyệt, đính chính và xuất bản SOP đều có audit nối tiếp với tác nhân, ứng dụng gọi, thời gian UTC và giá trị trước/sau.
- Log vận hành không chứa nội dung khách hàng, tệp, token hoặc prompt.
- Dead-letter, outbox kẹt, dashboard quá cũ và sao lưu hoặc bản chốt thất bại phải tạo cảnh báo/công việc vận hành trong ngày.

## 9. Sao lưu và dữ liệu mở

- 00:30 mỗi ngày: sao lưu cơ sở dữ liệu P, Odoo, Keycloak, Superset; tệp đính kèm; Odoo filestore; tri thức đã công bố.
- Mã hóa và lưu bản thứ hai ngoài máy; ghi checksum, mã đối tượng/phiên bản và kết quả.
- Giữ 7 bản ngày, 4 bản tuần, 12 bản tháng; kiểm tra và ghi bằng chứng khôi phục hằng tháng.
- Qdrant được tái tạo từ SOP đã công bố và manifest embedding; mô hình/cache được tái tạo từ manifest khóa phiên bản.
- Dữ liệu nghiệp vụ xuất UTF-8 CSV hoặc JSON kèm ID ổn định, schema/từ điển trường và nguồn gốc. SOP đã duyệt xuất bằng định dạng tài liệu mở kèm thông tin phê duyệt.

## 10. Thuật ngữ

| Thuật ngữ | Nghĩa |
| --- | --- |
| Ticket | Hồ sơ yêu cầu hỗ trợ cùng người phụ trách, trạng thái, lịch sử và phản hồi. |
| Người phụ trách | Nhân viên đã nhận trách nhiệm xử lý ticket tại một thời điểm. |
| Bước kiểm tra | Công đoạn có mốc bắt đầu/kết thúc và thời lượng theo giờ làm việc. |
| Resources | Thư viện P.A.R.A chứa SOP/FAQ đã được phê duyệt. |
| SOP | Phiên bản quy trình thao tác chuẩn được quản lý vòng đời và công bố. |
| Bản chốt ngày | Bộ chỉ số cuối ngày có phạm vi, phiên bản định nghĩa và dấu truy vết. |
