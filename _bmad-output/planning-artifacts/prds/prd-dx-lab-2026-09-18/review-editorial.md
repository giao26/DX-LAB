# Rà soát biên tập PRD DX-OS

Phạm vi: cấu trúc trước, diễn đạt sau. Đọc `prd.md` và `addendum.md` ngày 2026-09-18. Chỉ ghi các vấn đề ảnh hưởng đến cách hiểu hoặc khả năng dùng PRD ở bước thiết kế.

## Cấu trúc

### HIGH — Trình tự phân loại, phân công và nhận trách nhiệm chưa thống nhất

- `prd.md` §4.2 mở đầu nói AI phân loại → nhân viên xác nhận → ticket được phân công; FR-5 lại giao việc xác nhận cho **người nhận ticket**, tức người này phải được phân công trước. UJ-1 và FR-3 cũng đặt thông báo Odoo sau khi đã có người được giao. Người thiết kế không thể xác định khi nào chọn nhóm và nhân viên, hoặc ai thấy ticket trong lúc chờ xác nhận.
- **Đề nghị sửa:** mô tả một chuỗi thống nhất, chẳng hạn tạo ticket → AI gợi ý loại và nhóm tạm thời → phân công người sẵn sàng → thông báo người được giao → người đó xác nhận/sửa loại trước khi bắt đầu xử lý. Nếu sửa loại làm thay đổi nhóm, nêu yêu cầu điều phối lại và lịch sử chuyển giao. Cập nhật cùng lúc UJ-1, lời dẫn §4.2, FR-3, FR-5 và FR-6.

### MEDIUM — SM-1 tuyên bố thông mạch đến [I] nhưng bằng chứng chỉ đến FR-10

- `prd.md` §7 SM-1 gọi UJ-1 là H→P→D→I, song mục kiểm tra ghi FR-1 đến FR-10, còn [I] được đặc tả ở FR-11/12 và UJ-2. UJ-1 chỉ có AI phân loại ở FR-5; người đọc có thể tưởng SM-1 chứng minh được toàn bộ khả năng phân tích, đề xuất và phê duyệt.
- **Đề nghị sửa:** nêu rõ [I] trong SM-1 là phân loại có người xác nhận theo FR-5; UJ-2/SM-2 chứng minh phần AI phân tích và cải tiến. Giữ UJ-1 và UJ-2 như hai cảnh nối tiếp, tránh đòi một ticket mới kích hoạt ngưỡng ba ticket.

### MEDIUM — Định nghĩa CSAT và phép đo chưa nhất quán

- `prd.md` §3 định nghĩa CSAT là phản hồi 1–5 sao, FR-10 nói “điểm hoặc tỷ lệ”, SM-3 nói CSAT kèm lượt đánh giá. Vì vậy một đội có thể xây điểm trung bình, đội khác xây tỷ lệ 4–5 sao mà vẫn cùng gọi là CSAT. Người dùng đã được giải thích CSAT là tỷ lệ lượt 4–5 sao trên số phản hồi.
- **Đề nghị sửa:** định nghĩa CSAT trong §3 và FR-10 là **tỷ lệ đánh giá 4–5 sao trên tổng lượt đánh giá hợp lệ**, luôn hiển thị mẫu số; có thể hiển thị điểm trung bình 1–5 như chỉ số phụ, đặt tên riêng. Giữ thống nhất trong SM-3 và phụ lục.

## Diễn đạt và thuật ngữ

### MEDIUM — Vai trò “trưởng nhóm” xuất hiện ngoài danh sách người dùng

- `prd.md` §2.1 có “trưởng phòng”, FR-8 giao việc khi nhận 1–2 sao cho “trưởng nhóm”, còn `addendum.md` cũng nói “trưởng nhóm”. Hai chức danh có thể là hai quyền khác nhau; đặc biệt FR-9 chỉ cấp quyền toàn bộ cho trưởng phòng/giám đốc.
- **Đề nghị sửa:** dùng “trưởng phòng” xuyên suốt nếu đó là người được chốt quyền, hoặc định nghĩa “trưởng nhóm” là vai trò riêng với phạm vi xem và xử lý tương ứng. Không để tên vai trò quyết định quyền phát sinh ngầm trong điều kiện kiểm tra.

### LOW — Chỉ mục giả định là hữu ích nhưng khó theo dõi khi văn bản đổi vị trí

- `prd.md` §9 tham chiếu số mục (§2.2, §5, §6.2) thay cho mã ổn định; FR-7 đã có ID nhưng phần còn lại sẽ đổi khi thêm mục. Hai giả định liên quan đề thi chi tiết cũng nằm rải trong mở đầu, §6.2 và §8.
- **Đề nghị sửa:** gán A-1…A-5 cho giả định, giữ một dòng/giả định với chủ sở hữu và điều kiện xác nhận; tại đoạn văn gắn mã tương ứng. Câu hỏi đề thi chi tiết nên có mốc rà soát cụ thể một nơi ở §8.

## Điểm tốt nên giữ

- FR-1…FR-13 đánh số liên tục, nhóm theo H/P/D/I rồi đóng góp, dễ chuyển sang epic/story.
- UJ-2 tách dữ liệu mẫu lịch sử khỏi ticket mới và điều kiện ngưỡng được nêu rõ.
- `addendum.md` giữ lựa chọn công nghệ và chiều sâu H ở ngoài PRD chính; ranh giới này giúp yêu cầu sản phẩm dễ đọc.

## Rà soát sau chỉnh sửa

Đã đọc lại PRD và phụ lục sau khi cập nhật các luồng phân loại/phân công, khớp khách hàng, phân quyền, ngưỡng 60 phút, Bản chốt ngày và gửi thông báo. Không thấy mâu thuẫn chặn thiết kế ở khớp khách hàng, phạm vi xem chi tiết, metadata bản chốt hay cơ chế thử gửi lại. Còn hai điểm cần sửa trước khi khóa PRD:

1. **HIGH — Ngưỡng 60 phút trong UJ-2/FR-11/SM-2 là một quyết định mới chưa có trong chỉ mục giả định.** Quy tắc đã chốt trước đó chỉ là ba ticket bảo hành quá hạn trong bảy ngày cùng chậm tại một bước kiểm tra. Phụ lục hiện ghi 60 phút như “đã chốt”, trong khi PRD chưa ghi căn cứ xác nhận. Cần xác nhận với product owner hoặc đánh dấu `[ASSUMPTION]`, đưa vào §9 với chủ sở hữu và mốc giải quyết; nếu chưa xác nhận thì không đặt nó thành điều kiện nghiệm thu cứng của SM-2.
2. **MEDIUM — Chỉ số công bằng ở FR-6 đổi tên giữa hai câu.** Quy tắc chọn người dựa trên “số lượt đã được giao”, nhưng điều kiện chuyển nhóm nói lượt cũ “không tính thành một ticket đã xử lý”. “Đã giao” và “đã xử lý” là hai bộ đếm khác nhau. Cần chọn một bộ đếm cho thuật toán, nói rõ lần phân công tạm bị thu hồi có tính lượt hay không, rồi dùng cùng tên trong FR-6 và phụ lục.
