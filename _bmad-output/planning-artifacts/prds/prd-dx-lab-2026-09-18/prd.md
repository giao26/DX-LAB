---
title: DX-OS nguồn mở (DX-LAB)
status: final
created: 2026-09-18
updated: 2026-09-18
---

# PRD: DX-OS nguồn mở (DX-LAB)

*Phiên bản yêu cầu cho demo chấm thi OLP 2026. Phạm vi sẽ được đối chiếu lại khi đề thi chi tiết được công bố.*

## 0. Mục đích tài liệu

PRD này định nghĩa trải nghiệm và yêu cầu sản phẩm cho bản demo DX-OS nguồn mở dự thi OLP 2026. Các quyết định về kiến trúc, sản phẩm cụ thể và cách triển khai chi tiết sẽ được ghi ở tài liệu thiết kế sau PRD.

## 1. Tầm nhìn

DX-OS cho thấy một công việc thực tế đi xuyên suốt bốn không gian: nhân sự và quyền truy cập **[H]**, quy trình xử lý **[P]**, dữ liệu và chỉ số điều hành **[D]**, và đề xuất có người phê duyệt từ AI **[I]**. Bản demo cần cho ban giám khảo theo dõi được cùng một sự vụ từ lúc phát sinh đến lúc cải tiến quy trình.

Giá trị do đội xây và cần chứng minh nằm ở cách các không gian cùng xử lý một hồ sơ có thể kiểm chứng: phân công công bằng, SLA theo giờ làm việc, lịch sử từng bước, quyền xem theo trách nhiệm và vòng cải tiến SOP có bằng chứng cùng phê duyệt. Các công cụ nguồn mở là thành phần của hệ thống; việc đặt chúng cạnh nhau không tự nó chứng minh luồng nghiệp vụ hoàn chỉnh.

Dự án được công bố dưới giấy phép nguồn mở được chấp nhận và tổ chức để người khác có thể cài đặt, hiểu mã nguồn, báo lỗi và đóng góp. Luồng DX-Ticket là hành trình chính của bản demo.

### Mục tiêu tiếp nhận đóng góp

Một người mới có thể làm theo hướng dẫn từ kho mã nguồn để chạy một luồng DX-Ticket mẫu trong môi trường phát triển nhẹ, thực hiện một thay đổi nhỏ có ích (chẳng hạn mẫu thông báo khi đóng ticket), chạy kiểm thử có khả năng phát hiện lỗi của thay đổi đó và gửi pull request. Việc đóng góp ở một phân hệ không yêu cầu tải mô hình AI hoặc khởi chạy toàn bộ hệ thống.

## 2. Người dùng và hành trình chính

### 2.1 Người dùng

- **Khách hàng:** gửi yêu cầu hỗ trợ, nhận email xác nhận và kết quả, đánh giá sau khi hoàn tất.
- **Nhân viên xử lý:** xác nhận phân loại, nhận trách nhiệm, thực hiện và ghi lại từng bước xử lý.
- **Trưởng nhóm:** rà soát ticket bị khách chấm 1–2 sao trong nhóm mình.
- **Trưởng phòng:** theo dõi toàn bộ ticket và điều phối nguồn lực giữa các Nhóm.
- **Giám đốc:** xem số liệu toàn hệ thống, nhận khuyến nghị cải tiến và quyết định có thực hiện hay không.
- **Người đóng góp nguồn mở:** cài đặt, chạy ví dụ, sửa một phần nhỏ, kiểm thử và gửi pull request.

### 2.2 Hành trình người dùng

