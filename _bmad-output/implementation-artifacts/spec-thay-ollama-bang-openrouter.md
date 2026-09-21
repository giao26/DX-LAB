---
title: 'Thay Ollama bằng tích hợp OpenRouter'
type: 'refactor'
created: '2026-09-21'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '01eb995f9856503c29e90937463ac2d524518758'
context:
  - _bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/TECHNOLOGY-SOURCES.md
  - _bmad-output/planning-artifacts/epics.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Profile `ai` hiện yêu cầu Ollama và mô hình cục bộ, vượt khả năng phần cứng của máy phát triển 8 core, RAM 16 GB. Khung tầng I cũng mới trả phản hồi mẫu và chưa thật sự gọi mô hình.

**Approach:** Loại Ollama khỏi runtime và thay bằng adapter OpenRouter gọi API bất đồng bộ từ dịch vụ Haystack; giữ Qdrant tại máy, giữ `fixture` cho kiểm thử và khi phát triển lõi. Model sinh mặc định là slug cố định `qwen/qwen3-8b`; OpenRouter được kê khai rõ là dịch vụ bên ngoài, còn model Qwen3-8B có giấy phép Apache-2.0.

## Boundaries & Constraints

**Always:** API key chỉ đi từ biến môi trường vào backend I; chỉ dùng HTTPS, timeout hữu hạn, lỗi đã làm sạch và đầu vào đã giảm thiểu/che PII. Request OpenRouter bật `zdr`, từ chối thu thập dữ liệu và yêu cầu model hỗ trợ tham số cần thiết. Lưu model được yêu cầu, model thực trả về, request ID, phiên bản prompt/retrieval và nguồn bằng chứng. `core` cùng CI phải chạy không cần mạng, API key hay model. Qdrant tiếp tục là chỉ mục có thể tái tạo, không phải nguồn dữ liệu chuẩn.

**Never:** Không đưa khóa vào Git, browser, log, lỗi HTTP hoặc fixture. Không dùng `openrouter/auto`, `latest`, hậu tố định tuyến động hay âm thầm đổi model. Không gọi API thật trong unit test/CI. Không sửa PRD/UX hoặc triển khai toàn bộ indexing RAG trong thay đổi provider này.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| OpenRouter thành công | Query hợp lệ, key và model hợp lệ | Gọi `/chat/completions`, trả answer cùng tài liệu nguồn theo schema hiện tại | Không lộ header hay prompt trong log |
| Thiếu API key | `AI_PROVIDER=openrouter`, key trống | Readiness báo cấu hình chưa sẵn sàng; không phát request | API trả lỗi dịch vụ đã làm sạch |
| Provider từ chối/quá tải | 401/403/429/5xx hoặc timeout | Không làm hỏng trạng thái ticket và không gọi Ollama | Ánh xạ lỗi ổn định; P có thể dùng fallback đã định nghĩa |
| Kiểm thử | `AI_PROVIDER=fixture` | Kết quả xác định, không truy cập Internet | Test thất bại nếu xuất hiện lời gọi mạng |

</frozen-after-approval>

## Code Map

- `docker-compose.yml` — xóa service/volume/dependency Ollama; truyền cấu hình OpenRouter cho `haystack-rag`.
- `.env.example` — khai báo provider, base URL và API key trống; model cố định nằm trong adapter để không thể bị đổi âm thầm bằng cấu hình triển khai.
- `services/i_intelligence/haystack_rag/src/pipelines/rag_pipeline.py` — thay cấu hình Ollama bằng client OpenRouter bất đồng bộ và fixture provider.
- `services/i_intelligence/haystack_rag/src/api/routes.py` — await pipeline, ánh xạ lỗi sạch; không trả `str(e)`.
- `services/i_intelligence/haystack_rag/src/main.py` — mô tả provider mới và health không gọi API trả phí.
- `services/i_intelligence/haystack_rag/{pyproject.toml,requirements.txt}` — đồng bộ dependency HTTP bất đồng bộ và phiên bản.
- `services/i_intelligence/haystack_rag/tests/` — mock transport cho success, thiếu key, 401/429/5xx, timeout và payload riêng tư.
- `scripts/{test-architecture.py,check-health.py}` — bỏ giả định Ollama, kiểm tra secret/config/profile mới và giảm chuẩn tài nguyên AI.
- `README.md`, `BUILD.md`, `DEPENDENCIES.md`, `NOTICE`, `docs/`, `services/i_intelligence/README.md` — đồng bộ cách chạy, ranh giới nguồn mở, dữ liệu và egress.
- `_bmad-output/planning-artifacts/{epics.md,architecture/...}` — cập nhật quyết định hosted-model; giữ nguyên review/memlog lịch sử.

