---
name: DX-OS
description: Kiến trúc thông tin và hành vi bản demo H→P→D→I.
status: final
created: 2026-09-18
updated: 2026-09-19
sources:
  - ../../prds/prd-dx-lab-2026-09-18/prd.md
---

# DX-OS — Experience Spine

## Foundation

DX-OS có nhiều bề mặt web trực tuyến: DX-Portal và trang H/P, form khách, một ứng dụng Dashboard chứa hai phần D/I dành cho Giám đốc, cùng Odoo cho nhân viên xử lý ticket, nhắn tin và Người duyệt tri thức rà soát SOP. Portal, form và Dashboard dùng thành phần web có ngữ nghĩa và `DESIGN.md`; Odoo giữ thành phần gốc trừ các yêu cầu DX-OS về mã ticket, nhãn trạng thái bằng văn bản, quyền, điểm tập trung bàn phím và phản hồi lỗi. Nhân viên thao tác trên máy tính lẫn điện thoại thật qua trình duyệt. Không hỗ trợ làm việc ngoại tuyến, ứng dụng cài đặt, camera hay GPS trong demo. Tiếng Việt là ngôn ngữ chính.

Người trình diễn chuyển vai qua **tab/phiên tài khoản chuẩn bị sẵn**: khách, nhân viên Odoo, Giám đốc Dashboard, Người duyệt tri thức Odoo khi cần. Không có bộ chuyển vai giả trong UI sản phẩm. Phiên phải cách ly để quyền không lẫn; tên tài khoản mẫu là dữ liệu kịch bản được chốt khi tổng duyệt, không làm thay đổi cấu trúc UX.

## Information Architecture

| Bề mặt | Điểm vào | Mục đích |
|---|---|---|
| DX-Portal tổng quan | Tab mở đầu | Bốn ô H/P/D/I tương tác, cho ban giám khảo thấy vòng lặp. |
| Trang tổng hợp H | Bấm H | Thông báo theo quyền và đường tới Kho tài nguyên/Odoo; luôn có đường quay lại DX-Portal. |
| Kho tài nguyên (Resources) | Từ H | SOP/FAQ đang hiệu lực, phiên bản và trạng thái công bố; không hiện nháp như tài liệu chính thức. |
| Trang tổng hợp quy trình | Bấm P | Chọn DX-Ticket rồi mới đến form; P không mở form trực tiếp. |
| Form DX-Ticket + xác nhận | Từ trang P | Khách gửi yêu cầu, nhận mã ticket và trạng thái gửi email xác nhận. |
| Odoo thông báo/danh sách/chi tiết | Tab nhân viên hoặc thông báo | Xác nhận loại AI, nhận trách nhiệm, ghi bước, Đóng theo quyền. |
| Email đóng + CSAT | Sau khi Đóng | Khách đánh giá 1–5 sao, nhận xét tùy chọn. |
| Dashboard phần D | Bấm D hoặc tab Giám đốc | Ba KPI đầu, biểu đồ, bộ lọc, khoan sâu về ticket. |
| Dashboard phần I | Bấm I hoặc từ D | Khuyến nghị AI, bằng chứng, quyết định Giám đốc. |
| Odoo việc duyệt SOP | Khi Giám đốc chấp nhận | Người duyệt rà soát và phê duyệt nháp; sau đó Resources mới công bố. |
| Odoo rà soát CSAT thấp | Sau đánh giá 1–2 sao | Trưởng nhóm xem ticket nhóm và ghi kết quả. |

H và P là hai trang tổng hợp riêng; D và I là hai phần của **cùng một ứng dụng Dashboard dành cho Giám đốc**. Một mã ticket nối các bề mặt. URL trực tiếp vẫn phải kiểm tra quyền. Chủ quy trình xác nhận tên và điều kiện hoàn tất của từng bước trước khi viết user story triển khai.

Mẫu bố cục: [Portal](mockups/portal.html), [Dashboard D/I](mockups/dashboard.html), [Odoo xử lý ticket](mockups/odoo-ticket.html), [Odoo duyệt SOP](mockups/odoo-sop-review.html). Form khách, trang H/P, Resources, CSAT và trạng thái phụ được xây từ các bảng trong spine; không cần mock riêng. Tên bước nghiệp vụ riêng là dữ liệu cấu hình được process owner chốt trước story triển khai, không làm thay đổi mô hình màn hình.