**UJ-1. Tiên trình diễn một ticket đi qua H → P → D → I.** Tiên mở DX-Portal ở [H], truy cập SOP/FAQ đã duyệt trong Resources của P.A.R.A, rồi đi vào chức năng hỗ trợ khách hàng. Tiên điền form DX-Ticket; hệ thống kiểm tra các trường bắt buộc, tạo ticket và gửi email xác nhận. AI gợi ý một trong ba loại yêu cầu từ mô tả văn bản; hệ thống phân công tạm theo loại đó và thông báo người được giao qua Odoo. Nhân viên mở đúng ticket, xác nhận hoặc sửa loại trước khi bắt đầu xử lý, rồi ghi lại các bước thực hiện. Thời gian SLA và thay đổi trạng thái xuất hiện trên dashboard. Tiên chuyển sang góc nhìn của Giám đốc để cho thấy số liệu và báo cáo cập nhật từ cùng hồ sơ ticket. Cách chuyển tài khoản mẫu thuộc kịch bản UX của buổi demo.

**UJ-2. Giám đốc xử lý khuyến nghị cải tiến có bằng chứng.** Trong dữ liệu lịch sử mẫu có ít nhất ba ticket bảo hành quá hạn trong bảy ngày và cùng có một bước kiểm tra kéo dài trên 60 phút làm việc. Hệ thống phát hiện mẫu lặp lại, AI tạo báo cáo kèm số liệu và ticket minh chứng cho Giám đốc. Giám đốc chấp nhận hoặc từ chối. Khi chấp nhận, AI soạn bản nháp thay đổi SOP và giao việc cho Người duyệt tri thức rà soát; chỉ bản đã duyệt mới được xuất bản vào Resources. [ASSUMPTION: Dữ liệu lịch sử mẫu được nạp trước buổi demo và được ghi nhãn rõ là dữ liệu mẫu.]

**UJ-3. Một người mới đóng góp cho DX-OS.** Người đóng góp mở kho mã nguồn công khai, làm theo hướng dẫn để chạy luồng DX-Ticket mẫu, sửa một mẫu thông báo hoặc quy tắc nhỏ, chạy kiểm thử phát hiện được lỗi liên quan và gửi pull request. Họ không cần khởi chạy toàn bộ phân hệ AI để làm thay đổi cục bộ.

## 3. Thuật ngữ

- **Ticket:** hồ sơ một yêu cầu hỗ trợ, gồm nội dung, người phụ trách, trạng thái, lịch sử xử lý và phản hồi khách hàng.
- **Loại yêu cầu:** một trong Khiếu nại, Tư vấn, Bảo hành; hồ sơ giữ riêng loại do khách chọn, loại AI gợi ý và loại Nhân viên xác nhận.
- **Nhóm:** đơn vị nhân viên được phân quyền cùng xem các ticket thuộc phạm vi của mình.
- **Người phụ trách:** nhân viên nhận trách nhiệm xử lý một ticket tại một thời điểm.
- **Bước kiểm tra:** một công đoạn có thời điểm bắt đầu và kết thúc trong quy trình xử lý ticket; thời lượng được tính theo giờ làm việc như SLA. Với bước còn mở, thời lượng tính đến thời điểm đánh giá.
- **SLA:** thời hạn hoàn tất ticket trong hai giờ làm việc tính từ lúc tiếp nhận, theo lịch làm việc đã cấu hình.
- **CSAT:** tỷ lệ đánh giá 4–5 sao trên tổng lượt đánh giá hợp lệ sau khi ticket đóng; luôn hiển thị tổng lượt phản hồi. Điểm trung bình 1–5, nếu có, là chỉ số riêng.
- **Trưởng nhóm:** người quản lý phạm vi một Nhóm, nhận việc rà soát CSAT thấp của Nhóm đó.
- **Trưởng phòng:** vai trò quản lý được xem toàn bộ ticket và điều phối nhân sự giữa các Nhóm trong bản demo.
- **Giám đốc:** vai trò được xem toàn bộ chỉ số và quyết định chấp nhận hoặc từ chối khuyến nghị cải tiến.
- **Người duyệt tri thức:** người có quyền rà soát và công bố phiên bản SOP/FAQ vào Resources; khác với Người phụ trách ticket.
- **Resources:** vùng tài liệu P.A.R.A chứa SOP/FAQ đã được phê duyệt để tái sử dụng.
- **SOP:** phiên bản quy trình thao tác chuẩn đã được duyệt và công bố.
- **Bản chốt ngày:** tập chỉ số được lưu tại cuối mỗi ngày để đối chiếu và xem xu hướng.