## Tasks & Acceptance

**Execution:**
- [x] Cập nhật Compose, `.env.example` và health scripts để profile `ai` chỉ chạy PostgreSQL, P, Qdrant và Haystack; OpenRouter là HTTPS dependency bên ngoài.
- [x] Tạo adapter OpenRouter bất đồng bộ có cấu hình fail-closed, payload riêng tư, timeout và lỗi đã làm sạch; duy trì fixture provider.
- [x] Thêm unit test offline và cập nhật architecture test/CI để phát hiện Ollama runtime còn sót, key OpenRouter bị lộ hoặc cấu hình động.
- [x] Xóa tài sản runtime Ollama; cập nhật tài liệu chuẩn, dependency/provider inventory, architecture và epics; ghi migration trong changelog.

**Acceptance Criteria:**
- Given profile `ai` đã cấu hình key, when gọi endpoint I, then request dùng model slug cố định qua OpenRouter và phản hồi giữ schema API hiện có.
- Given máy 16 GB RAM, when dựng profile `ai`, then không tải hoặc khởi động mô hình cục bộ/Ollama.
- Given thiếu key hoặc OpenRouter lỗi, when gọi I, then lỗi không lộ secret/dữ liệu và luồng `core` vẫn kiểm thử được bằng fixture.
- Given clean checkout, when chạy architecture tests và AI unit tests, then không có network call thật, không còn runtime Ollama và tài liệu hiện hành thống nhất.

## Implementation Notes

- Đã xóa service, volume và tài sản runtime Ollama. Profile `ai` chỉ dựng `postgres`, `p-process`, `qdrant` và `haystack-rag`; suy luận đi qua HTTPS tới OpenRouter.
- Adapter dùng `httpx.AsyncClient`, model cố định `qwen/qwen3-8b`, timeout hữu hạn, kiểm tra readiness không phát sinh request trả phí và mã lỗi ổn định không chứa nội dung lỗi từ provider.
- Dữ liệu gửi đi được giới hạn độ dài và che email/số điện thoại phổ biến; payload yêu cầu `zdr`, `data_collection: deny` và `require_parameters`.
- Fixture tiếp tục chạy hoàn toàn ngoại tuyến. Unit test dùng `httpx.MockTransport`; CI không cần API key và không gọi OpenRouter thật.
- Đã đồng bộ Compose, tài liệu cài đặt/build, dependency inventory, NOTICE, kiến trúc, epic và changelog với ranh giới dịch vụ hosted.

## Spec Change Log

## Review Triage Log

