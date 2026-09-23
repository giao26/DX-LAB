---
title: 'Hoàn tất môi trường AI Haystack'
type: 'bugfix'
created: '2026-09-23'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - BUILD.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dịch vụ `haystack-rag` chưa được build và khởi động thành công. Docker Desktop Linux engine hiện không chạy; build context của Haystack cũng chứa `.venv` và `.pytest_cache` có ACL lỗi vì chưa có `.dockerignore`.

**Approach:** Khởi động Docker Engine, loại các tệp cục bộ và bí mật khỏi build context bằng `.dockerignore`, build riêng image `haystack-rag`, khởi động profile `ai`, rồi xác minh các container và endpoint nội bộ `/ready` mà không phát sinh lời gọi suy luận OpenRouter.

</frozen-after-approval>

## Implementation Notes

- Giữ nguyên `Dockerfile`, `pyproject.toml`, `uv.lock`, model OpenRouter và API key trong `.env` bị Git ignore; không bỏ `--locked` hoặc chuyển sang `requirements.txt` khi chưa có lỗi dependency cụ thể.
- Thêm `services/i_intelligence/haystack_rag/.dockerignore` để loại `.venv/`, `.pytest_cache/`, cache Python, bytecode và các tệp `.env*` khỏi context.
- Xác minh bằng `docker compose --profile ai build haystack-rag`, khởi động profile `ai`, kiểm tra đủ `postgres`, `p-process`, `qdrant`, `haystack-rag`, rồi chạy `python scripts/check-health.py --profile ai`.
- `/ready` chỉ kiểm tra cấu hình cục bộ và không gọi API. Không gọi `/api/v1/ai/ask` trong công việc này.
- Đã xác nhận Docker Desktop Linux engine đang tắt trước khi triển khai; cần khởi động engine trước bước build.
- Đã thêm `.dockerignore` tại build context Haystack để Docker không đọc môi trường ảo, pytest cache có ACL lỗi, bytecode hoặc tệp môi trường chứa bí mật.
- Docker Engine 29.6.2 đã hoạt động; image `dx-lab-haystack-rag:latest` build thành công từ lockfile và profile `ai` đã khởi động đủ bốn dịch vụ.
- `python scripts/check-health.py --profile ai` PASS toàn bộ tài nguyên, container, P `/health` và Haystack `/ready`; không gọi endpoint suy luận.
- `python scripts/test-architecture.py` PASS và unit test Haystack PASS `35 passed`; còn 6 cảnh báo deprecation từ dependency kiểm thử, không làm sai hành vi hiện tại.
- Sau review, image được build lại thành công với `.dockerignore` mở rộng; `git diff --check` PASS.

## Review Triage Log

| Finding | Verdict | Evidence and route |
|---|---|---|
| Bổ sung các cache Python phổ biến vào `.dockerignore` | low | Vấn đề có thật và sửa đơn giản; đã thêm cache mypy, Ruff, Hypothesis, tox/nox, coverage và HTML coverage để tránh build context lớn hoặc lỗi ACL về sau. |
| Loại `tests/` và `requirements.txt` khỏi build context | false | Dockerfile chỉ `COPY` lockfile, `pyproject.toml` và `src/`; BuildKit truyền context nhỏ theo các đường dẫn cần dùng và build đã thành công. Không có lỗi hay chi phí đáng kể được chứng minh từ hai đường dẫn này. |
| Spec thiếu nguyên lệnh unit test tạo kết quả `35 passed` | low | Thiếu sót tái lập tài liệu là có thật; workflow không vá finding bằng cách sửa spec nên đã ghi vào `deferred-work.md`. |
| Frontmatter context chưa liệt kê Compose, Dockerfile và health script | false | `context` là trường tùy chọn; Implementation Notes đã ghi các tệp, lệnh và kết quả cần thiết, còn runtime đã được xác minh trực tiếp. |