## Voice and Tone

Microcopy tiếng Việt ngắn, rõ chủ thể và hành động. Thương hiệu nằm trong `DESIGN.md.Brand & Style`.

| Nói | Tránh |
|---|---|
| “Tạo DX-Ticket”, “Gửi yêu cầu”, “Mã ticket: …” | “Submit”, “Done” không ngữ cảnh |
| “AI gợi ý: Bảo hành. Nhân viên cần xác nhận.” | “AI đã xử lý” trước khi có người xác nhận |
| “Quá SLA 23 phút làm việc” kèm mốc tính | Chỉ chấm đỏ hoặc “Trễ” |
| “Khuyến nghị dựa trên 3 ticket. Xem bằng chứng.” | “AI chắc chắn xác định nguyên nhân” |
| “Bản nháp SOP đang chờ duyệt” | “SOP mới đã có hiệu lực” trước công bố |

Dashboard hiển thị thời điểm dữ liệu mới nhất nếu cập nhật chậm; không hứa thời gian thực vô điều kiện.

## Component Patterns

Hành vi ở đây; màu/kích thước theo `DESIGN.md.Components`.

| Thành phần | Hành vi |
|---|---|
| `space-tile` | Cả ô H/P/D/I là liên kết có tên đầy đủ; H→trang H, P→trang P, D/I→đúng phần Dashboard. |
| `primary-action` | Mỗi vùng có tối đa một hành động chính; khi đang lưu thì khóa gửi lặp, giữ nhãn tiến trình và không đổi trạng thái trước khi máy chủ xác nhận. |
| `ticket-form` | Kiểm tra trường theo FR-4. Khi gửi lỗi, giữ dữ liệu, chuyển điểm tập trung bàn phím tới tóm tắt lỗi liên kết từng trường; thành công thông báo một lần mã ticket và trạng thái gửi email xác nhận. |
| `status-label` | Dùng cho trạng thái ticket, SLA, gửi email/thông báo và SOP. Thay đổi bất đồng bộ có nhãn bằng văn bản tồn tại trên màn hình và được thông báo qua vùng trạng thái cho công nghệ hỗ trợ. |
| `data-view` | Ba KPI đầu là ticket mới, quá SLA, CSAT; lọc thời gian/trạng thái/loại, tới ticket nguồn theo quyền. Mọi biểu đồ có bảng hoặc phần văn bản cùng dữ liệu, kỳ, đơn vị và mẫu số. |
| `ai-recommendation` | Chỉ xuất hiện khi đủ FR-11; nêu bước chậm, thời gian, số ticket, bằng chứng, trạng thái quyết định; nút chấp nhận/từ chối không tự công bố SOP. |
| `odoo-work-item` | Bao gồm thông báo, ticket xử lý, phân loại/chuyển giao và việc SOP. Dùng widget Odoo nếu qua kiểm tra bàn phím/điện thoại; nếu không, cấu hình hoặc thay widget trước demo. |

## State Patterns