## 4. Tính năng và yêu cầu chức năng

### 4.1 Cổng làm việc và tri thức [H]

DX-Portal là điểm bắt đầu của hành trình demo. Nhân viên truy cập đúng luồng nghiệp vụ, tham khảo tài liệu đã duyệt và nhận thông báo nội bộ trong nhóm có quyền. Thực hiện UJ-1.

#### FR-1: Điều hướng từ DX-Portal

Người dùng có thể từ DX-Portal mở luồng tạo DX-Ticket và thư viện Resources mà không phải tự tìm đường dẫn của từng công cụ.

**Điều kiện kiểm tra:** các mục điều hướng dẫn đến đúng chức năng; tài liệu chưa được duyệt không xuất hiện trong thư viện công bố.

#### FR-2: Tra cứu tài liệu đã duyệt

Nhân viên có thể tìm hoặc mở SOP/FAQ đang có hiệu lực từ Resources và nhận biết phiên bản cùng trạng thái phê duyệt.

**Điều kiện kiểm tra:** nội dung hiển thị đúng phiên bản được công bố; bản nháp không được dùng làm nguồn tham chiếu chính thức của AI.

#### FR-3: Thông báo nội bộ theo quyền

Nhân viên được giao ticket nhận thông báo trong Odoo dẫn tới đúng hồ sơ; người ngoài nhóm không xem được nội dung ticket của nhóm đó.

**Điều kiện kiểm tra:** thông báo chứa mã ticket và liên kết nội bộ, được định tuyến vào nhóm/chủ đề có quyền; truy cập liên kết vẫn kiểm tra quyền tại hồ sơ ticket. Cùng một sự kiện nghiệp vụ không tạo nhiều lệnh gửi giống nhau; lỗi gửi có trạng thái và có thể thử lại.

### 4.2 Tiếp nhận và xử lý ticket [P]

Khách gửi yêu cầu qua form, hệ thống cấp mã và ghi nhận thời điểm. AI gợi ý loại, hệ thống phân công theo loại tạm thời, rồi nhân viên được giao xác nhận hoặc sửa trước khi bắt đầu xử lý. Thực hiện UJ-1.

#### FR-4: Tạo ticket hợp lệ

Khách có thể gửi họ tên, số điện thoại, email, loại yêu cầu và mô tả; có thể đính kèm một ảnh hoặc PDF tối đa 10 MB.

**Điều kiện kiểm tra:** trường bắt buộc và định dạng email/số điện thoại được kiểm tra ở giao diện và tại nơi ghi dữ liệu; dữ liệu không hợp lệ không tạo ticket; mã và thời điểm tiếp nhận do hệ thống cấp; loại do khách chọn được giữ trong hồ sơ để đối chiếu. Số điện thoại đã chuẩn hóa khớp hồ sơ khách cũ thì ticket liên kết hồ sơ đó; số mới tạo hồ sơ khách; dữ liệu liên hệ xung đột được đánh dấu để rà soát thay vì tự ghi đè. Ticket hợp lệ có email xác nhận và trạng thái gửi được lưu.

#### FR-5: Phân loại AI có người xác nhận

Khi một ticket hợp lệ được tạo, AI tự đề xuất Khiếu nại, Tư vấn hoặc Bảo hành chỉ từ mô tả vấn đề. Người nhận ticket xác nhận hoặc sửa loại trước khi bắt đầu xử lý.

