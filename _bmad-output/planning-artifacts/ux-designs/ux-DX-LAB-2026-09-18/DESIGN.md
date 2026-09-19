---
name: DX-OS
description: Ngôn ngữ hình ảnh Công nghệ mở cho Portal, form và Dashboard DX-OS.
status: final
created: 2026-09-18
updated: 2026-09-19
sources:
  - ../../prds/prd-dx-lab-2026-09-18/prd.md
colors:
  primary: '#2854E8'
  on-primary: '#FFFFFF'
  accent: '#16B8C9'
  on-accent: '#062C37'
  ink: '#17233F'
  background: '#F5F8FF'
  surface: '#FFFFFF'
  border: '#C7D2E5'
  muted: '#52617D'
  focus: '#173CB5'
  success: '#177A4D'
  success-surface: '#EAF8F1'
  warning: '#8A5200'
  warning-surface: '#FFF4D6'
  error: '#B42318'
  error-surface: '#FDECEA'
  disabled: '#6B7280'
  disabled-surface: '#E5E7EB'
typography:
  body:
    fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  heading:
    fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif'
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.25'
  metric:
    fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif'
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 6px
  md: 10px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '6': 24px
  '8': 32px
components:
  primary-action:
    background: '{colors.primary}'
    foreground: '{colors.on-primary}'
    radius: '{rounded.sm}'
  space-tile:
    background: '{colors.surface}'
    foreground: '{colors.ink}'
    radius: '{rounded.md}'
  ticket-form:
    background: '{colors.surface}'
    foreground: '{colors.ink}'
    border: '{colors.border}'
    radius: '{rounded.sm}'
  status-label:
    foreground: '{colors.ink}'
    radius: '{rounded.sm}'
  data-view:
    background: '{colors.surface}'
    foreground: '{colors.ink}'
    border: '{colors.border}'
    radius: '{rounded.md}'
  ai-recommendation:
    background: '{colors.success-surface}'
    foreground: '{colors.ink}'
    border: '{colors.accent}'
    radius: '{rounded.md}'
  odoo-work-item:
    note: 'Kế thừa Odoo; DX-OS chỉ yêu cầu mã ticket, nhãn trạng thái bằng văn bản, hành động chính và focus dễ nhận biết.'
---

# DX-OS — Design Spine

## Brand & Style

Người dùng chọn hướng **Công nghệ mở**, biến thể **A · Xanh tin cậy**. Portal, form khách và Dashboard là giao diện web DX-OS tùy biến nhẹ, dùng HTML/CSS và thành phần web có ngữ nghĩa thay vì phụ thuộc một bộ giao diện chưa được chọn. Chúng có cùng bản sắc: sáng, rõ, tin cậy, cho thấy công việc và bằng chứng truy xuất được qua H→P→D→I. Ảnh Google/AppSheet trong `imports/` là tham chiếu nội dung và thao tác, không phải mẫu sao chép diện mạo. Odoo là không gian nhân viên, nhắn tin và duyệt SOP; giữ quy ước thị giác Odoo, nối bằng tên DX-OS, mã ticket và nhãn trạng thái bằng văn bản nhất quán.

Mẫu màu được giữ tại [color-themes.html](mockups/color-themes.html); bố cục chủ đạo tại [Portal tổng quan](mockups/portal.html), [Dashboard D/I](mockups/dashboard.html), [Odoo xử lý ticket](mockups/odoo-ticket.html) và [Odoo duyệt SOP](mockups/odoo-sop-review.html).

## Colors

- `{colors.primary}` cobalt `#2854E8`: nhận diện và hành động ưu tiên trên Portal, form, Dashboard; chữ dùng `{colors.on-primary}`.
- `{colors.accent}` cyan `#16B8C9`: điểm nhấn phụ cho luồng H→P→D→I, dùng với `{colors.on-accent}`. Cyan không có nghĩa thành công hoặc AI đã được phê duyệt.
- `{colors.ink}` trên `{colors.background}` hoặc `{colors.surface}` là cặp đọc chính. Mặt trắng trên nền xanh rất nhạt tách vùng mà không làm dashboard dày đặc.
- SLA, lỗi, chờ duyệt và CSAT phải có chữ/biểu tượng; màu không là tín hiệu duy nhất. `{colors.error}`/`{colors.error-surface}`, `{colors.warning}`/`{colors.warning-surface}`, `{colors.success}`/`{colors.success-surface}` và `{colors.focus}` mang vai trò ngữ nghĩa.
- Các cặp đã đo: chữ trắng trên `{colors.primary}` 5.96:1; `{colors.on-accent}` trên `{colors.accent}` 6.48:1; `{colors.ink}` trên trắng 15.57:1. Mục tiêu tối thiểu: 4.5:1 cho chữ thường, 3:1 cho chữ lớn và chỉ dấu không phải chữ; focus phải đạt 3:1 với nền kề.