| Trạng thái | Xử lý |
|---|---|
| Đang tải | Giữ bố cục, báo “Đang tải dữ liệu…” khi kéo dài; không đổi giá trị cũ thành 0. |
| Form lỗi | Lỗi sát trường, giữ dữ liệu, focus vào tóm tắt lỗi sau khi gửi; không tạo ticket. |
| Form thành công | Mã ticket và trạng thái gửi email xác nhận; tránh gửi trùng vô ý. |
| Mất kết nối mạng khi nhập/gửi | Báo không thể kết nối; không cho xác nhận thành công. Giữ dữ liệu nhập khi có thể; thử lại dùng cùng yêu cầu để không tạo ticket trùng. |
| Không có dữ liệu trong kỳ | “Chưa có ticket trong kỳ đã chọn”; đường về bộ lọc. |
| AI chưa phân loại | Loại khách chọn là tạm; nhân viên vẫn xác nhận trước xử lý. |
| AI phân loại lỗi | Giữ loại khách chọn là tạm, nêu “AI chưa đưa ra gợi ý”; nhân viên vẫn xác nhận, không chặn luồng. |
| Chưa có người sẵn sàng | Ticket vào hàng đợi và vẫn tính SLA; không ngụ ý đã có người chịu trách nhiệm. |
| Không có quyền hoặc quyền đã bị thu hồi | Không lộ dữ liệu; chuyển điểm tập trung bàn phím tới tiêu đề lỗi; cho hành động an toàn “Quay lại” hoặc “Liên hệ quản trị viên”; không nêu tên khách hay nội dung ticket. |
| Đóng thiếu kết quả | Giữ Đang xử lý; chỉ rõ chỗ thiếu; chưa phát email đóng/CSAT. |
| Dashboard cũ/lỗi tải | Thời điểm dữ liệu mới nhất và lỗi làm mới; không trình bày số cũ là số mới. |
| Lưu quyết định Dashboard lỗi | Giữ lựa chọn chưa ghi ở trạng thái chưa hoàn tất, nêu lỗi và cho thử lại; không tạo nháp SOP cho tới khi quyết định được lưu. |
| Thiếu bằng chứng AI | Hai ticket hoặc bước có thời lượng đúng 60 phút làm việc không kích hoạt; phần I nêu chưa có khuyến nghị đủ điều kiện. |
| SOP chờ duyệt/từ chối | Nhãn rõ trong Odoo; Resources chỉ giữ bản hiệu lực. |
| Thông báo Odoo lỗi | Ghi trạng thái gửi lỗi và hành động thử lại có chống trùng; ticket vẫn truy cập được từ danh sách theo quyền. |
| Xuất bản SOP lỗi | Giữ bản đã duyệt ở trạng thái “Đã duyệt — chưa xuất bản”, cho Người duyệt thử lại; Resources tiếp tục hiển thị bản hiệu lực cũ. |
| Gửi CSAT lỗi/chưa có phản hồi | Giữ lựa chọn và cho thử lại; chưa phản hồi được ghi riêng, không tính thành điểm thấp. |
| H/Resources/Odoo trống | Nêu rõ chưa có thông báo, tài liệu hoặc ticket trong phạm vi; cung cấp hành động về trang trước/bộ lọc, không tạo dữ liệu giả. |

## Interaction Primitives

- Bấm/chạm ô không gian, thẻ quy trình, số liệu và dòng ticket; cùng chức năng thao tác được bằng bàn phím.
- Bộ lọc Dashboard thay đổi KPI và danh sách nguồn cùng phạm vi; D/I có đường chuyển rõ trong một ứng dụng.
- Không dùng hover làm cách duy nhất hiện hành động trên điện thoại. Hành động xử lý ở chi tiết ticket phải thấy được.
- Đóng ticket, chấp nhận/từ chối khuyến nghị và duyệt SOP yêu cầu xác nhận trong đúng ngữ cảnh, nêu hậu quả bằng một câu, rồi báo kết quả và lưu người/thời điểm. Không xếp chồng hộp thoại.
- D↔I là điều hướng chữ rõ; bộ lọc có nhãn và giá trị đã chọn. Khi lọc cập nhật, giữ focus tại bộ lọc, thông báo số kết quả và thời điểm dữ liệu; không nhảy focus về KPI đầu.
- Không đưa chuyển vai giả/đặc quyền demo vào UI sản phẩm.

## Accessibility Floor

