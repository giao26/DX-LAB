# Epic 3 Context: Điều hành bằng dữ liệu có thể truy vết

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Cung cấp cho Giám đốc và người quản lý khả năng theo dõi trực quan các chỉ số vận hành thống nhất, biểu đồ xu hướng, bộ lọc linh hoạt và lịch sử bản chốt ngày trên Dashboard D; đồng thời đảm bảo mọi con số tổng hợp đều có thể truy vết ngược về tập ticket nguồn và sự kiện gốc theo đúng phạm vi phân quyền, ngăn chặn lộ lọt dữ liệu nhạy cảm và làm cơ sở dữ liệu tin cậy cho việc điều hành cũng như cải tiến quy trình.

## Stories

- Story 3.1: Người quản lý xem bộ chỉ số thống nhất theo đúng phạm vi
- Story 3.2: Giám đốc theo dõi và khoan sâu trên Dashboard D
- Story 3.3: Người quản lý đối chiếu bản chốt ngày và dữ liệu nguồn

## Requirements & Constraints

- Hệ thống cung cấp các chỉ số vận hành cốt lõi gồm: ticket mới, tồn đọng, đã đóng, đúng SLA, quá SLA, thời gian xử lý từng bước và CSAT. Mỗi chỉ số phải gắn liền với phiên bản định nghĩa, kỳ dữ liệu, đơn vị và mẫu số tường minh.
- CSAT được chuẩn hóa là tỷ lệ phản hồi 4–5 sao trên tổng số phản hồi hợp lệ, bắt buộc luôn đi kèm số lượt phản hồi thực tế. Trạng thái "Chưa phản hồi" không được tính là 0 sao hay phản hồi tiêu cực. Điểm trung bình 1–5 (nếu hiển thị) phải có tên gọi riêng biệt để không gây nhầm lẫn với tỷ lệ phần trăm CSAT.
- Quyền truy cập báo cáo áp dụng nguyên tắc tối thiểu và đóng theo mặc định (deny-by-default): Trưởng nhóm chỉ xem dữ liệu trong các nhóm được phân công phụ trách; Trưởng phòng và Giám đốc xem trong phạm vi phòng ban hoặc toàn tổ chức. Khi quyền bị thiếu, không xác định hoặc bị thu hồi, hệ thống từ chối toàn bộ truy cập; URL hoặc phiên cũ không được tiếp tục đọc dữ liệu. Bộ lọc giao diện chỉ phục vụ trình bày, không thay thế kiểm soát quyền; thao tác thay đổi tham số không được làm lộ số lượng, nhãn hay dữ liệu ngoài phạm vi.
- Thay đổi trạng thái ticket vừa được commit phải phản ánh lên Dashboard D trong vòng tối đa 60 giây mà không cần can thiệp dữ liệu thủ công.
- Cho phép người dùng khoan sâu từ KPI, điểm biểu đồ hoặc danh sách tóm tắt về danh sách ticket cấu thành trong kỳ và bộ lọc hiện tại. Mỗi dòng ticket hiển thị mã định danh, trạng thái, loại yêu cầu, tình trạng SLA và liên kết mở chi tiết theo đúng quyền. Không đưa thông tin định danh cá nhân (PII) của khách hàng vào biểu đồ hoặc danh sách tổng hợp khi không cần thiết.
- Tác vụ bản chốt ngày chạy tự động sau khi kết thúc giờ làm việc (mặc định sau 17:00 theo `Asia/Ho_Chi_Minh`), tạo bản chốt bất biến cho từng phạm vi nhóm quản lý, ghi nhận mốc thời gian chốt, kỳ dữ liệu, mã nhóm, phiên bản định nghĩa chỉ số và thời điểm hoàn tất. Tác vụ phải bảo đảm tính idempotent: việc chạy lại cùng ngày, cùng phạm vi và cùng phiên bản định nghĩa không được tạo bản chốt trùng hoặc đếm lặp ticket.
- Khi so sánh chỉ số giữa các ngày hoặc trước/sau thay đổi, chỉ hiển thị xu hướng và tỷ lệ biến động khi hai mốc dùng chung một phiên bản định nghĩa chỉ số; nếu khác phiên bản, giao diện phải cảnh báo rõ sự khác biệt về cơ sở tính toán. Không tự quy kết tương quan số liệu thành quan hệ nhân quả.
- Cho phép người có thẩm quyền xuất bản chốt sang định dạng UTF-8 CSV hoặc JSON chuẩn có ID ổn định, từ điển trường, kỳ, phạm vi, phiên bản định nghĩa và nguồn gốc; áp dụng đồng nhất chính sách phân quyền và che dữ liệu như khi xem trực tuyến.