**Điều kiện kiểm tra:** AI chỉ đọc mô tả, không nhận loại khách chọn, tên, số điện thoại, email hoặc tệp đính kèm; lưu loại khách chọn, loại AI gợi ý, loại cuối cùng cùng người và thời điểm xác nhận. Nếu AI không trả kết quả, hệ thống dùng loại khách chọn để phân công tạm và vẫn bắt buộc Nhân viên xác nhận. Nếu loại được sửa làm thay đổi Nhóm xử lý, hệ thống chuyển ticket về đúng Nhóm, thu hồi quyền Người phụ trách tạm và lưu lịch sử chuyển giao.

#### FR-6: Phân công công bằng

Hệ thống tự phân công ticket cho nhân viên sẵn sàng trong Nhóm phù hợp với loại yêu cầu tạm thời, ưu tiên người có ít lượt giao chính thức hơn và dùng vòng ID tăng dần khi bằng nhau. Mỗi nhân viên xử lý tối đa một ticket cùng lúc.

**Điều kiện kiểm tra:** một ticket đã phân công tạm giữ chỗ của Nhân viên cho đến khi được xác nhận hoặc chuyển giao; bỏ qua Nhân viên đang bận; nếu mọi người bận, ticket vào hàng đợi theo thời điểm tiếp nhận; khi có chỗ, ticket đến sớm được xét trước. Lượt giao chính thức chỉ tăng khi Nhân viên xác nhận loại và nhận trách nhiệm xử lý; giao tạm bị thu hồi do sửa loại không tăng bộ đếm của Nhóm cũ.

#### FR-7: Ghi lịch sử xử lý và SLA

Nhân viên có thể chuyển mọi loại ticket qua Chờ xử lý, Đang xử lý và Đóng. Mỗi loại có chuỗi bước nghiệp vụ riêng; bảo hành có bước kiểm tra được ghi thời điểm bắt đầu/kết thúc. Hệ thống tính SLA đến khi giải quyết xong.

**Điều kiện kiểm tra:** trạng thái đi theo Chờ xử lý → Đang xử lý → Đóng; chỉ Người phụ trách có quyền đóng sau khi ghi kết quả, và hồ sơ Đóng không tự mở lại trong bản dự thi. Giao diện chỉ ra dữ liệu còn thiếu khi từ chối Đóng. Bản ghi đã Đóng không bị sửa âm thầm; đính chính phải có người, thời điểm và giá trị trước/sau. [ASSUMPTION: Nếu cần xử lý tiếp sau Đóng, tạo ticket mới có liên kết đến ticket cũ.] Lịch làm việc là thứ Hai–thứ Sáu, 08:00–12:00 và 13:00–17:00 giờ Việt Nam, có ngày nghỉ cấu hình; yêu cầu ngoài giờ bắt đầu tính ở ca kế tiếp; thời gian chờ phân công, kiểm tra hoặc linh kiện vẫn tính vào SLA; ticket quá hạn không bị xóa dấu vết khi đóng.

#### FR-8: Đóng ticket và thu CSAT

Khi ticket đóng, khách nhận email có đường dẫn đánh giá 1–5 sao và nhận xét tùy chọn.

**Điều kiện kiểm tra:** một đánh giá chỉ gắn với đúng ticket và không thể ghi bằng cách đoán mã ticket; phân biệt chưa đánh giá với điểm thấp; 1–2 sao tạo việc để Trưởng nhóm của ticket rà soát hồ sơ và ghi kết quả. Email đóng ticket và lời mời CSAT có trạng thái gửi; sửa trường không liên quan hoặc thử lại sau lỗi không tạo lệnh gửi trùng cho cùng sự kiện Đóng.

### 4.3 Dữ liệu điều hành [D]

Dữ liệu ticket, từng bước xử lý và phản hồi tạo nên cùng một nguồn số liệu cho nhân viên, trưởng phòng và giám đốc. Thực hiện UJ-1 và UJ-2.

#### FR-9: Phân quyền xem ticket và chỉ số