- Mọi ô H/P/D/I và liên kết có nhãn đầy đủ; focus bàn phím rõ, Tab theo thứ tự đọc. Sau điều hướng, focus tới tiêu đề chính của bề mặt mới.
- Form có nhãn lập trình được. Tóm tắt lỗi dạng chữ liên kết tới từng trường; trường sai dùng `aria-invalid` và `aria-describedby` hoặc ngữ nghĩa tương đương. Sau lần gửi bị từ chối, focus tới tóm tắt lỗi; dữ liệu đã nhập được giữ lại. Trạng thái gửi và mã ticket thành công được thông báo một lần.
- Trạng thái, SLA, CSAT, quyết định AI có chữ; không chỉ dùng `{colors.primary}`/`{colors.accent}`.
- Biểu đồ có tiêu đề mô tả, chú giải và bảng/văn bản tương đương chứa cùng giá trị đã lọc, đơn vị, kỳ và mẫu số; KPI có kỳ và đơn vị/mẫu số.
- CSAT là nhóm radio có tên, lựa chọn chữ “1 sao” đến “5 sao”, dùng được bằng bàn phím và có xác nhận dạng chữ.
- Vùng bấm tối thiểu 24×24 CSS px có khoảng cách; hành động chính trên điện thoại ưu tiên 44×44 CSS px. Không đòi cuộn ngang ở 320 CSS px hoặc zoom 200%; chữ phóng to không che hành động.
- Mục tiêu WCAG 2.2 AA cho các bề mặt DX-OS tự xây. Kiểm tra thực tế Odoo bằng bàn phím, trình đọc màn hình, 320 CSS px và zoom 200% trước demo.

## Responsive & Platform

Tất cả là web. Portal trình bày H→P→D→I rõ trên màn chiếu, form một cột trên điện thoại, Dashboard ba KPI đầu dễ đọc ở desktop rồi xếp dọc trên màn hẹp. Breakpoint hợp đồng: desktop từ 1024 px; tablet 768–1023 px; mobile dưới 768 px, với kiểm tra bắt buộc tại 320 CSS px và zoom 200%. Odoo nhân viên phải hoàn thành xem thông báo → mở ticket → xác nhận loại → ghi bước → Đóng trên desktop lẫn điện thoại, cùng dữ liệu và quyền. Các widget Odoo cho xác nhận loại, ghi bước, Đóng và duyệt SOP chỉ được chấp nhận sau kiểm tra bàn phím, trình đọc màn hình và mobile; cấu hình/thay thế nếu không đạt.

## Inspiration & Anti-patterns

- [DX-Portal gốc](imports/dx-portal-entry.png) và [thư viện gốc](imports/dx-portal-library.png) gợi đặt điều hướng nghiệp vụ và tài liệu cùng điểm vào; DX-OS ưu tiên sơ đồ H→P→D→I tương tác.
- [Form gốc](imports/customer-form.png) gợi nhóm trường rõ; bản mới giữ email bắt buộc và phản hồi trạng thái.
- [Danh sách nhân viên gốc](imports/staff-ticket-list.png) gợi nhóm theo trạng thái; quyền chi tiết theo trách nhiệm là rào chắn chính.
- [Bảng dữ liệu ticket gốc](imports/ticket-database.png) gợi khả năng đối chiếu mã, SLA và trạng thái; DX-OS không dùng bảng tính làm giao diện nghiệp vụ.
- [Dashboard gốc](imports/director-dashboard.png) gợi KPI, biểu đồ và quá hạn; bản mới ưu tiên ba KPI đã chọn và I trong cùng Dashboard.
- Tránh sao chép chrome Google, mở form ngay từ ô P, tách D/I thành hai app, hoặc AI tự công bố SOP.

## Key Flows

### UJ-1. Tiên trình diễn một ticket đi qua H → P → D → I.

1. Tiên mở Portal, chỉ bốn ô có thể bấm, chọn H; xem SOP/FAQ đang hiệu lực và phiên bản trong Resources.
2. Cô trở lại Portal, chọn P, vào trang quy trình rồi form DX-Ticket. Cô thử một trường sai, thấy chặn lỗi, sửa và gửi.
3. Form hiện **mã ticket** và trạng thái gửi email xác nhận. Tiên chuyển sang tab Odoo của nhân viên; thông báo dẫn đến cùng mã.
4. Ở danh sách Nhóm, nhân viên chưa nhận chỉ thấy dòng đã che thông tin liên hệ và không mở được chi tiết khách. Người được phân công mở ticket, thấy loại khách chọn và AI gợi ý, xác nhận/sửa. Nếu đổi Nhóm, hiển thị chuyển giao; người nhận chính thức chịu trách nhiệm.
5. Nhân viên ghi bước, thử Đóng thiếu kết quả để thấy rào chắn, bổ sung kết quả rồi Đóng; trạng thái gửi email đóng và lời mời CSAT được hiển thị riêng.
6. Tiên chuyển sang liên kết CSAT của khách, chọn điểm trong nhóm radio “1 sao” đến “5 sao” và nhận xác nhận bằng văn bản. Nếu chọn 1–2 sao, hệ thống tạo việc rà soát cho Trưởng nhóm.
7. Tiên chuyển tab Giám đốc, mở phần D. **Điểm nhấn demo:** cùng mã ticket xuất hiện trong số liệu và lớp khoan sâu; báo cáo thay đổi mà không sửa tay. Phần I dành cho khuyến nghị khi đủ lịch sử.