## Technical Decisions

- P là dịch vụ duy nhất sở hữu các SQL reporting views phiên bản hóa, logic xác định phạm vi phân quyền và tác vụ định kỳ tạo bản chốt ngày. Cả Dashboard D, bản chốt ngày và tác vụ phân tích điểm nghẽn đều dùng chung định nghĩa chỉ số do P quản lý.
- Superset truy cập cơ sở dữ liệu qua một tài khoản database báo cáo riêng biệt có quyền chỉ đọc (read-only) giới hạn trên các reporting views và cột chỉ số được phê duyệt; tuyệt đối không thể đọc các bảng dữ liệu nội bộ của P, bảng lưu PII hay tệp đính kèm.
- Next.js Web/BFF đảm nhiệm vai trò biên ủy quyền ứng dụng: BFF yêu cầu P cấp một grant báo cáo ngắn hạn có chữ ký chứa chính xác danh sách mã nhóm được phép, sau đó ánh xạ vào mệnh đề Row-Level Security (RLS) của Superset guest token. BFF không được tự ý bổ sung nhóm ngoài grant của P; nếu thiếu hoặc sai lệch phạm vi, P từ chối toàn bộ.
- Caddy đóng vai trò điểm tiếp nhận (ingress) công khai duy nhất; đối với Superset, Caddy chỉ mở đường dẫn nhúng `/analytics/*` cho trình duyệt. Giao diện quản trị Superset và các API đặc quyền được cô lập hoàn toàn trong mạng nội bộ Docker.
- Mọi thay đổi dữ liệu, truy vấn báo cáo và thao tác xuất file đều được ghi nhận vào nhật ký kiểm toán (audit log) có cấu trúc với định danh người thực hiện (`sub`), mốc thời gian UTC, correlation/causation ID và giá trị trước/sau. Log không ghi nhận PII, token hay nội dung nhạy cảm.
- Khi dữ liệu dashboard chưa được làm mới trong 60 giây hoặc tác vụ bản chốt ngày gặp sự cố, hệ thống phải kích hoạt cảnh báo vận hành ngay trong ngày, lưu nguyên nhân kỹ thuật đã làm sạch và số lần thử lại; giao diện hiển thị rõ mốc thời gian cập nhật gần nhất và nút thử lại, không trình bày dữ liệu cũ như số liệu mới.
- Toàn bộ mốc thời gian được lưu trữ chuẩn UTC trong cơ sở dữ liệu và chuyển đổi sang múi giờ `Asia/Ho_Chi_Minh` khi hiển thị trên giao diện người dùng và bản chốt ngày.

## UX & Interaction Patterns

