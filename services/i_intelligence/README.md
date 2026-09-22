# Tầng I: Intelligence Layer (AI & RAG)

Thư mục này quản lý pipeline RAG cục bộ và adapter suy luận hosted. Qdrant lưu chỉ mục có thể tái tạo; OpenRouter chỉ được gọi từ backend I bằng HTTPS.

## Các Công Nghệ Thành Phần:
- **Qdrant**: Cơ sở dữ liệu Vector hiệu năng cao viết bằng Rust, lưu trữ và tìm kiếm vector embeddings của tri thức doanh nghiệp.
- **Haystack AI (v2.x)**: Framework RAG mạnh mẽ kết nối tìm kiếm văn bản liên quan và mô hình ngôn ngữ lớn.
- **OpenRouter**: Dịch vụ suy luận HTTPS bên ngoài, gọi model miễn phí cố định `qwen/qwen3.8-27b:free` (gửi `data_collection: deny`, che PII); khóa chỉ đến từ biến môi trường backend.

## Cấu Trúc:
- `qdrant/config/config.yaml`: Cấu hình storage, port và telemetry cho Qdrant.
- `haystack_rag/`: Dịch vụ FastAPI cung cấp API hỏi đáp RAG, fixture offline và adapter OpenRouter.
