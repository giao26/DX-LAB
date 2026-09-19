# Rà soát văn phong UX — DX-OS

Phạm vi: `DESIGN.md` và `EXPERIENCE.md`. Lăng kính: độ rõ của tiếng Việt, thuật ngữ nhất quán, câu có thể triển khai được, điểm mơ hồ và từ tiếng Anh chưa cần thiết. Không đánh giá lại quyết định sản phẩm.

## Kết luận

Hai tài liệu đã có cấu trúc tốt và phần lớn quy tắc đủ cụ thể để đội thiết kế, phát triển và kiểm thử cùng sử dụng. Trước khi chốt, nên sửa **2 vấn đề mức cao**, **6 vấn đề mức trung bình** và một nhóm chỉnh sửa mức thấp. Hai vấn đề mức cao có thể làm đội triển khai hiểu sai đường điều hướng và trạng thái email.

## Phát hiện

| Mức độ | Vị trí | Phát hiện | Cách sửa đề nghị |
|---|---|---|---|
| **Cao** | `EXPERIENCE.md:24`, UJ-1 bước 2 | Mục đích trang H ghi “không quay vòng về Portal”, nhưng UJ-1 yêu cầu Tiên trở lại Portal để chọn P. Câu hiện tại có thể bị hiểu là trang H không có đường quay lại, làm đứt luồng demo. | Đổi thành: “Hiển thị thông báo theo quyền và đường tới Resources/Odoo; luôn có đường quay lại DX-Portal.” Nếu ý định là tránh liên kết vòng lặp tự động, ghi rõ “không tự chuyển hướng”. |
| **Cao** | `EXPERIENCE.md:27,62,74,130` | “Trạng thái email” không cho biết đó là trạng thái ticket gửi qua email hay trạng thái gửi thư. Đây là hai dữ liệu khác nhau và ảnh hưởng trực tiếp đến thông báo thành công. | Dùng nhất quán “trạng thái gửi email xác nhận” ở luồng tạo ticket. Nếu email chứa trạng thái ticket, viết riêng: “mã ticket, trạng thái ticket và kết quả gửi email xác nhận”. |
| **Trung bình** | `DESIGN.md:111`; `EXPERIENCE.md:15,35` | “D và I là hai phần trong Dashboard riêng” và “cùng Dashboard riêng” khó đọc, có thể bị hiểu là hai dashboard tách biệt. | Dùng một câu thống nhất: “D và I là hai phần của cùng một ứng dụng Dashboard dành cho Giám đốc.” |
| **Trung bình** | `EXPERIENCE.md:59–60` | Hai hàng “Ô H/P/D/I” và ``space-tile`` mô tả cùng một hành vi, tạo hai nguồn quy tắc trùng nhau. | Giữ hàng ``space-tile`` và xóa hàng “Ô H/P/D/I”, hoặc đổi hàng đầu thành quy tắc riêng về nội dung từng ô nếu thực sự cần. |
| **Trung bình** | `EXPERIENCE.md:80–81` | “Bị từ chối quyền” và “Quyền bị từ chối/thu hồi” là hai trạng thái gần như trùng nhau; một hàng thiếu hành vi focus và hành động phục hồi. | Gộp thành “Không có quyền hoặc quyền đã bị thu hồi”, giữ toàn bộ quy tắc không lộ dữ liệu, chuyển focus tới tiêu đề lỗi và cung cấp “Quay lại”/“Liên hệ quản trị viên”. |
| **Trung bình** | `DESIGN.md:86,131`; `EXPERIENCE.md:15` | Tài liệu đổi qua lại giữa “mã hồ sơ” và “mã ticket”, “trạng thái chữ” và các cách diễn đạt khác. Hệ thống hiện được đặc tả quanh ticket nên “mã hồ sơ” mở rộng nghĩa không cần thiết. | Dùng “mã ticket” và “nhãn trạng thái bằng văn bản” xuyên suốt. Chỉ dùng “hồ sơ” khi thực sự nói tới toàn bộ bản ghi nghiệp vụ. |
| **Trung bình** | `EXPERIENCE.md:63` | “Thông báo lịch sự cho công nghệ hỗ trợ” không phải thuật ngữ khả dụng; “lịch sự” không mô tả cách công nghệ hỗ trợ nhận thay đổi bất đồng bộ. | Đổi thành: “Thay đổi bất đồng bộ phải có nhãn bằng văn bản tồn tại trên màn hình và được thông báo qua vùng trạng thái cho công nghệ hỗ trợ.” Có thể thêm `aria-live="polite"` ở ghi chú kỹ thuật, không đưa vào microcopy. |
| **Trung bình** | `EXPERIENCE.md:75` so với phạm vi “không có offline” | “Báo đang ngoại tuyến” dễ khiến người đọc nghĩ sản phẩm có chế độ ngoại tuyến, trong khi phần Foundation loại trừ offline. | Đổi tên trạng thái thành “Mất kết nối mạng” và nội dung thành “Báo không thể kết nối; không xác nhận thành công…”. Như vậy mô tả lỗi mạng mà không ngụ ý hỗ trợ làm việc ngoại tuyến. |
| **Trung bình** | `EXPERIENCE.md:85,145` | “Bước đúng 60 phút” không tự nhiên và thiếu danh từ “thời lượng”. | Đổi thành “bước có thời lượng đúng 60 phút làm việc”. Giữ rõ điều kiện kích hoạt là **trên** 60 phút. |
| **Thấp** | Toàn bộ hai tài liệu | Có nhiều từ tiếng Anh không cần thiết hoặc chưa giải thích: `spine`, `focus`, `reflow`, `palette`, `chrome`, `disabled`, `token`, `widget`, `breakpoint`, `app native`, `process owner`, `story`, `microcopy`, `climax`. Chúng làm tài liệu khó đọc với thành viên không chuyên UX. | Việt hóa trong phần văn xuôi: “tài liệu trục”, “điểm tập trung bàn phím”, “tự dàn lại”, “bảng màu”, “khung giao diện”, “vô hiệu hóa”, “biến thiết kế”, “thành phần Odoo”, “điểm ngắt”, “ứng dụng cài đặt”, “chủ quy trình”, “user story/câu chuyện triển khai”, “nội dung giao diện”, “điểm nhấn”. Giữ khóa kỹ thuật trong dấu mã nếu đó là tên máy. |
| **Thấp** | `DESIGN.md:95,142`; `EXPERIENCE.md:165` | “Các spine thắng…” và “hai spine … thắng” mang giọng nói nội bộ, không diễn đạt rõ thứ tự ưu tiên tài liệu. | Đổi thành: “Khi mockup hoặc ảnh tham chiếu mâu thuẫn với hai tài liệu này, quy tắc trong `DESIGN.md` và `EXPERIENCE.md` được ưu tiên.” |
| **Thấp** | `DESIGN.md:114,119` | “Biểu đồ và bằng chứng không cạnh tranh…” và “Góc bo … gợi công cụ vận hành” là mô tả cảm tính, khó kiểm thử. | Viết thành kết quả quan sát được: “Biểu đồ dùng độ tương phản và kích thước thấp hơn thẻ KPI đầu” và “Dùng bán kính 6–10 px; không dùng dạng viên thuốc cho thẻ lớn”. |
| **Thấp** | `DESIGN.md:133`; `EXPERIENCE.md:41` | Tiêu đề “Do's and Don'ts”, “Voice and Tone” và các thuật ngữ tiếng Anh không nhất quán với tài liệu tiếng Việt. | Đổi thành “Nên và tránh”, “Giọng điệu và cách viết”. Nếu cần tiếng Anh cho cộng đồng, ghi trong ngoặc ở lần đầu. |
| **Thấp** | `EXPERIENCE.md:35,37` | Ghi chú `[NOTE FOR UX: ...]` xen giữa văn bản và dùng “process owner”, “story” khiến tài liệu trông chưa hoàn thiện dù nội dung đã có người chịu trách nhiệm. | Chuyển thành mục rõ: “Điểm cần chốt trước triển khai: Chủ quy trình xác nhận tên và điều kiện hoàn tất của từng bước trước khi viết user story.” |
| **Thấp** | `EXPERIENCE.md:133,143,153` | Nhãn **Climax** lặp lại trong các luồng. Nghĩa đúng với cấu trúc kể chuyện, nhưng lệch khỏi giọng tài liệu đặc tả. | Đổi thành **Điểm nhấn demo** ở UJ-1/UJ-2 và **Bằng chứng hoàn tất** ở UJ-3. |

