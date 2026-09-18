# Xử lý phát hiện rà soát PRD

Ngày 2026-09-18. Nguồn: `review-rubric.md`, `review-editorial.md` và các bản đối chiếu đầu vào.

| Mức | Phát hiện | Kết quả trong PRD |
|---|---|---|
| Cao | Khách được hứa theo dõi trạng thái nhưng thiếu tính năng | Bỏ lời hứa theo dõi; chỉ email xác nhận/kết quả và CSAT trong bản dự thi. |
| Cao | Quyền xem liên hệ khách của Nhân viên chưa rõ | FR-9 giới hạn danh sách Nhóm đã che dữ liệu; Người phụ trách và quản lý có quyền mới xem chi tiết. |
| Cao | “Chậm cùng bước” chưa tính được | Người dùng chốt trên 60 phút làm việc; FR-11 thêm cửa sổ 7 ngày, ticket quá SLA và các trường hợp âm tính. |
| Cao | Trình tự AI, phân công và xác nhận mâu thuẫn | FR-5/6 và UJ-1 thống nhất AI gợi ý → phân công tạm → Nhân viên xác nhận; sửa loại có chuyển Nhóm và ghi lịch sử. |
| Vừa | CSAT, vai trò quản lý và SOP reviewer lẫn tên | §3, FR-8/9/12 định nghĩa tỷ lệ CSAT, Trưởng nhóm, Trưởng phòng và Người duyệt tri thức. |
| Vừa | Bản chốt ngày và nguồn chỉ số khó đối soát | FR-10 yêu cầu kỳ, phạm vi, phiên bản chỉ số, dấu nguồn và định nghĩa chung với dashboard/AI. |
| Vừa | Phân công tạm làm sai bộ đếm công bằng | FR-6 chỉ tăng lượt giao chính thức khi Nhân viên xác nhận. |
| Vừa | Phạm vi trình diễn và PoF thiếu bằng chứng | §5–7 thêm release/build/phụ thuộc, dữ liệu mẫu, tình huống lỗi và hành trình đóng góp. |

Các câu hỏi còn mở tại PRD §8 đã có chủ sở hữu và thời điểm rà soát; không chặn phạm vi demo đã đặc tả.
