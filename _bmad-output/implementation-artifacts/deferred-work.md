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
