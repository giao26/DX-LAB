# Báo cáo kiểm tra UX — DX-LAB

- **DESIGN.md:** `DESIGN.md`
- **EXPERIENCE.md:** `EXPERIENCE.md`
- **Thời điểm:** 2026-09-19

## Kết luận

Vòng kiểm tra ban đầu phát hiện hợp đồng UX chưa đủ chi tiết cho thành phần, trạng thái lỗi và khả năng truy cập. Các phát hiện mức cao đã được đưa vào hai spine: chuẩn hóa tên thành phần, bổ sung khôi phục lỗi, hành trình UJ-3, bảng dữ liệu tương đương biểu đồ, ngữ nghĩa lỗi form và tiêu chí kiểm tra Odoo.

## Kết quả theo nhóm

- Độ phủ hành trình — đã sửa
- Token thiết kế — đã sửa
- Độ phủ thành phần — đã sửa
- Trạng thái và khôi phục — đã sửa
- Tham chiếu hình ảnh — đã sửa
- Cô đọng nội dung — đạt
- Kế thừa nguồn — đã sửa
- Cấu trúc tài liệu — đạt
- Khả năng truy cập — đã đưa thành tiêu chí nghiệm thu; phải kiểm tra lại trên sản phẩm chạy thật

## Các điểm cần xác minh khi triển khai

- Widget Odoo thực tế cho xác nhận loại, ghi bước, Đóng và duyệt SOP phải được thử bằng bàn phím, trình đọc màn hình, ở 320 CSS px và zoom 200%.
- Tương phản phải được đo lại trên thành phần đã render, gồm focus, cảnh báo, lỗi và biểu đồ.
- Tên bước nghiệp vụ của từng loại ticket được process owner cấu hình trước khi chia story.

## Tệp reviewer

- `review-rubric.md`
- `review-accessibility.md`
- `review-structure.md`
- `review-prose.md`