- Sử dụng ngôn ngữ hình ảnh "Công nghệ mở / Xanh tin cậy": màu chủ đạo cobalt `#2854E8`, màu nhấn cyan `#16B8C9`, chữ màu mực đậm `#17233F`, bề mặt thẻ trắng trên nền trang `#F5F8FF` với đường viền mảnh 1 px và bóng đổ nhẹ. Màu cyan đóng vai trò nhận diện phụ và luồng H/P/D/I, không biểu thị trạng thái thành công. Màu sắc không phải tín hiệu duy nhất để phân biệt trạng thái hoặc SLA.
- Bố cục trang ưu tiên thị giác hàng đầu cho ba thẻ KPI: **Ticket mới**, **Ticket quá SLA** và **CSAT** (đảm bảo đọc rõ ràng từ xa trên màn hình trình chiếu). Tiếp theo là các biểu đồ phân tích (xu hướng tiếp nhận, phân bổ trạng thái, thời gian xử lý) và bảng danh sách ticket nguồn phục vụ khoan sâu. Biểu đồ có độ tương phản và phân cấp thị giác thấp hơn ba thẻ KPI.
- D và I là hai phân hệ nằm trong cùng một ứng dụng Dashboard dành cho Giám đốc; chuyển đổi qua lại giữa D và I giữ nguyên ngữ cảnh bộ lọc và phạm vi đang xem, có đường dẫn rõ ràng quay lại bằng chứng gốc.
- Khi người dùng thao tác bộ lọc (thời gian, trạng thái, loại yêu cầu), ba KPI, biểu đồ và danh sách ticket nguồn cùng thay đổi đồng bộ theo một phạm vi; giữ tiêu điểm (focus) tại bộ lọc và thông báo số lượng kết quả cho công nghệ hỗ trợ, không tự ý nhảy focus về đầu trang.
- Mọi biểu đồ trực quan đều phải có bảng dữ liệu hoặc phần mô tả văn bản tương đương chứa đầy đủ giá trị, kỳ, đơn vị và mẫu số, đảm bảo tiếp cận đầy đủ qua bàn phím và trình đọc màn hình.
- Xử lý trạng thái rỗng và lỗi tải: Khi không có dữ liệu trong kỳ lọc, KPI hiển thị giá trị phù hợp cùng mẫu số, giao diện giải thích "Chưa có ticket trong kỳ đã chọn" và dẫn lối điều chỉnh bộ lọc, tuyệt đối không tạo số liệu hoặc biểu đồ giả. Khi tải chậm, duy trì khung bố cục và không đưa giá trị cũ về 0. Khi lỗi tải hoặc dữ liệu cũ, hiển thị thời điểm dữ liệu mới nhất cùng hành động thử lại.
- Thiết kế thích ứng (Responsive): Hỗ trợ mượt mà trên desktop (từ 1024 px), tablet (768–1023 px) và mobile (dưới 768 px xếp một cột dọc). Đảm bảo co giãn nội dung hoàn hảo tại độ rộng 320 CSS px và mức phóng to 200% mà không phát sinh thanh cuộn ngang đối với các tác vụ chính. Vùng bấm tối thiểu 24×24 CSS px (ưu tiên 44×44 CSS px trên màn hình cảm ứng).

## Cross-Story Dependencies

- **Phụ thuộc vào Epic 1 và Epic 2:** Kế thừa luồng dữ liệu ticket, các bước quy trình, cách tính SLA, kết quả CSAT và mô hình phân quyền nhóm/vai trò từ Epic 1; kế thừa vỏ bọc điều hướng Portal và liên kết không gian H/P/D/I từ Epic 2. Tái sử dụng các ranh giới này để truy xuất dữ liệu mà không xây dựng thêm cơ chế quản lý ticket hay xác thực mới.
- **Quan hệ giữa các Story trong Epic 3:**
  - Story 3.1 đóng vai trò nền tảng dữ liệu và bảo mật: xây dựng SQL reporting views phiên bản hóa trong P, cơ chế cấp grant phạm vi nhóm và quy tắc RLS cho tài khoản báo cáo.
  - Story 3.2 xây dựng giao diện hiển thị: hiện thực hóa ba thẻ KPI, biểu đồ xu hướng, bộ lọc đồng bộ và luồng khoan sâu về ticket trên Next.js Web/BFF dựa trên grant và views từ Story 3.1, đáp ứng yêu cầu cập nhật dưới 60 giây.
  - Story 3.3 tận dụng định nghĩa chỉ số và reporting views của Story 3.1 để xây dựng tác vụ nền chốt dữ liệu cuối ngày, lưu trữ bản chốt bất biến và cung cấp tính năng đối chiếu, so sánh lịch sử cho Story 3.2.
- **Tiền đề cho Epic 4:** Bộ chỉ số thống nhất (đặc biệt là ticket bảo hành quá SLA và thời gian Bước kiểm tra vượt ngưỡng 60 phút làm việc) cùng khả năng truy vết về ticket dẫn chứng từ Epic 3 là đầu vào tất định bắt buộc để Epic 4 phát hiện điểm nghẽn quy trình và kích hoạt luồng AI soạn thảo bản nháp cải tiến SOP.
