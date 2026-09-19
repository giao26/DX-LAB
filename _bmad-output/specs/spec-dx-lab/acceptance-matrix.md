# Ma trận nghiệm thu DX-LAB

## 1. Năng lực và bằng chứng chính

| Mã | Bằng chứng nghiệm thu bắt buộc |
| --- | --- |
| CAP-1 | Từ Portal mở được tổng hợp H, tổng hợp P, Resources và Dashboard D/I; liên kết sai quyền bị từ chối; SOP nháp không xuất hiện. |
| CAP-2 | Tìm và mở đúng SOP/FAQ đang hiệu lực; hiển thị phiên bản/trạng thái; AI không truy xuất bản chưa công bố. |
| CAP-3 | Phân công tạo một thông báo Odoo đúng nhóm và ticket; phát lại sự kiện không tạo bản sao; lỗi gửi có retry và trạng thái. |
| CAP-4 | Thiếu email, sai số điện thoại hoặc tệp sai loại không tạo ticket; dữ liệu hợp lệ tạo một mã/timestamp và một email xác nhận; xung đột khách hàng được đánh dấu. |
| CAP-5 | AI chỉ nhận mô tả; lưu ba giá trị loại; nhân viên phải xác nhận; AI timeout dùng loại khách chọn; sửa loại khác nhóm thu hồi quyền cũ và phân lại. |
| CAP-6 | Người bận bị bỏ qua; người ít lượt được chọn; bằng nhau quay vòng ID; mọi người bận thì FIFO; hai lệnh đồng thời không giữ cùng một nhân viên. |
| CAP-7 | Chưa xác nhận không thể xử lý; thiếu kết quả không thể đóng; chỉ người phụ trách đóng được; ngoài giờ tính từ ca sau; mọi thời gian chờ vẫn tính SLA; đóng không xóa cờ quá hạn. |
| CAP-8 | Đóng gửi một lời mời; token đoán từ mã ticket không dùng được; phản hồi lần hai bị từ chối; 1–2 sao tạo một việc cho trưởng nhóm; chưa phản hồi không thành điểm thấp. |
| CAP-9 | Nhân viên thấy danh sách nhóm đã che PII; chỉ người phụ trách thấy PII/tệp; trưởng nhóm thấy nhóm; trưởng phòng và giám đốc thấy toàn bộ; thu hồi quyền chặn cả liên kết cũ. |
| CAP-10 | Dashboard hiển thị ba chỉ số đầu là ticket mới, quá SLA và CSAT cùng các biểu đồ; dữ liệu mới xuất hiện ≤60 giây; bản chốt ngày chạy lại không tạo trùng và truy ngược được nguồn. |
| CAP-11 | Ba ticket đủ điều kiện tạo một phân tích; hai ticket không tạo; đúng 60 phút không tạo; trên 60 phút tạo; báo cáo chứa bước chậm, kỳ, số lượng và ticket dẫn chứng đã che dữ liệu. |
| CAP-12 | Chấp nhận và từ chối đều lưu người/thời điểm; chỉ chấp nhận mới tạo bản nháp; người duyệt có thể phê duyệt/từ chối trong Odoo; chỉ bản được duyệt xuất hiện ở Resources. |
| CAP-13 | Trên máy sạch, người mới chạy profile `core`, nạp fixture, sửa mẫu thông báo hoặc quy tắc và chạy kiểm thử; không tải model; lỗi hành vi làm kiểm thử thất bại. |

## 2. Hành trình trình diễn

### UJ-1 — Một ticket đi qua H→P→D→I

1. Mở DX-Portal và chỉ ra bốn không gian có thể bấm trực tiếp.
2. Mở một SOP đã duyệt trong Resources.
3. Gửi thử dữ liệu sai để chứng minh rào chắn không tạo ticket.
4. Gửi ticket hợp lệ và giữ nguyên mã ticket suốt demo.
5. Quan sát email xác nhận, AI đề xuất loại và phân công tạm.
6. Mở Odoo bằng tài khoản nhân viên được giao; xác nhận hoặc sửa loại và nhận trách nhiệm.
7. Chuyển sang Đang xử lý, ghi bước và thử đóng khi thiếu kết quả để chứng minh rào chắn.
8. Ghi kết quả, đóng ticket và kiểm tra email CSAT.
9. Mở Dashboard bằng tài khoản giám đốc; truy từ chỉ số về cùng ticket và chứng minh cập nhật trong 60 giây.

