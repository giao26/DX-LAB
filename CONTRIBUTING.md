# Hướng Dẫn Đóng Góp Vào Dự Án DX-LAB (DX-OS)

Chào mừng bạn tham gia đóng góp cho dự án **DX-LAB**! Chúng tôi trân trọng mọi đóng góp từ cộng đồng nguồn mở, bao gồm báo lỗi, đề xuất tính năng, cải thiện tài liệu và đóng góp mã nguồn.

---

## 1. Nguyên Tắc Cơ Bản
1. **Tuân thủ Giấy phép**: Mọi đóng góp mã nguồn mặc định được phát hành theo giấy phép **GNU AGPLv3**.
2. **Gắn Header Bản quyền**: Mỗi tệp mã nguồn mới bắt buộc phải chứa đoạn header thông báo bản quyền chuẩn của dự án (tránh vi phạm tiêu chí PoF).
3. **Không Bundle mã nguồn ngoài trái phép**: Mọi thư viện bên thứ ba phải được quản lý qua package manager chuẩn (`requirements.txt`, `package.json`, Dockerfile), không copy mã nguồn đã sửa đổi trực tiếp vào repo.

---

## 2. Quy Trình Làm Việc (Git Workflow)
1. **Fork** kho mã nguồn về tài khoản cá nhân của bạn.
2. Tạo nhánh tính năng (feature branch) từ nhánh `main`:
   ```bash
   git checkout -b feature/ten-tinh-nang
   # hoặc
   git checkout -b fix/ten-loi
   ```
3. Tuân thủ quy ước đặt tên commit ([Conventional Commits](https://www.conventionalcommits.org/)):
   - `feat: thêm node xác thực dữ liệu trên Node-RED`
   - `fix: sửa lỗi kết nối PostgreSQL trong Odoo addon`
   - `docs: cập nhật tài liệu hướng dẫn cài đặt BUILD.md`
   - `refactor: tái cấu trúc pipeline Haystack RAG`
4. Kiểm tra mã nguồn cục bộ:
   ```bash
   make test
   ```
5. Đẩy nhánh lên fork và tạo **Pull Request (PR)** về nhánh `main` của repo gốc.
6. Điền đầy đủ thông tin vào mẫu **Pull Request Template**.

---

## 3. Báo Cáo Lỗi (Bug Tracker)
Khi phát hiện sự cố, vui lòng tạo Issue trên GitHub bằng mẫu **Bug Report**:
- Mô tả chi tiết các bước tái hiện lỗi.
- Hành vi mong đợi và hành vi thực tế.
- Ảnh chụp màn hình hoặc log liên quan.
- Môi trường chạy (HĐH, phiên bản Docker, v.v.).

---

## 4. Bộ Quy Tắc Ứng Xử
Mọi người tham gia đóng góp đều phải tuân thủ các quy định trong [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
