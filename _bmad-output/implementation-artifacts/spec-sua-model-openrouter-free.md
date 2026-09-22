---
title: 'Sửa cấu hình OpenRouter sang model miễn phí'
type: 'refactor'
created: '2026-09-21'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '976d2bd5c42a964eebbe585b23af70181d22cd3b'
context:
  - _bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md
  - _bmad-output/implementation-artifacts/spec-thay-ollama-bang-openrouter.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Model mặc định hiện tại `qwen/qwen3-8b` yêu cầu tài khoản OpenRouter phải có số dư credit trả phí. Người dùng phát triển và thử nghiệm muốn sử dụng model miễn phí (nhãn `:free` trên OpenRouter) để không phát sinh chi phí khi gọi API thật.

**Approach:** Cập nhật adapter Haystack RAG, các ràng buộc kiểm tra kiến trúc và bộ unit test để chuyển sang model OpenRouter miễn phí được ghim cố định là `qwen/qwen3.8-27b:free`; loại bỏ bắt buộc `zdr: True` để tương thích với các nhà cung cấp free trên OpenRouter trong khi vẫn duy trì `data_collection: "deny"` và che PII; đồng thời đồng bộ hóa các bài kiểm tra kiến trúc và test suite.

## Boundaries & Constraints

**Always:** Không hardcode API key vào mã nguồn hay git. Giữ nguyên cơ chế bảo mật làm sạch PII trước khi gửi dữ liệu. Đảm bảo toàn bộ unit test chạy offline với mock transport tiếp tục pass 100%. Duy trì `AI_PROVIDER=fixture` làm fallback độc lập không cần mạng. Gửi chính sách `data_collection: "deny"` và `require_parameters: True` trong request.

**Never:** Không cho phép các selector động không xác định như `openrouter/auto`, `:latest`, `/latest`. Không làm lộ khóa hoặc lỗi thô của bên thứ ba trong log/HTTP response.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Gọi thành công model free | Query hợp lệ, key hợp lệ, model free | Gọi `/chat/completions`, nhận câu trả lời từ model free `qwen/qwen3.8-27b:free` | Bắt lỗi sạch, che PII |
| Model free bị rate-limit | OpenRouter trả HTTP 429 | Ánh xạ sang mã lỗi `ai_provider_rate_limited` (503) | Không crash service |
| Test offline (CI / Unit test) | Mock transport / fixture | Trả kết quả cố định khớp slug model free `qwen/qwen3.8-27b:free` | Pass toàn bộ test suite |

</frozen-after-approval>

## Code Map

- `services/i_intelligence/haystack_rag/src/pipelines/rag_pipeline.py` -- Cập nhật `OPENROUTER_MODEL = "qwen/qwen3.8-27b:free"`, gỡ bỏ bắt buộc `zdr: True` trong payload provider để tránh lỗi không tìm thấy provider với tier free. Chấp nhận `actual_model` trả về có hoặc không có hậu tố `:free`.
- `services/i_intelligence/haystack_rag/tests/test_rag_pipeline.py` -- Cập nhật mock model sang `qwen/qwen3.8-27b:free`, cập nhật payload provider và bổ sung test case cho trường hợp response trả về model bị gọt bỏ hậu tố `:free`.
- `scripts/test-architecture.py` -- Cập nhật kiểm tra quy chuẩn model hợp lệ tại `check_ai_provider_boundary()` cho `qwen/qwen3.8-27b:free` và điều chỉnh kiểm tra privacy flags.
- `DEPENDENCIES.md` -- Cập nhật bảng kê phụ thuộc bên thứ ba từ Qwen3-8B sang Qwen2.5-7B-Instruct.
- `README.md` & `docs/architecture/hpdi_architecture.md` -- Cập nhật tài liệu tham chiếu model slug và lưu ý vận hành.
- `CHANGELOG.md` & `_bmad-output/planning-artifacts/epics.md` -- Đồng bộ hóa nhật ký thay đổi và kế hoạch kiến trúc epics.

## Tasks & Acceptance

