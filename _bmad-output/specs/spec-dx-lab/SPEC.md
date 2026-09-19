---
id: SPEC-dx-lab
companions:
  - business-rules.md
  - acceptance-matrix.md
  - ../../planning-artifacts/ux-designs/ux-DX-LAB-2026-09-18/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-DX-LAB-2026-09-18/EXPERIENCE.md
  - ../../planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md
  - ../../planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/TECHNOLOGY-SOURCES.md
sources:
  - ../../planning-artifacts/prds/prd-dx-lab-2026-09-18/prd.md
---

> **Hợp đồng chuẩn.** SPEC này cùng các tệp trong `companions:` là hợp đồng đầy đủ để xây dựng, kiểm thử và thẩm định DX-LAB. PRD trong `sources:` chỉ phục vụ truy vết nguồn.

# DX-LAB — DX-OS nguồn mở cho OLP 2026

## Vì sao

DX-LAB phải chứng minh một sự vụ thực tế có thể đi xuyên suốt Không gian Con người **[H]**, Quy trình **[P]**, Dữ liệu **[D]** và Trí tuệ **[I]** bằng cùng một hồ sơ có thể truy vết. Bản demo phục vụ OLP 2026 phải thể hiện phân công công bằng, SLA, phân quyền, dữ liệu điều hành và cải tiến SOP có AI hỗ trợ nhưng do con người quyết định; đồng thời người ngoài đội có thể dựng, kiểm thử và đóng góp từ mã nguồn mở.

## Năng lực

- **CAP-1 — Điều hướng DX-Portal**
  - **Mục đích:** Người dùng có thể từ tổng quan H→P→D→I mở đúng trang quy trình, thư viện tri thức và không gian làm việc được phép.
  - **Điều kiện đạt:** Mọi mục điều hướng mở đúng chức năng và tài liệu nháp không xuất hiện như tri thức đã công bố.

- **CAP-2 — Tri thức đã phê duyệt**
  - **Mục đích:** Nhân viên có thể tìm và nhận biết phiên bản, trạng thái của SOP/FAQ đang có hiệu lực.
  - **Điều kiện đạt:** Resources và AI chính thức chỉ sử dụng phiên bản đã xuất bản; bản nháp vẫn tách biệt.

- **CAP-3 — Thông báo nội bộ theo quyền**
  - **Mục đích:** Nhân viên được giao việc nhận thông báo Odoo dẫn tới đúng ticket trong phạm vi được phép.
  - **Điều kiện đạt:** Một sự kiện chỉ tạo một thông báo ngữ nghĩa; quyền được kiểm tra lại khi mở hồ sơ và lỗi gửi có thể theo dõi, thử lại.

- **CAP-4 — Tiếp nhận ticket hợp lệ**
  - **Mục đích:** Khách hàng có thể gửi thông tin liên hệ, loại yêu cầu, mô tả và một tệp ảnh hoặc PDF để tạo yêu cầu hỗ trợ.
  - **Điều kiện đạt:** Dữ liệu sai không tạo ticket; dữ liệu hợp lệ nhận mã và thời điểm hệ thống, liên kết hồ sơ khách an toàn và lưu trạng thái email xác nhận.

- **CAP-5 — AI phân loại có người xác nhận**
  - **Mục đích:** AI có thể đề xuất Khiếu nại, Tư vấn hoặc Bảo hành từ nội dung mô tả để nhân viên xác nhận hoặc sửa trước khi xử lý.
  - **Điều kiện đạt:** Hệ thống lưu loại khách chọn, loại AI đề xuất, loại cuối cùng và dấu vết xác nhận; khi AI lỗi vẫn phân công tạm được và việc sửa loại chuyển giao đúng nhóm.

- **CAP-6 — Phân công công bằng**
  - **Mục đích:** Hệ thống phân đều ticket cho nhân viên sẵn sàng trong nhóm phù hợp, không giao đồng thời quá năng lực.
  - **Điều kiện đạt:** Phân công tuân theo số lượt nhận chính thức, vòng ID tăng dần, giữ chỗ nguyên tử và hàng đợi FIFO kể cả khi nhiều ticket đến đồng thời.

