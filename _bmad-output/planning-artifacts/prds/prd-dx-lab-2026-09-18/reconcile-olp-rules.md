# Đối chiếu PRD với Thể lệ OLP Phần mềm nguồn mở 2026

Nguồn: `C:\Users\ADMIN\Downloads\Thể lệ cuộc thi phần mềm nguồn mở - OLP 2026.pdf`, trang 1–3. Đối chiếu với `prd.md` và `addendum.md` cùng thư mục, ngày 18/09/2026. Tài liệu này ghi **quy định cuộc thi** riêng với các lựa chọn thiết kế DX-LAB; chưa coi tài liệu tham khảo DX-OS hay đề thi chi tiết chưa công bố là yêu cầu bắt buộc.

## Yêu cầu đã được PRD ghi nhận

- **Điều kiện được chấm:** sản phẩm phát hành theo giấy phép OSI-approved và mã nguồn truy cập tự do trên Internet. PRD §1, §5, §6.1 đã ghi.
- **Kho mã, release, build và tài liệu:** PRD §5 ghi kho công khai, toàn văn giấy phép/thông báo trong tệp, kiểm tra giấy phép phụ thuộc, phát hành có phiên bản, hướng dẫn dựng từ mã nguồn, README, changelog và nơi ghi lỗi. FR-13 thêm hành trình đóng góp.
- **Trình diễn tại chung kết:** PRD §2.2 và §7 có hành trình demo H→P→D→I và tiêu chí kiểm tra. Thể lệ chấm 50 điểm trước chung kết từ kho mã và 50 điểm sản phẩm tại chung kết.

## Khoảng trống cần đưa vào PRD/kế hoạch thực hiện

1. **Mốc và thủ tục thi chưa đủ cụ thể.** Thể lệ yêu cầu đội do trường đăng ký, tối đa 3 thí sinh, có giảng viên dẫn dắt, tối đa 2 đội mỗi trường. Đề chi tiết công bố trước chung kết một tháng (lịch dự kiến tháng 11/2026); chấm kho mã ngày **07–09/12/2026**, trình diễn ngày **10/12/2026**. PRD chỉ nhắc chung “trước hạn nộp” và rà soát khi có đề. Nên đưa các mốc và người chịu trách nhiệm đăng ký, tạo release, đóng băng demo vào kế hoạch thi. Đây là điều kiện tham dự/kế hoạch, không nhất thiết là tính năng sản phẩm.
2. **Release và khả năng build chưa có tiêu chí nghiệm thu sát bảng PoF.** Thể lệ trừ điểm khi dùng định dạng phát hành không mở (nêu ví dụ zip/rar/arj), khi phải sửa header thủ công, không cấu hình được trước khi dịch, dùng công cụ nguồn đóng/tự tạo để dịch, hoặc chương trình chỉ chạy trong thư mục mã nguồn. PRD §5 mới nói “dựng lại” và cấu hình công khai. Cần một bước kiểm tra release/version, định dạng phân phối, build/cài đặt trên môi trường sạch và chạy từ thư mục khác.
3. **Phụ thuộc và gói kèm cần quy tắc cụ thể hơn.** Bảng PoF yêu cầu làm rõ thư viện/gói dùng; trừ điểm nếu không cố dùng thư viện sẵn trên hệ thống, phát hành kèm gói của dự án khác, hoặc sửa mã nguồn của gói kèm. PRD mới nhắc kê khai và tương thích giấy phép. Nên có danh mục phụ thuộc/giấy phép, chính sách không vendoring mặc định và kiểm tra artifact phát hành.
4. **Năm tiêu chí trình diễn sản phẩm chưa được theo dõi đầy đủ.** Thể lệ chấm tính nguyên gốc kỹ thuật, mức hoàn thiện, thân thiện người dùng, phát triển bền vững, phong cách trình diễn/thu hút cộng đồng nguồn mở, mỗi mục 10 điểm. PRD có hành trình demo và đóng góp nhưng chưa yêu cầu thể hiện rõ **đóng góp kỹ thuật riêng của đội** so với các thành phần tích hợp, bằng chứng sản phẩm hoàn thiện, tài liệu kỹ thuật và công cụ hỗ trợ cộng đồng trong kịch bản chấm.

## Điều cần tránh diễn đạt quá mức

- Chủ đề “Xây dựng hệ điều hành doanh nghiệp số (DX-OS)” đã công bố, nhưng **yêu cầu lập trình cụ thể do BTC/VFOSSA ra vào tháng 11**. Vì vậy DX-Ticket, H/P/D/I, Odoo, AI và quy tắc nghiệp vụ hiện là phạm vi sản phẩm do đội chọn, **chưa được xác nhận là yêu cầu bắt buộc của đề thi**. PRD §6.2 và §8 đã đặt giả định đúng; giữ cách diễn đạt đó khi cập nhật.
- Thể lệ chỉ yêu cầu ít nhất một release trước thời điểm nộp; lịch trong PDF nêu đợt chấm kho mã 07–09/12 nhưng không cho giờ hoặc ngày đóng nộp chính thức. Không suy ra hạn nộp chính xác từ lịch chấm.