**Execution:**
- [x] `services/i_intelligence/haystack_rag/src/pipelines/rag_pipeline.py` -- Cập nhật `OPENROUTER_MODEL` sang `qwen/qwen3.8-27b:free`, giữ `"data_collection": "deny"`, `"require_parameters": True`, bỏ `"zdr": True` và hỗ trợ gọt hậu tố `:free`.
- [x] `services/i_intelligence/haystack_rag/tests/test_rag_pipeline.py` -- Cập nhật test mock, các assert liên quan đến model slug mới và thêm unit test cho stripped `:free` response.
- [x] `scripts/test-architecture.py` -- Cập nhật kiểm tra kiến trúc để chấp nhận model `qwen/qwen3.8-27b:free` và chính sách provider privacy cập nhật.
- [x] `DEPENDENCIES.md` -- Cập nhật thông tin model Qwen2.5-7B-Instruct (Apache-2.0).
- [x] `README.md` & `services/i_intelligence/README.md` -- Đồng bộ mô tả model slug và chính sách bảo mật trong tài liệu hướng dẫn.
- [x] `CHANGELOG.md` & `_bmad-output/planning-artifacts/epics.md` -- Ghi nhận thay đổi model và chính sách trong changelog và epics.

**Acceptance Criteria:**
- Given cấu hình `AI_PROVIDER=openrouter`, when chạy `uv run pytest services/i_intelligence/haystack_rag/tests`, then tất cả 35 test cases đều pass.
- Given repository hiện tại, when chạy `python scripts/test-architecture.py`, then toàn bộ architecture conformance checks đều PASS (Exit code 0).

## Implementation Notes

- Đã thay đổi model cố định sang `qwen/qwen3.8-27b:free`.
- Đã gỡ bỏ cờ `"zdr": True` khỏi request payload gửi OpenRouter vì các nhà cung cấp free tier thường không cam kết ZDR, giữ cờ này sẽ gây lỗi 404/400 (No available provider). Vẫn giữ cờ `"data_collection": "deny"` và làm sạch PII cục bộ.
- Đã sửa lỗi tiềm ẩn trong `rag_pipeline.py`: OpenRouter thường trả về tên model không có hậu tố `:free` trong trường `body["model"]` của response, dẫn đến lỗi `unexpected model`. Giờ đây pipeline chấp nhận cả `OPENROUTER_MODEL` lẫn `OPENROUTER_MODEL.removesuffix(":free")`.
- Đã bổ sung unit test `test_openrouter_accepts_stripped_free_suffix_model` kiểm chứng tính năng này.
- Đã đồng bộ tài liệu, NOTICE, DEPENDENCIES.md, README, kiến trúc và CHANGELOG.

## Spec Change Log

## Review Triage Log

| ID | Reviewer Finding | Severity | Verdict | Action / Evidence |
|:---|:---|:---:|:---:|:---|
| RV-1 | Brittle response model equality assertion in `rag_pipeline.py` khi OpenRouter trả về model không có hậu tố `:free` | High | High | `patch`: Đã sửa `actual_model not in (OPENROUTER_MODEL, OPENROUTER_MODEL.removesuffix(":free"))`. |
| RV-2 | Thiếu unit test kiểm tra việc strip `:free` suffix | Medium | Medium | `patch`: Đã thêm `test_openrouter_accepts_stripped_free_suffix_model` (35 tests passed). |
| RV-3 | Spec file chưa đánh dấu hoàn thành task | Low | Low | `patch`: Cập nhật checklist `[x]` và status `done`. |
| RV-4 | Chưa ghi vào `CHANGELOG.md` | Low | Low | `patch`: Đã cập nhật `CHANGELOG.md` với mô tả rõ ràng. |
| RV-5 | `epics.md` vẫn còn trỏ `qwen/qwen3-8b` | Medium | Medium | `patch`: Đã đồng bộ dòng 264 của `epics.md`. |
| RV-6 | Thiếu ghi chú vận hành về việc model free không bắt buộc ZDR | Medium | Medium | `patch`: Đã bổ sung chú thích rõ trong `README.md` và `services/i_intelligence/README.md`. |

## Verification

**Commands:**
- `uv run --with pytest --with pytest-asyncio --with httpx --with fastapi python -m pytest services/i_intelligence/haystack_rag/tests` -- expected: 35 passed
- `python scripts/test-architecture.py` -- expected: ALL ARCHITECTURE CONFORMANCE CHECKS PASSED (EXIT CODE 0)
- `uv run --with pytest python -m pytest tests/test_openrouter_architecture.py` -- expected: 2 passed