Nhân viên thấy danh sách ticket thuộc Nhóm mình với phần tóm tắt đã che thông tin liên hệ. Trong số các Nhân viên, chỉ Người phụ trách đã nhận ticket mới xem thông tin liên hệ và tệp đính kèm của khách để xử lý; Trưởng nhóm xem chi tiết trong Nhóm mình; trưởng phòng và giám đốc xem toàn bộ ticket.

**Điều kiện kiểm tra:** một định danh và vai trò nhất quán được dùng khi đi từ DX-Portal tới ticket, Resources và dashboard; quyền được áp dụng cả khi đọc qua API lẫn báo cáo; khi thu hồi quyền, liên kết và dữ liệu cũ không còn truy cập được; dashboard cho nhân viên không để lộ thông tin định danh ngoài phạm vi cho phép.

#### FR-10: Dashboard và bản chốt ngày

Người có quyền xem số ticket mới, tồn đọng, đã đóng, đúng/quá SLA, thời gian theo bước và CSAT; lọc theo thời gian, trạng thái và loại yêu cầu, đi từ chỉ số tới ticket liên quan.

**Điều kiện kiểm tra:** trên môi trường demo, thay đổi ticket xuất hiện trên dashboard trong vòng 60 giây sau khi ghi thành công, không cần sửa dữ liệu báo cáo bằng tay; cuối ngày lưu Bản chốt ngày với thời điểm chốt, kỳ dữ liệu, phạm vi Nhóm, phiên bản định nghĩa chỉ số và dấu truy vết về ticket/sự kiện nguồn. Dashboard, Bản chốt ngày và đầu vào AI dùng cùng định nghĩa cho ticket mới, tồn đọng, quá SLA, thời gian Bước kiểm tra và CSAT. CSAT hiển thị tỷ lệ 4–5 sao và số lượt phản hồi; điểm trung bình 1–5 nếu có được đặt tên riêng.

### 4.4 Phân tích và cải tiến có phê duyệt [I]

AI hỗ trợ nhân viên trong một ticket và hỗ trợ giám đốc phát hiện mẫu chậm lặp lại. AI đưa ra bản nháp, con người quyết định và phê duyệt. Thực hiện UJ-1 và UJ-2.

#### FR-11: Phát hiện điểm nghẽn có bằng chứng

Khi sự kiện xử lý làm xuất hiện ít nhất ba ticket bảo hành được tiếp nhận trong bảy ngày lịch gần nhất, đều quá hạn SLA và cùng có một Bước kiểm tra kéo dài trên 60 phút làm việc, hệ thống tự tạo phân tích cho Giám đốc.

**Điều kiện kiểm tra:** mốc bắt đầu/kết thúc của Bước kiểm tra xác định thời lượng; bước còn mở tính đến thời điểm kiểm tra; đúng 60 phút chưa được coi là chậm; hai ticket thỏa điều kiện chưa kích hoạt. Báo cáo nêu bước chậm, khoảng thời gian, số ticket và hồ sơ dẫn chứng; tham chiếu SOP đã duyệt kèm phiên bản khi sử dụng tri thức nội bộ; không tạo cùng một khuyến nghị lặp lại chỉ vì dữ liệu được đọc lại; dữ liệu đưa cho AI được tổng hợp hoặc che thông tin định danh.

#### FR-12: Quyết định và sửa SOP

Giám đốc có thể chấp nhận hoặc từ chối khuyến nghị. Khi chấp nhận, AI soạn bản nháp thay đổi SOP và tạo việc cho người phụ trách rà soát.

**Điều kiện kiểm tra:** lưu quyết định và người quyết định; bản nháp chưa xuất hiện như SOP có hiệu lực; chỉ bản được Người duyệt tri thức phê duyệt mới được xuất bản vào Resources; tỷ lệ bảo hành quá hạn trước/sau là chỉ số đánh giá cải tiến.

### 4.5 Đón nhận đóng góp nguồn mở