## Typography

Chữ hệ thống hỗ trợ tiếng Việt; `heading`, `body`, `metric` là vai trò dự thảo cùng một họ sans-serif. Trên màn chiếu, mã ticket và ba chỉ số đầu Dashboard phải đọc được từ xa. Con số đi cùng tên, kỳ và đơn vị/mẫu số. Không dùng chữ in hoa dài cho trạng thái và SOP.

## Layout & Spacing

Portal mở bằng bốn đích H/P/D/I có thể bấm. H và P mở hai trang tổng hợp riêng; D và I là hai phần của cùng một ứng dụng Dashboard dành cho Giám đốc. Form khách ưu tiên một cột, nhãn trên trường. Dashboard ưu tiên hàng ba chỉ số **ticket mới**, **ticket quá SLA**, **CSAT**, tiếp đến biểu đồ và khoan sâu. Khoảng cách theo bước 4/8/12/16/24/32 px. Từ 1024 px dùng bố cục desktop; 768–1023 px giảm cột; dưới 768 px xếp một cột. Mọi màn phải tự dàn lại ở 320 CSS px và zoom 200% mà không cuộn ngang cho tác vụ chính.

## Elevation & Depth

Mặt trắng trên `{colors.background}` phân tầng Portal, form và Dashboard. Dùng viền 1 px `{colors.border}` và bóng nhẹ `0 4px 16px rgba(23,35,63,.06)` cho thẻ nổi. Biểu đồ dùng độ tương phản và kích thước thấp hơn ba thẻ KPI đầu.

## Shapes

Ô H/P/D/I và thẻ chỉ số dùng `{rounded.md}`; trường và nút dùng `{rounded.sm}`. Dùng bán kính 6–10 px; không dùng dạng viên thuốc cho thẻ lớn. Nhãn trạng thái có thể nhỏ, nhưng chữ trạng thái vẫn là tín hiệu chính.

## Components

| Thành phần | Quy tắc thị giác |
|---|---|
| `space-tile` | Diện bấm rõ, ký tự và tên không gian đầy đủ; cấu trúc `{components.space-tile}`; focus dùng `{colors.focus}`. |
| `primary-action` | `{components.primary-action}` cho một hành động tiếp theo rõ nhất trong vùng; trạng thái disabled dùng cặp token disabled. |
| `ticket-form` | `{components.ticket-form}`; nhãn cố định trên trường, bắt buộc và lỗi bằng chữ; tệp hiện loại/giới hạn; lỗi dùng cặp token error. |
| `status-label` | `{components.status-label}`; luôn có chữ cho Chờ xử lý, Đang xử lý, Đóng, quá SLA, chờ duyệt, lỗi gửi. Màu chỉ hỗ trợ. |
| `data-view` | `{components.data-view}` bao gồm thẻ KPI, biểu đồ và bảng dữ liệu tương đương. KPI: tên, số bằng `{typography.metric.fontSize}`, kỳ, mẫu số/ngữ cảnh và đường tới dữ liệu nguồn. |
| `ai-recommendation` | `{components.ai-recommendation}`; tách vùng bằng chứng, quyết định Giám đốc, nháp SOP và trạng thái duyệt; không vẽ AI như quyết định đã thi hành. |
| `odoo-work-item` | Kế thừa Odoo cho thông báo, ticket và việc duyệt SOP. DX-OS yêu cầu mã ticket nổi bật, nhãn trạng thái bằng văn bản, hành động chính, lỗi gửi/thử lại và nhãn Nháp/Đã duyệt. |

## Do's and Don'ts

| Nên | Tránh |
|---|---|
| Giữ palette và kiểu thẻ nhất quán giữa Portal, form, Dashboard | Sao chép chrome Google Sites, Forms, Looker Studio |
| Ghi mã ticket, vai trò, nguồn và trạng thái | Chỉ dùng màu/biểu tượng để giải thích kết quả |
| Dẫn mắt từ tổng quan đến bằng chứng | Lấp màn chiếu bằng bảng dày ở lớp đầu Dashboard |
| Giữ Odoo dễ nhận diện là không gian tác nghiệp | Ép Odoo thành bản sao Portal |

**Thứ tự ưu tiên:** khi mockup hoặc ảnh tham chiếu mâu thuẫn với hai tài liệu này, quy tắc trong `DESIGN.md` và `EXPERIENCE.md` được ưu tiên.
