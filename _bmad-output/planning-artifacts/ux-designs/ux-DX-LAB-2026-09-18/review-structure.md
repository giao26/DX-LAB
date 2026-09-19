# Kiểm tra cấu trúc UX — DX-OS

## Nhận định

Hai spine tồn tại để giúp nhóm thiết kế và triển khai tra cứu một hợp đồng UX thống nhất: `DESIGN.md` sở hữu diện mạo, còn `EXPERIENCE.md` sở hữu kiến trúc thông tin, hành vi, trạng thái, khả năng truy cập và hành trình. Mô hình đánh giá phù hợp nhất là **Reference/Database** vì người đọc sẽ tra cứu theo thành phần hoặc bề mặt thay vì đọc tuần tự.

Tổng thể đã đúng khuôn `$bmad-ux`: `DESIGN.md` có đủ tám phần theo đúng thứ tự khóa; `EXPERIENCE.md` có đủ tám phần bắt buộc và hai phần được kích hoạt cho đa nền tảng cùng ảnh tham chiếu. Nguồn PRD, bốn mockup và sáu ảnh tham chiếu đều tồn tại; tên thành phần chính đã đồng bộ giữa hai spine. Các điểm dưới đây cần xử lý trước khi chốt trạng thái `final`.

## Findings

| Mức độ | Pass | Vị trí/nguyên văn | Sửa đề nghị | Lý do và tác động từ |
|---|---|---|---|---|
| Cao | structure | Frontmatter của `DESIGN.md` và `EXPERIENCE.md`: `status: draft`, `updated: 2026-09-18` | **QUESTION/FIX:** Chỉ đổi cả hai thành `status: final`, `updated: 2026-09-19` sau khi các finding được giải quyết và sự kiện hoàn tất được ghi vào memlog. | Đây là blocker cấu trúc duy nhất đối với tuyên bố “UX đã ổn hết”. Không làm thay đổi số từ đáng kể. |
| Trung bình | structure | `EXPERIENCE.md` §Information Architecture: `[NOTE FOR UX: ... process owner ...]`, rồi đoạn kế tiếp lặp lại cùng phụ thuộc | **MERGE:** Giữ một câu không mang marker mở: “Tên và điều kiện hoàn tất từng bước nghiệp vụ là dữ liệu cấu hình do process owner chốt trước story triển khai; việc này không thay đổi mô hình màn hình.” | Marker mở mâu thuẫn với trạng thái final và thông tin bị lặp hai lần. Tiết kiệm khoảng 25–30 từ. Đây là phụ thuộc triển khai đã có chủ sở hữu, không phải blocker UX. |
| Trung bình | structure | `EXPERIENCE.md` §Key Flows UJ-1 bước 5 và §Luồng phụ CSAT: email/CSAT chỉ có “trạng thái gửi”, còn luồng phụ bắt đầu sau khi khách đã đánh giá | **MOVE/ADD:** Bổ sung một nhịp ngắn trong UJ-1 hoặc đầu luồng phụ: khách mở email, chọn 1–5 sao và nhận xác nhận; sau đó mới rẽ sang việc rà soát nếu điểm là 1–2. | Khép kín bề mặt “Email đóng + CSAT” trong IA và nối nguyên nhân với luồng rà soát. Tăng khoảng 20–25 từ nhưng loại bỏ khoảng trống hành trình của FR-8. |
| Thấp | structure | `EXPERIENCE.md` §Component Patterns: hai dòng `Ô H/P/D/I` và ``space-tile`` có hành vi giống hệt | **MERGE:** Xóa dòng tên tự do `Ô H/P/D/I`, giữ tên chuẩn ``space-tile`` và có thể ghi “ô H/P/D/I” trong mô tả. | Khôi phục mô hình một tên thành phần chuẩn xuyên hai spine. Tiết kiệm khoảng 17 từ. |
| Thấp | structure | `DESIGN.md` §Brand & Style kết thúc bằng “Các spine thắng…” và cuối tài liệu lặp lại `Quy tắc nguồn` | **CUT:** Bỏ câu ngắn trong §Brand & Style, giữ quy tắc nguồn một lần ở cuối tài liệu. | Cùng một quy tắc xuất hiện hai lần trong một tài liệu. Tiết kiệm khoảng 11 từ. |
| Thấp | structure | Frontmatter `DESIGN.md` có `components.metric-card`, trong khi hai bảng thành phần dùng `data-view` cho KPI/biểu đồ/bảng | **CONDENSE/CLARIFY:** Hoặc khai báo `metric-card` là thành phần con của `data-view` trong hàng `data-view`, hoặc bỏ token riêng nếu không có khác biệt cần kế thừa. | Tránh một token “mồ côi” khiến người triển khai không biết đây là thành phần độc lập hay cấu phần. Thay đổi gần như trung hòa số từ. |

## Điểm nên giữ

| Pass | Nội dung | Quyết định | Lý do |
|---|---|---|---|
| structure | `EXPERIENCE.md` §State Patterns (502 từ) | **PRESERVE** | Dài nhưng là bảng tra cứu MECE cho các lỗi quan trọng; không lặp nguyên văn các hành trình và phục vụ triển khai trực tiếp. |
| structure | Quy tắc nguồn ở cuối mỗi spine | **PRESERVE** | Hai tệp là hợp đồng ngang hàng và có thể được đọc độc lập; mỗi tệp cần tự tuyên bố ưu tiên hơn mockup/ảnh tham chiếu. |
| structure | §Responsive & Platform và §Inspiration & Anti-patterns trước §Key Flows | **PRESERVE** | Đây là hai phần được kích hoạt hợp lệ; chúng cung cấp ràng buộc nền tảng và tham chiếu trước khi người đọc đến hành trình cụ thể. |
| structure | Các ngưỡng FR-11 trong UJ-2 | **PRESERVE** | Dù bắt nguồn từ PRD, ngưỡng “ba ticket / trên 60 phút” cần xuất hiện trong hành trình để kịch bản demo và trạng thái I không bị diễn giải sai. |

## Kết luận

- **6 đề nghị:** 1 cao, 2 trung bình, 3 thấp.
- Nếu chấp nhận toàn bộ, hai tài liệu giảm ròng khoảng **35–40 từ** trên tổng **3.922 từ** (xấp xỉ **1%**); mục tiêu chính là đóng marker mở và làm rõ hợp đồng, không phải rút ngắn mạnh.
- Không phát hiện sai thứ tự section, link nguồn hỏng, mockup thiếu, hoặc bất nhất lớn giữa thành phần thị giác và hành vi.
- Sau khi xử lý finding cao và hai finding trung bình, không còn blocker cấu trúc để chốt UX.