## Chuẩn hóa thuật ngữ đề nghị

| Hiện tại | Dùng thống nhất |
|---|---|
| mã hồ sơ / mã ticket | **mã ticket** |
| trạng thái chữ | **nhãn trạng thái bằng văn bản** |
| trạng thái email | **trạng thái gửi email xác nhận** |
| focus | **điểm tập trung bàn phím**; giữ `focus` trong tên token kỹ thuật |
| Dashboard riêng / cùng Dashboard riêng | **cùng một ứng dụng Dashboard dành cho Giám đốc** |
| offline / ngoại tuyến trong lỗi mạng | **mất kết nối mạng** |
| Resources | **Kho tài nguyên (Resources)** ở lần đầu, sau đó dùng **Kho tài nguyên** |
| process owner | **chủ quy trình** |
| Climax | **Điểm nhấn demo** hoặc **Bằng chứng hoàn tất** |

## Thứ tự sửa

1. Sửa mâu thuẫn đường quay lại Portal và làm rõ trạng thái gửi email.
2. Gộp các hàng trùng, chuẩn hóa Dashboard D/I, quyền truy cập và mã ticket.
3. Việt hóa phần văn xuôi; giữ tên khóa kỹ thuật trong dấu mã.
4. Đổi các câu cảm tính thành quy tắc quan sát hoặc kiểm thử được.

Sau các chỉnh sửa trên, văn phong đủ rõ để chuyển sang kiến trúc và viết story mà không cần một vòng rà soát prose khác.