Dự án phải cho phép người mới chạy và cải thiện một lát cắt nhỏ của sản phẩm mà không dựng toàn bộ hệ thống. Thực hiện UJ-3.

#### FR-13: Hành trình đóng góp đầu tiên

Người mới có thể theo hướng dẫn để chạy luồng DX-Ticket mẫu, sửa một quy tắc hoặc mẫu thông báo, chạy kiểm thử hành vi liên quan và gửi pull request.

**Điều kiện kiểm tra:** tài liệu chỉ rõ yêu cầu môi trường, lệnh chạy, dữ liệu mẫu và cách kiểm tra; một đóng góp cục bộ không đòi hỏi tải mô hình AI; kiểm thử thất bại nếu hành vi liên quan bị làm sai.

## 5. Ràng buộc và yêu cầu chất lượng

- **Nguồn mở:** mã nguồn sản phẩm truy cập công khai trên Internet; giấy phép của sản phẩm được OSI chấp nhận, có toàn văn giấy phép và nhận diện giấy phép trong từng tệp mã. Các phụ thuộc phải được kê khai và kiểm tra tương thích giấy phép.
- **Khả năng dựng lại:** có hướng dẫn cài đặt và chạy từ mã nguồn bằng công cụ nguồn mở, cấu hình qua biến môi trường hoặc cơ chế công khai; có ít nhất một bản phát hành theo phiên bản trước hạn nộp.
- **Bản phát hành dự thi:** gói phát hành dùng định dạng mở, kèm phiên bản, hướng dẫn cấu hình và build; kết quả cài đặt chạy được ngoài thư mục mã nguồn. Không cần sửa tệp header hoặc mã để đổi cấu hình môi trường.
- **Khả năng cộng tác:** có README, changelog, nơi ghi nhận lỗi và hướng dẫn đóng góp. Kiểm thử tự động phải kiểm tra hành vi sản phẩm quan trọng, không chỉ cú pháp cấu hình.
- **Phụ thuộc:** kê khai tên, phiên bản, giấy phép và vai trò của thành phần bên thứ ba; không chép hoặc chỉnh sửa mã của thư viện khác vào kho sản phẩm để thay cho quản lý phụ thuộc chuẩn.
- **Quyền riêng tư:** Nhân viên chưa nhận ticket chỉ xem danh sách đã che thông tin liên hệ; quyền xem chi tiết áp dụng nhất quán tại API, giao diện, dashboard, dữ liệu xuất và tệp đính kèm. AI phân loại không nhận thông tin định danh.
- **Ranh giới AI:** AI không tự gửi quyết định có tác động bên ngoài tổ chức hoặc tài chính và không tự công bố SOP; bước đó cần người có thẩm quyền phê duyệt.
- **Tính toàn vẹn:** các lần đổi trạng thái, phân công, phê duyệt và xuất bản SOP có lịch sử người thực hiện và thời điểm; tệp gốc của ticket không bị biến thành tài liệu công bố tự động.
- **Khả năng mang dữ liệu đi:** dữ liệu nghiệp vụ và tri thức đã duyệt có cách xuất ra định dạng mở với mã định danh, mô tả trường và nguồn gốc; không buộc người dùng giữ một công cụ để đọc lại dữ liệu.
- **Tính lắp ghép:** cùng mã ticket và định nghĩa trạng thái/loại yêu cầu được dùng qua Portal, quy trình, báo cáo và AI. Ranh giới tích hợp và nơi ghi dữ liệu chuẩn được công bố để người đóng góp có thể thay một đầu ra thông báo hoặc thành phần AI mà không viết lại lịch sử ticket.
- **Vận hành:** cảnh báo phát sinh trong ngày; có Bản chốt ngày. Thiết kế sao lưu phải nêu lịch, phạm vi (dữ liệu ticket, tệp đính kèm, SOP), nơi lưu bản thứ hai, thời gian giữ và cách kiểm tra bản sao; bản demo trình bày thiết kế, không cần trình diễn khôi phục trực tiếp.
- **Khả năng truy cập và dễ dùng:** người xem có thể theo một mã ticket xuyên các màn demo; trạng thái, thời hạn và hành động tiếp theo được diễn đạt nhất quán. Ứng dụng nhân viên chạy trực tuyến trên web và dùng được trên màn hình điện thoại.