### UJ-2 — Khuyến nghị cải tiến có phê duyệt

1. Nạp hoặc xác nhận fixture được ghi nhãn với ba ticket Bảo hành quá SLA trong bảy ngày, cùng bước kiểm tra trên 60 phút.
2. Chạy đánh giá và mở báo cáo AI có ticket dẫn chứng, SOP nguồn và dữ liệu đã che.
3. Giám đốc chấp nhận khuyến nghị trên Dashboard.
4. AI tạo bản nháp thay đổi SOP; Odoo tạo việc cho người duyệt tri thức.
5. Chứng minh bản nháp chưa có trong Resources.
6. Người duyệt phê duyệt; phiên bản mới xuất hiện trong Resources và được phép chỉ mục cho AI.

### UJ-3 — Đóng góp nguồn mở

1. Checkout bản phát hành có phiên bản trên máy sạch.
2. Chạy hướng dẫn `core` và fixture mà không tải model AI.
3. Thay đổi một mẫu thông báo hoặc quy tắc nhỏ.
4. Chạy kiểm thử liên quan và chứng minh kiểm thử phát hiện một thay đổi sai.
5. Kiểm tra giấy phép, SBOM/phụ thuộc, changelog và hướng dẫn pull request.

## 3. Kiểm thử ranh giới bắt buộc

| Nhóm | Trường hợp ranh giới |
| --- | --- |
| Phân công | Hai ticket đến đồng thời; người vừa được giữ chỗ; mọi người bận; sửa loại sang nhóm mới; retry lệnh nhận trách nhiệm. |
| SLA | Nhận lúc nghỉ trưa; nhận ngoài giờ; có ngày nghỉ; đóng đúng hai giờ; đóng sau hai giờ; bước kiểm tra đang mở. |
| Sự kiện | Gửi trùng, đảo thứ tự, mất phản hồi sau khi Odoo đã commit, consumer thiếu một phiên bản và dựng lại projection. |
| Quyền | Nhân viên khác nhóm, nhân viên cùng nhóm chưa nhận, tài khoản đã thu hồi, giả mạo header định danh, guest token thiếu phạm vi. |
| AI | Timeout, kết quả trùng, kết quả đến sau khi job hết hạn, evidence thay đổi, model/prompt không đúng manifest, giám đốc từ chối trước khi kết quả muộn đến. |
| SOP | Mở công việc đã superseded, duyệt hai lần, lỗi chỉ mục sau công bố, bản nháp bị yêu cầu qua Resources. |
| Tệp | Sai chữ ký tệp, MIME giả, lớn hơn 10 MB, đường dẫn đoán được, người không có quyền tải xuống. |
| CSAT | Token hết hạn, dùng lần hai, đoán bằng mã ticket, 1–2 sao gửi trùng, chưa phản hồi. |
| Báo cáo | Bản chốt chạy hai lần, phạm vi nhóm rỗng, scope không hợp lệ, Dashboard cũ quá 60 giây, chỉ số trước/sau dùng khác phiên bản. |

## 4. Cổng chất lượng phát hành

- Kiểm thử đơn vị cho quy tắc miền: phân công, trạng thái, SLA, CSAT và điều kiện điểm nghẽn.
- Kiểm thử tích hợp PostgreSQL, migration, outbox/inbox, sao lưu và khôi phục mẫu.
- Kiểm thử hợp đồng OpenAPI, JSON Schema sự kiện, RLS báo cáo và dữ liệu xuất.
- Kiểm thử end-to-end mỏng cho UJ-1 và UJ-2; AI mặc định dùng fixture hoặc fake xác định.
- Kiểm tra accessibility: bàn phím, focus, nhãn, tóm tắt lỗi, nội dung thay thế biểu đồ, 320 CSS px và zoom 200%; kiểm tra thật widget Odoo trên trình duyệt điện thoại.
- Build sạch các profile `core`, `demo`, `ai`; khóa lockfile, image digest, OCA commit và model digest.
- Kiểm tra AGPL-3.0, SPDX/header, LICENSE/NOTICE, giấy phép phụ thuộc và mô hình, README, changelog và gói phát hành SemVer định dạng mở.
