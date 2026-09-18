# Đặc Tả Giao Diện API Giữa Các Tầng H-P-D-I (API Specifications)

Hệ điều hành doanh nghiệp số DX-LAB kết nối 4 tầng kiến trúc thông qua các chuẩn giao tiếp mở:

---

## 1. Giao Tiếp Tầng H (Odoo) -> Tầng P (Node-RED)
- **Phương thức**: HTTP POST (Webhook) / REST API
- **Endpoint tiếp nhận trên Node-RED**: `/api/v1/events/human`
- **Định dạng dữ liệu**: JSON
- **Nội dung ví dụ**:
  ```json
  {
    "event_type": "employee_onboarding",
    "timestamp": "2026-09-18T10:00:00Z",
    "payload": {
      "employee_id": 101,
      "name": "Nguyen Van A",
      "department": "Engineering",
      "role": "Software Developer"
    }
  }
  ```

---

## 2. Giao Tiếp Tầng P (Node-RED) -> Tầng D (PostgreSQL)
- **Phương thức**: Native PostgreSQL Protocol (Port 5432)
- **Bảng mục tiêu**: `dx_system_events`, `dx_audit_log`
- **Mục đích**: Ghi nhận nhật ký kiểm toán và dữ liệu đã được validate.

---

## 3. Giao Tiếp Tầng P / H -> Tầng I (Haystack RAG Service)
- **Phương thức**: HTTP POST REST API
- **Endpoint**: `/api/v1/ai/ask`
- **Định dạng Request**:
  ```json
  {
    "query": "Quy trình xin nghỉ phép và cấp phát thiết bị của công ty như thế nào?",
    "user_id": 101,
    "top_k": 3
  }
  ```
- **Định dạng Response**:
  ```json
  {
    "answer": "Theo sổ tay nhân viên DX-LAB, bạn cần tạo phiếu xin nghỉ trên Odoo trước 24 giờ...",
    "sources": [
      {
        "document": "SoTayNhanSu_2026.pdf",
        "score": 0.92
      }
    ]
  }
  ```

---

## 4. Giao Tiếp Nội Bộ Tầng I (Haystack <-> Qdrant & Ollama)
- **Haystack <-> Qdrant**: gRPC / REST trên cổng `6333` / `6334` để lấy embeddings và tài liệu liên quan.
- **Haystack <-> Ollama**: REST API trên cổng `11434` (`/api/generate` và `/api/embeddings`) để suy luận câu trả lời từ LLM nội bộ.
