- source_spec: none
  summary: Story 1.2: Người mới dựng các profile tái lập mà không cần tải AI
  evidence: Tách ra từ yêu cầu ban đầu (triển khai 1.1 và 1.2) theo Scope Standard để đảm bảo mỗi spec tập trung vào một mục tiêu độc lập. Story 1.1 hoàn thiện cấu trúc repo và contracts trước khi dựng profile Compose 1.2.

- source_spec: _bmad-output/implementation-artifacts/spec-1-1-chuyen-ma-sang-cau-truc-kien-truc-chuan.md
  summary: Bổ sung định nghĩa container service p_process vào docker-compose.yml và cấu hình profile core
  evidence: Được tách và chuyển giao sang Story 1.2 (Người mới dựng các profile tái lập mà không cần tải AI) theo phân rã Epic 1. Story 1.1 tập trung vào cấu trúc mã nguồn, hợp đồng contracts và migration kỹ thuật.

- source_spec: `_bmad-output/implementation-artifacts/spec-thay-ollama-bang-openrouter.md`
  summary: Xác lập schema dữ liệu tối thiểu và chính sách loại bỏ PII cho luồng P→I trước khi dùng dữ liệu ticket thật.
  evidence: Adapter hiện loại `user_id`, giới hạn dữ liệu và che email/số điện thoại; caller P chưa được triển khai nên chưa thể xác minh tên, địa chỉ hoặc định danh thô có được truyền trong query hay không.

- source_spec: `_bmad-output/implementation-artifacts/spec-thay-ollama-bang-openrouter.md`
  summary: Quyết định retry/backoff và kiểm soát chi phí cho inference OpenRouter trong luồng P/outbox.
  evidence: Kiến trúc yêu cầu retry dependency có giới hạn, nhưng chưa định nghĩa số lần, điều kiện retry hoặc idempotency cho lời gọi inference trả phí; tự retry trong adapter có thể tăng chi phí hoặc tạo kết quả trùng.
- source_spec: `_bmad-output/implementation-artifacts/spec-hoan-tat-moi-truong-ai-haystack.md`
  summary: Ghi lệnh unit test Haystack đầy đủ trong hồ sơ hoàn tất để người bảo trì có thể tái hiện kết quả `35 passed`.
  evidence: Blind review xác nhận Implementation Notes ghi kết quả unit test nhưng chưa ghi nguyên lệnh `uv run --no-cache --locked --extra test pytest -q`; đây là thiếu sót tài liệu mức thấp và việc sửa spec được workflow định tuyến sang deferred work.

- source_spec: none
  summary: Xay dung lop D: du lieu phan tich, reporting views va dashboard Superset tu ket qua H+P.
  evidence: Nguoi dung chon tach pham vi de hoan thien truoc mot luong H+P doc lap va kiem thu duoc.

- source_spec: none
  summary: Xay dung lop I: chunking, embedding, Qdrant, chatbot va AI tren du lieu da duoc giam thieu.
  evidence: Nguoi dung yeu cau trien khai sau H+P nham tranh dua AI vao truoc khi du lieu va quyen truy cap on dinh.
