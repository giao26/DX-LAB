# Cấu Hình & Vận Hành Mô Hình Cục Bộ (Ollama)

Thư mục này hướng dẫn và lưu trữ cấu hình cho mô hình ngôn ngữ lớn chạy nội bộ bằng **Ollama**.

## 1. Các Mô Hình Được Khuyến Nghị:
- **LLM Suy luận (Reasoning / Chat)**: `qwen2.5:7b` (hỗ trợ tiếng Việt xuất sắc, nhẹ và chính xác) hoặc `llama3:8b`.
- **Mô hình Embedding (Vector hóa)**: `bge-m3` hoặc `nomic-embed-text`.

## 2. Kéo Mô Hình (Pull Models):
```bash
# Kéo LLM chính
docker compose exec ollama ollama pull qwen2.5:7b

# Kéo mô hình embedding
docker compose exec ollama ollama pull bge-m3
```

## 3. Tạo Model Tùy Biến Với System Prompt Của DX-OS:
```bash
docker compose exec ollama ollama create dxlab-assistant -f /app/Modelfile
```
