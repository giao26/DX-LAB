# Thuyết Minh Kiến Trúc Hệ Điều Hành Doanh Nghiệp Số (DX-OS / DX-LAB)
## Mô Hình Kiến Trúc 4 Tầng H-P-D-I

Dự án DX-LAB kế thừa và tích hợp các công nghệ nguồn mở hàng đầu nhằm xây dựng một **Hệ điều hành doanh nghiệp số (DX-OS)** hoàn chỉnh theo mô hình **H-P-D-I**:

```
+-------------------------------------------------------------+
|               H - HUMAN LAYER (Odoo Community)              |
|        Employee  |  User  |  Role & Access  |  Knowledge     |
+------------------------------+------------------------------+
                               | REST / JSON-RPC API
                               v
+-------------------------------------------------------------+
|             P - PROCESS LAYER (Node-RED Engine)             |
|        Workflow  |  Data Validation  |  Event Automation    |
+------------------------------+------------------------------+
                               | Event Stream / CDC / SQL
                               v
+-------------------------------------------------------------+
|             D - DATA & ANALYTICS LAYER                      |
|       PostgreSQL (Core Relational)  +  Apache Superset (BI) |
+------------------------------+------------------------------+
                               | Document & Knowledge Sync
                               v
+-------------------------------------------------------------+
|             I - INTELLIGENCE LAYER                          |
|    Qdrant (Vector DB) + Haystack (RAG) + Ollama (Local LLM) |
+-------------------------------------------------------------+
```

---

## 1. Tầng H (Human / ERP Layer): Odoo Community
- **Trọng tâm**: Quản trị định danh và nguồn lực con người trong doanh nghiệp.
- **Thành phần**:
  - `Employee`: Quản lý hồ sơ nhân viên, phòng ban, chức vụ.
  - `User`: Tài khoản định danh người dùng đăng nhập hệ thống.
  - `Role`: Phân quyền RBAC (Role-Based Access Control) cho từng nhóm nghiệp vụ.
  - `Knowledge`: Cung cấp cơ sở tri thức nội bộ, văn bản và tài liệu chính sách.
- **Giao tiếp**: Cung cấp JSON-RPC và RESTful API để tầng P truy vấn và đồng bộ sự kiện người dùng.

---

## 2. Tầng P (Process / Workflow Layer): Node-RED
- **Trọng tâm**: Điều phối các luồng nghiệp vụ kinh doanh tự động và phi tập trung.
- **Thành phần**:
  - `Workflow Engine`: Thiết lập luồng phê duyệt, luồng xử lý văn bản và tác vụ doanh nghiệp qua giao diện trực quan dạng flow.
  - `Validation`: Kiểm tra tính toàn vẹn dữ liệu từ tầng H trước khi ghi nhận xuống cơ sở dữ liệu.
  - `Automation`: Kích hoạt các tác vụ định kỳ, thông báo tức thời và chuyển tiếp sự kiện giữa các tầng.
- **Giao tiếp**: Nhận webhook từ Odoo, xử lý và đẩy dữ liệu chuẩn hóa xuống PostgreSQL (Tầng D).

---

## 3. Tầng D (Data & Analytics Layer): PostgreSQL & Apache Superset
- **Trọng tâm**: Lưu trữ dữ liệu quan hệ tập trung và cung cấp năng lực khai phá dữ liệu (Business Intelligence).
- **Thành phần**:
  - `PostgreSQL 16`: Kho dữ liệu quan hệ ACID chuẩn mực, lưu trữ thông tin thực thể, lịch sử giao dịch và logs.
  - `Apache Superset`: Nền tảng phân tích trực quan hóa dữ liệu (Dashboard, biểu đồ KPI, báo cáo năng suất doanh nghiệp) kết nối trực tiếp với PostgreSQL.
- **Giao tiếp**: Cung cấp dữ liệu báo cáo cho người dùng quản lý, đồng thời cung cấp dữ liệu văn bản và tài liệu để đồng bộ sang Tầng I phục vụ tra cứu ngữ nghĩa.

---

## 4. Tầng I (Intelligence / AI Layer): Qdrant + Haystack + Ollama
- **Trọng tâm**: Trí tuệ nhân tạo bảo mật, cục bộ (On-premise AI) hỗ trợ người lao động và tối ưu hóa vận hành.
- **Thành phần**:
  - `Qdrant`: Cơ sở dữ liệu vector tốc độ cao, lưu trữ và tìm kiếm vector tương đồng cho các tài liệu tri thức doanh nghiệp.
  - `Haystack AI`: Framework điều phối chu trình RAG (Retrieval-Augmented Generation), kết hợp giữa câu hỏi người dùng, dữ liệu liên quan từ Qdrant và mô hình ngôn ngữ.
  - `Ollama`: Runtime suy luận mô hình ngôn ngữ lớn (Local LLMs như Qwen 2.5, Llama 3) chạy hoàn toàn nội bộ, không phụ thuộc cloud API bên ngoài và bảo mật 100% dữ liệu nhạy cảm.
- **Giao tiếp**: Cung cấp API endpoint phục vụ hỏi đáp tri thức (`/api/v1/ask`) cho Odoo và Node-RED.