- **CAP-7 — Vòng đời và SLA**
  - **Mục đích:** Người phụ trách có thể ghi các bước xử lý và đưa ticket qua Chờ xử lý, Đang xử lý và Đóng trong thời hạn hai giờ làm việc.
  - **Điều kiện đạt:** Chưa xác nhận loại thì không thể xử lý; thiếu kết quả thì không thể đóng; mọi khoảng chờ được tính đúng lịch và mọi đính chính có lịch sử trước/sau.

- **CAP-8 — Đóng ticket và CSAT**
  - **Mục đích:** Khi ticket đóng, khách hàng nhận kết quả và có thể đánh giá 1–5 sao bằng liên kết riêng của ticket.
  - **Điều kiện đạt:** Lời mời không gửi trùng; chưa phản hồi khác với điểm thấp; đánh giá 1–2 sao tạo đúng một việc rà soát cho trưởng nhóm.

- **CAP-9 — Quyền xem theo trách nhiệm**
  - **Mục đích:** Mỗi tác nhân chỉ xem ticket, chỉ số, thông tin liên hệ và tệp phù hợp với vai trò, nhóm và trách nhiệm được giao.
  - **Điều kiện đạt:** API, Odoo, tệp, dữ liệu xuất và dashboard đều từ chối truy cập chéo phạm vi; thu hồi quyền có hiệu lực trên dữ liệu cũ.

- **CAP-10 — Dashboard và bản chốt ngày**
  - **Mục đích:** Người có quyền có thể xem và truy ngược các chỉ số ticket mới, tồn đọng, đóng, SLA, thời gian theo bước và CSAT.
  - **Điều kiện đạt:** Thay đổi đã ghi xuất hiện trong 60 giây và mỗi bản chốt ngày lưu kỳ dữ liệu, phạm vi, phiên bản chỉ số cùng dấu truy vết nguồn.

- **CAP-11 — Phát hiện điểm nghẽn có bằng chứng**
  - **Mục đích:** Hệ thống có thể phát hiện mẫu chậm lặp lại và tạo phân tích có ticket dẫn chứng cho giám đốc.
  - **Điều kiện đạt:** Chỉ ít nhất ba ticket Bảo hành quá SLA trong bảy ngày, cùng có bước kiểm tra trên 60 phút làm việc, mới kích hoạt; cùng bằng chứng không tạo khuyến nghị trùng.

- **CAP-12 — Cải tiến SOP có phê duyệt**
  - **Mục đích:** Giám đốc có thể quyết định với khuyến nghị, sau đó AI soạn bản nháp SOP để người duyệt tri thức rà soát.
  - **Điều kiện đạt:** Quyết định được ghi lịch sử; bản nháp không có hiệu lực; chỉ phiên bản được phê duyệt mới vào Resources và chỉ mục AI.

- **CAP-13 — Hành trình đóng góp đầu tiên**
  - **Mục đích:** Người mới có thể chạy một lát cắt DX-Ticket, sửa một quy tắc hoặc mẫu thông báo, kiểm thử và gửi pull request.
  - **Điều kiện đạt:** Luồng đóng góp không cần mô hình AI hay toàn bộ hệ thống và kiểm thử thất bại khi hành vi liên quan bị làm sai.

## Ràng buộc