## 6. Phạm vi bản dự thi

### 6.1 Trong phạm vi

- Hành trình demo UJ-1 với DX-Portal, Resources đã duyệt, form ticket, Odoo thông báo, xử lý ticket, dashboard và AI phân loại.
- Hành trình UJ-2 với dữ liệu mẫu được ghi nhãn rõ, phát hiện điểm nghẽn, quyết định của giám đốc và bản nháp SOP cần người duyệt.
- Hành trình đóng góp UJ-3, kho mã công khai, giấy phép phù hợp, bản phát hành và hướng dẫn dựng lại.
- Phân quyền theo nhóm/vai trò, lịch sử bước xử lý, SLA giờ làm việc, CSAT và chỉ số hằng ngày.
- Bộ dữ liệu mẫu được ghi nhãn, sơ đồ luồng H-P-D-I và hướng dẫn trình diễn cả ca bình thường lẫn ca quá hạn; dữ liệu trước/sau có thể đối chiếu bằng mã ticket.
- Một tình huống nhập liệu sai và một lần thử Đóng thiếu kết quả bị chặn để cho thấy rào chắn quy trình.

### 6.2 Chưa coi là cam kết bản dự thi

- Mở rộng DX-OS thành đầy đủ ERP, CRM, kế toán và mọi nút nghiệp vụ trong DX-Portal mẫu. DX-Ticket là lát cắt được chọn để chứng minh kiến trúc H-P-D-I của bản dự thi hiện tại.
- Cổng theo dõi trạng thái ticket dành cho khách; bản dự thi gửi email xác nhận và kết quả, khách đánh giá sau khi đóng.
- Đồng bộ ngoại tuyến và tích hợp camera/GPS của thiết bị trong ứng dụng nhân viên.
- Tự huấn luyện lại mô hình AI bằng dữ liệu khách hàng, tự công bố SOP hoặc tự thực hiện quyết định của giám đốc.
- Dự báo khối lượng ticket bằng mô hình thống kê khi chưa có lịch sử đủ dài để đánh giá độ chính xác.
- Hồ dữ liệu, lakehouse, semantic layer và data fabric quy mô doanh nghiệp; tài liệu 7.4 mô tả đường mở rộng khi có nhu cầu.
- Trình diễn khôi phục bản sao lưu trực tiếp tại buổi chấm thi.

## 7. Tiêu chí thành công

**SM-1 — Demo thông mạch:** người trình diễn tạo ticket thật trong UJ-1 bằng một mã nhất quán; từng chặng H, P, D và AI phân loại ở I thể hiện vai trò rõ ràng, dữ liệu trên dashboard truy ngược được về ticket. Giao diện chặn một lần nhập sai và một lần Đóng thiếu kết quả trước khi người trình diễn hoàn tất đường đi đúng. AI phân tích điểm nghẽn dùng dữ liệu lịch sử mẫu trong UJ-2 và SM-2. Kiểm tra FR-1 đến FR-10.

**SM-2 — Khuyến nghị có căn cứ:** với dữ liệu mẫu có ba ticket bảo hành quá hạn trong bảy ngày, cùng có Bước kiểm tra trên 60 phút làm việc, UJ-2 cho thấy báo cáo gồm bước chậm, ticket dẫn chứng, quyết định của Giám đốc và trạng thái bản nháp SOP; dữ liệu hai ticket hoặc bước đúng 60 phút không tạo khuyến nghị này. Kiểm tra FR-11 và FR-12.

