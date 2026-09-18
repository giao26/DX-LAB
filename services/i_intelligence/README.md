# Tầng I: Intelligence Layer (AI & Local RAG)

Thư mục này quản lý toàn bộ hạ tầng trí tuệ nhân tạo (AI) chạy cục bộ (On-premise), bảo đảm an toàn dữ liệu và tuân thủ các chuẩn mở.

## Các Công Nghệ Thành Phần:
- **Qdrant**: Cơ sở dữ liệu Vector hiệu năng cao viết bằng Rust, lưu trữ và tìm kiếm vector embeddings của tri thức doanh nghiệp.
- **Haystack AI (v2.x)**: Framework RAG mạnh mẽ kết nối tìm kiếm văn bản liên quan và mô hình ngôn ngữ lớn.
- **Ollama**: Công cụ chạy LLM cục bộ (Local LLM Server như Qwen 2.5, Llama 3) qua giao tiếp API tương thích OpenAI.

## Cấu Trúc:
- `qdrant/config/config.yaml`: Cấu hình storage, port và telemetry cho Qdrant.
- `haystack_rag/`: Dịch vụ FastAPI cung cấp API hỏi đáp RAG liên kết với Qdrant và Ollama.
- `ollama/Modelfile`: Định nghĩa prompt template và tham số cho mô hình ngôn ngữ lớn nội bộ.