| ID | Verdict | Evidence and route |
|---|---|---|
| BH-01 | medium | `AI_PROVIDER` mặc định `fixture`, nên chạy trực tiếp thiếu cấu hình vẫn báo sẵn sàng và trả dữ liệu giả. `patch`: mặc định phải là `openrouter`; fixture chỉ bật tường minh. |
| BH-02 | medium | Nhánh OpenRouter vẫn dùng tài liệu fixture thay vì Qdrant. Kết quả này có thật, nhưng Intent đã loại trừ triển khai toàn bộ indexing RAG; bác khỏi bản thay provider này và giữ thành phạm vi story RAG sau. |
| BH-03 | low | Một tiến trình đã có quyền truy cập `app-net` có thể gọi endpoint I và tạo chi phí; Caddy không công khai tuyến này và các container trên mạng là dịch vụ nội bộ tin cậy. Bác trong thay đổi provider vì bổ sung cơ chế xác thực mới cho luồng P→I chưa triển khai sẽ tăng độ phức tạp hơn rủi ro trong sử dụng demo hiện tại. |
| BH-04 | low | CORS cho phép header `Idempotency-Key` nhưng endpoint tư vấn không đọc header này; điều đó gây hiểu sai hợp đồng retry. `patch`: bỏ header khỏi allowlist của dịch vụ I. |
| BH-05 | maybe-false | Adapter loại `user_id`, giới hạn trường gửi và che email/số điện thoại, nhưng caller P chưa được triển khai nên chưa xác định có đưa tên/địa chỉ/định danh thô vào query hay không. Rủi ro nếu có sẽ ở mức cao; `defer` để story tích hợp P→I xác lập schema dữ liệu tối thiểu. |
| BH-06 | medium | Chuỗi bị cắt trước khi che nên định danh nằm qua biên 4.000 ký tự có thể bị cắt thành mẫu không khớp. `patch`: che trước, giới hạn sau. |
| BH-07 | high | Kiểm tra `startswith("https://")` cho phép host HTTPS tùy ý nhận Bearer key khi cấu hình sai. `patch`: parse URL và chỉ chấp nhận endpoint OpenRouter chuẩn. |
| BH-08 | medium | Phản hồi thiếu `model` bị thay bằng model yêu cầu và model khác vẫn được chấp nhận, làm sai bằng chứng model cố định. `patch`: bắt buộc model trả về đúng slug. |
| BH-09 | medium | Phản hồi có thể thiếu request ID nhưng vẫn thành công; log metadata hiện đã là bằng chứng vận hành phù hợp cho advisory không đổi trạng thái. `patch`: bắt buộc request ID hợp lệ; không mở rộng sang persistence trong story này. |
| BH-10 | low | Payload chưa giới hạn số token đầu ra nên chi phí và độ trễ có thể tăng. `patch`: thêm ngân sách đầu ra cố định và test payload. |
| BH-11 | maybe-false | Kiến trúc yêu cầu retry có giới hạn cho dependency, nhưng chưa định nghĩa retry policy/cost cho inference trả phí. Nếu bắt buộc, ảnh hưởng là trung bình; `defer` để quyết định cùng luồng P/outbox thay vì tự retry trong adapter. |
| BH-12 | medium | Câu hỏi không tin cậy và nguồn nằm trong cùng chuỗi, chưa có delimiter rõ; prompt injection có thể giả mạo nguồn. `patch`: tách nhãn/delimiter và nhắc rõ chỉ tin phần nguồn. |
| BH-13 | low | Tạo `AsyncClient` mỗi request làm mất connection pooling, nhưng lưu lượng demo thấp và sửa lifecycle thêm trạng thái/cleanup. Bác vì tác động không đáng kể trong sử dụng hiện tại. |
| BH-14 | medium | Chỉ test pipeline nên regression ở HTTP route/readiness/CORS không bị phát hiện. `patch` cùng các finding VG-01, VG-02 và VG-04. |
| BH-15 | medium | Architecture yêu cầu commit `uv.lock` cho I nhưng thay đổi dependency chưa tạo lock. `patch`: sinh và kiểm tra lockfile cho service I. |
| EC-01 | maybe-false | Trùng BH-05: chưa có caller P để chứng minh tên/địa chỉ/định danh thô được truyền; nếu có là rủi ro cao. `defer` cho schema P→I. |
| EC-02 | high | `float("NaN")` không bị điều kiện `<= 0` hoặc `> 120` chặn, phá cam kết timeout hữu hạn. `patch`: dùng `math.isfinite`. |
| EC-03 | high | Trùng BH-07; host HTTPS tùy ý hiện vượt readiness và nhận khóa. `patch` cùng BH-07. |
| EC-04 | low | httpx đọc toàn bộ body, nhưng provider tin cậy và ngân sách token cố định sẽ giới hạn phản hồi hợp lệ; thêm streaming limit gây phức tạp hơn tác động demo. Bác. |
| EC-05 | medium | Cấu hình `I_ALLOWED_ORIGINS=*` hiện được chấp nhận cùng credentials. `patch`: từ chối wildcard và test preflight. |
| EC-06 | medium | Prompt cũ đã xóa có quy tắc thừa nhận thiếu bằng chứng; prompt mới chưa giữ rào chắn đó. `patch`: khôi phục chỉ dẫn trong system prompt. |
| EC-07 | high | Regex `sk-[A-Za-z0-9]{24,}` bỏ sót khóa OpenRouter dạng có dấu gạch nối như `sk-or-v1-...`. `patch`: mở rộng detector secret. |
| EC-08 | low | `.github/ISSUE_TEMPLATE/feature_request.md` vẫn hướng dẫn contributor dùng Ollama. `patch`: đổi thành OpenRouter. |
| VG-01 | medium | Reviewer đã xác minh không có test HTTP cho schema thành công và ánh xạ lỗi của `/api/v1/ai/ask`. `patch`: thêm route tests bằng pipeline stub. |
| VG-02 | medium | Reviewer đã xác minh `/ready` và nhánh readiness AI trong `check-health.py` chưa được thực thi bởi test. `patch`: thêm endpoint test và subprocess-mocked checker test. |
| VG-03 | medium | Reviewer đã xác minh Compose chỉ được parse, chưa đối chiếu mapping environment đã resolve với tên biến pipeline đọc. `patch`: mở rộng architecture check cho mapping `haystack-rag.environment`. |
| VG-04 | medium | Reviewer đã xác minh chính sách CORS mới không có test preflight. `patch`: thêm test origin được phép và origin không được phép. |
| VG-05 | medium | Reviewer đã xác minh architecture suite gọi resource check mặc định `core`, không kiểm tra ngưỡng `ai`. `patch`: thêm test deterministic quanh ngưỡng AI và gọi đúng profile trong conformance check. |