Lỗi đáng chú ý: form sai không tạo hồ sơ; thiếu kết quả không Đóng; Dashboard cũ phải ghi thời điểm mới nhất. Xem FR-4/7/10.

### UJ-2. Giám đốc xử lý khuyến nghị cải tiến có bằng chứng.

1. Dữ liệu mẫu có nhãn rõ: ba ticket bảo hành nhận trong bảy ngày, đều quá SLA, cùng Bước kiểm tra trên 60 phút làm việc.
2. Giám đốc mở phần I, xem bước chậm, thời gian, số ticket và liên kết bằng chứng theo quyền.
3. Giám đốc chấp nhận/từ chối, thấy quyết định ghi người và thời điểm. Nhánh chấp nhận trong demo tạo **nháp** SOP và việc rà soát.
4. Tiên chuyển phiên Người duyệt tri thức trong Odoo; người duyệt xem nháp và phê duyệt.
5. **Điểm nhấn demo:** Kho tài nguyên hiện phiên bản SOP được duyệt; nháp chưa bao giờ hiện là chính sách có hiệu lực. Dashboard giữ đường về ticket nguồn.

Hai ticket hoặc bước có thời lượng đúng 60 phút làm việc không tạo khuyến nghị; từ chối không công bố SOP. Xem FR-11/12.

### UJ-3. Một người mới đóng góp cho DX-OS.

1. Minh, một sinh viên chưa tham gia dự án, mở kho công khai và đọc hướng dẫn “đóng góp đầu tiên”.
2. Minh chạy cấu hình phát triển nhẹ và nạp dữ liệu mẫu mà không tải mô hình AI.
3. Nếu thiết lập thiếu biến môi trường, hướng dẫn chỉ đúng biến còn thiếu và cách kiểm tra lại; Minh sửa rồi chạy lát cắt DX-Ticket.
4. Minh đổi một mẫu thông báo, chạy kiểm thử liên quan và thấy kiểm thử thất bại khi hành vi bị làm sai.
5. Minh sửa thay đổi, kiểm thử đạt và gửi pull request theo mẫu. **Bằng chứng hoàn tất:** người duy trì có thể dựng lại thay đổi và thấy bằng chứng kiểm thử từ hướng dẫn, không cần khởi chạy toàn bộ hệ thống.

### Luồng phụ — Trưởng nhóm rà soát CSAT thấp

1. Sau khi khách gửi 1–2 sao, Lan, Trưởng nhóm của ticket, nhận một `odoo-work-item` có mã ticket và điểm dạng chữ.
2. Lan mở hồ sơ theo quyền, xem lịch sử và phản hồi; nếu không còn quyền, màn từ chối không lộ dữ liệu và chỉ đường liên hệ quản trị viên.
3. Lan ghi kết quả rà soát và hoàn thành việc; chưa có phản hồi CSAT vẫn hiển thị là “Chưa phản hồi”, không tạo việc giả.

### Vận hành nền — Bản chốt ngày

Bản chốt ngày không tạo thêm màn thao tác chính. Dashboard hiển thị thời điểm dữ liệu và kỳ; người có quyền có thể đối chiếu chỉ số với ticket nguồn. Việc tạo bản chốt, phiên bản định nghĩa chỉ số và dấu nguồn là hành vi hệ thống theo FR-10.