**SM-3 — Chất lượng dịch vụ đo được:** dashboard hiển thị tỷ lệ giải quyết đúng SLA, tỷ lệ bảo hành quá hạn, thời gian từng bước và CSAT kèm số lượt đánh giá; sau thay đổi SOP có thể so sánh tỷ lệ quá hạn trước/sau, không tự quy kết quan hệ nhân quả. Kiểm tra FR-7 đến FR-12.

**SM-4 — Người mới có thể đóng góp:** một người khác làm theo hướng dẫn để chạy ví dụ, thực hiện thay đổi cục bộ, thấy kiểm thử liên quan phát hiện lỗi rồi gửi pull request mà không cần chạy toàn bộ hệ thống AI. Kiểm tra FR-13.

**SM-5 — Sẵn sàng chấm kho mã:** kho công khai có giấy phép và thông báo phù hợp, bản phát hành theo phiên bản, hướng dẫn build/cấu hình, danh mục phụ thuộc, README, changelog và nơi ghi nhận lỗi; một người ngoài đội có thể làm theo hướng dẫn trên bản phát hành. Kiểm tra ràng buộc §5 và FR-13.

**Chỉ số đối trọng:** không tăng số ticket “Đóng” bằng cách đóng thiếu kết quả; không tăng tỷ lệ đúng SLA bằng cách ngừng tính giờ ở hàng đợi hoặc bước kiểm tra; không tăng CSAT bằng cách chỉ gửi khảo sát cho khách có khả năng chấm cao.

## 8. Câu hỏi còn mở

1. **Tài khoản demo — UX lead, trước khi khóa kịch bản trình diễn:** chọn tài khoản mẫu cho khách, Nhân viên, Trưởng nhóm, Trưởng phòng và Giám đốc; kiểm tra chuyển vai trò không làm lộ quyền.
2. **Bước nghiệp vụ — process owner, trước khi chia story xử lý ticket:** đặt tên và điều kiện hoàn tất của từng bước theo loại. Bảo hành phải có ít nhất một Bước kiểm tra có mốc thời gian để đáp ứng FR-11.
3. **Odoo chat ngoài luồng ticket — product owner, khi mở rộng phạm vi [H]:** bản dự thi trực tiếp cho thấy thông báo trong nhóm/chủ đề có quyền; các kênh đặc quyền và Saved Messages được thiết kế ở phụ lục, chưa là thao tác bắt buộc của demo.
4. **Đề thi chi tiết OLP — product owner, ngay khi công bố vào tháng 11/2026:** so sánh đề chính thức với phạm vi, ràng buộc và lộ trình phát hành của PRD.
5. **Lưu trữ dài hạn — data owner, trước triển khai thực tế:** chốt thời hạn giữ ticket/tệp và số bản sao theo đơn vị vận hành; demo chỉ cần trình bày thiết kế và lịch sao lưu.
6. **Cảnh báo trước hạn SLA — product owner, sau khi luồng cơ bản chạy ổn:** quyết định có đưa vào bản dự thi không và ngưỡng cảnh báo; chưa là điều kiện nghiệm thu của FR-7.
7. **Nhân viên tạo ticket hộ khách — product owner, sau demo luồng khách tự gửi:** quyết định có thêm điểm vào từ ứng dụng nhân viên; bản dự thi bắt buộc chứng minh form khách gửi.

## 9. Chỉ mục giả định

- **UJ-2:** dữ liệu lịch sử mẫu được nạp trước và ghi nhãn rõ. *Chủ sở hữu:* người chuẩn bị demo. *Xác nhận:* khi xây kịch bản và lệnh nạp dữ liệu mẫu.
- **FR-7:** xử lý tiếp sau Đóng bằng ticket liên kết mới thay vì mở lại ticket cũ. *Chủ sở hữu:* product owner. *Xác nhận:* trước khi triển khai vòng đời ticket.