## Design Notes

OpenRouter dùng giao thức tương thích OpenAI nhưng được bọc sau port nội bộ của tầng I. Điều này giữ khả năng đổi provider, giới hạn vendor lock và ngăn P/Web phụ thuộc trực tiếp vào SDK hoặc API key. Khả năng tái lập của hosted inference được chứng minh bằng model ID cố định, chính sách định tuyến/quyền riêng tư và metadata phản hồi; không tuyên bố có immutable digest cho dịch vụ SaaS.

## Verification

**Commands:**
- `uv run --no-project --with fastapi==0.110.0 --with httpx==0.27.0 --with pytest==8.3.5 python -m pytest services/i_intelligence/haystack_rag/tests tests/test_openrouter_architecture.py -q` — 36 test provider, HTTP và kiến trúc chạy ngoại tuyến, đều đạt.
- `python scripts/test-architecture.py` — profile, secret, ingress và dependency invariants đạt.
- `docker compose --profile ai config --services` — trả về `postgres`, `p-process`, `qdrant`, `haystack-rag`; không có service/volume Ollama.
- `python scripts/check-health.py --profile ai --check-resources` — chuẩn tài nguyên hosted-AI mới được áp dụng.
- `python -m compileall -q services/i_intelligence/haystack_rag/src` — mã Python biên dịch thành công.
- `uv lock --check --project services/i_intelligence/haystack_rag` — lockfile khớp cấu hình dependency.

**Manual checks (if no CLI):**
- Kiểm tra README/BUILD/DEPENDENCIES mô tả OpenRouter là dịch vụ ngoài, model Qwen là open-weight và key không nằm trong repository.