- P là nơi duy nhất được thay đổi trạng thái nghiệp vụ chuẩn; các bề mặt còn lại dùng API hoặc sự kiện đã cam kết.
- Keycloak OIDC `sub` là định danh tác nhân; quyền được kiểm tra tại tài nguyên và hành động từ Odoo phải giữ cả người dùng lẫn ứng dụng gọi.
- AI chỉ tư vấn, nhận dữ liệu tối thiểu và không được tự đổi ticket, gửi quyết định ra ngoài hoặc công bố SOP.
- SLA là hai giờ làm việc theo lịch thứ Hai–thứ Sáu, 08:00–12:00 và 13:00–17:00 giờ Việt Nam, trừ ngày nghỉ cấu hình; mọi thời gian chờ đều được tính.
- Bản demo chạy trực tuyến trên web, tiếng Việt là ngôn ngữ chính, dùng được trên máy tính và điện thoại; giao diện tùy biến đạt mục tiêu WCAG 2.2 AA.
- Tệp đính kèm chỉ là một ảnh hoặc PDF tối đa 10 MB, được lưu riêng tư và chỉ truy cập qua kiểm tra quyền; PII và tệp không được đưa vào AI phân loại.
- Sự kiện và tác vụ gửi phải chịu được phát lại, có idempotency, outbox/inbox bền vững, thứ tự aggregate, retry và dead-letter; lịch sử kiểm toán chỉ được ghi nối tiếp.
- Dashboard, bản chốt ngày và đầu vào AI dùng cùng định nghĩa chỉ số và cùng phạm vi quyền do P cấp.
- Dự án giữ giấy phép AGPL-3.0, phụ thuộc và mô hình được khóa phiên bản/giấy phép, build được từ nguồn công khai và xuất dữ liệu chuẩn bằng định dạng mở.
- Môi trường phát triển, kiểm thử và demo tách dữ liệu, bí mật và cấu hình định danh; Caddy là lối vào công khai duy nhất.
- Sao lưu hằng ngày lúc 00:30 bao phủ dữ liệu nghiệp vụ, tệp và tri thức đã công bố; bản mã hóa thứ hai được lưu ngoài máy với chính sách 7 ngày, 4 tuần, 12 tháng và kiểm tra khôi phục hằng tháng.

## Ngoài phạm vi

- Thay thế đầy đủ ERP/CRM hoặc triển khai mọi nút nghiệp vụ trong DX-Portal mẫu.
- Cổng khách hàng theo dõi trạng thái ticket, đồng bộ ngoại tuyến, camera hoặc GPS.
- AI tự quyết định, tự công bố SOP, tự huấn luyện lại bằng dữ liệu khách hàng hoặc tự thực hiện hành động tài chính/đối ngoại.
- Lakehouse, data fabric, semantic layer cấp doanh nghiệp hoặc dự báo khối lượng khi chưa đủ lịch sử.
- Kubernetes, HA, đa vùng và trình diễn khôi phục sao lưu trực tiếp trong bản dự thi.

## Tín hiệu thành công

Người trình diễn tạo một ticket thật và theo cùng mã hồ sơ qua H→P→D→I, cho thấy dữ liệu sai và thao tác đóng thiếu kết quả bị chặn, phân công công bằng, xác nhận AI, SLA, quyền xem, dashboard cập nhật và vòng khuyến nghị–phê duyệt SOP có bằng chứng. Một người mới đồng thời có thể dựng lát cắt `core`, thay đổi cục bộ và chạy kiểm thử mà không tải mô hình AI.

## Giả định

- Dữ liệu lịch sử dùng cho tình huống điểm nghẽn được nạp trước và ghi nhãn rõ là dữ liệu mẫu.

## Câu hỏi mở

- Trước khi chia story xử lý ticket, tên và điều kiện hoàn tất chính xác của từng bước theo ba loại yêu cầu là gì? Quy trình Bảo hành phải có ít nhất một bước kiểm tra được tính thời gian.
- Trước khi đóng gói demo, tài khoản mẫu nào đại diện cho khách hàng, nhân viên, trưởng nhóm, trưởng phòng, giám đốc và người duyệt tri thức trong các phiên trình duyệt tách biệt?
- Khi đề chi tiết OLP 2026 được công bố vào tháng 11/2026, phạm vi hoặc kế hoạch phát hành nào phải điều chỉnh?
- Trước khi triển khai thực tế, thời hạn lưu ticket, tệp đính kèm và tri thức đã duyệt là bao lâu?
