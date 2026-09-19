# Hướng dẫn triển khai DX-LAB

> **Cảnh báo trạng thái:** repository hiện là brownfield skeleton và **chưa có quy trình triển khai đầy đủ được hỗ trợ**. `docker-compose.yml` và `.env.example` hiện tại còn dùng kiến trúc cũ, mật khẩu mẫu, tag trôi nổi và mở trực tiếp các cổng đặc quyền. Không dùng chúng để triển khai môi trường chia sẻ, demo chấm thi hoặc production trước khi hoàn thành Story 1.1–1.2.

Kiến trúc triển khai chuẩn được quy định tại [Architecture Spine](../_bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md); phiên bản seed nằm trong [Technology Sources](../_bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/TECHNOLOGY-SOURCES.md).

## 1. Trạng thái repository hiện tại

- `services/p_process/` đang chứa Node-RED 3.1; Story 1.1 sẽ chuyển nội dung này sang `services/p_automation/`.
- Lõi TypeScript/Fastify của P, `apps/web`, `contracts/` và `infra/` chưa được tạo.
- Compose hiện dùng một mạng chung và mở trực tiếp PostgreSQL, Odoo, Node-RED, Superset, Qdrant, Ollama và Haystack.
- `.env.example` hiện chứa giá trị mẫu có thể bị dùng nhầm như mật khẩu thật.
- Image, dependency và model chưa được khóa đầy đủ bằng lockfile/digest/manifest.

Vì vậy, các lệnh khởi động toàn bộ stack cũ không phải đường cài đặt được hỗ trợ.

## 2. Cấu trúc đích sau Story 1.1–1.2

```text
apps/web/                    # DX-Portal, form và Dashboard qua Next.js BFF
services/h_human/            # Odoo Community, addon, OIDC và adapter P
services/p_process/          # Lõi nghiệp vụ TypeScript/Fastify
services/p_automation/       # Node-RED: lịch và chuyển giao tích hợp
services/d_data/             # Superset, dataset và dashboard
services/i_intelligence/     # Haystack, Qdrant và Ollama
contracts/openapi/           # Hợp đồng REST có phiên bản
contracts/events/            # JSON Schema sự kiện có phiên bản
infra/                       # Compose, Caddy, Keycloak và cấu hình môi trường
```

## 3. Profile triển khai

Story 1.2 phải cung cấp ba profile Compose có thể tái lập:

| Profile | Thành phần | Mục đích |
| --- | --- | --- |
| `core` | P, PostgreSQL và test doubles | Phát triển và đóng góp mà không tải Odoo, Superset hoặc model AI |
| `demo` | `core` + Web, Keycloak, Odoo, Node-RED, Superset và Mailpit | Trình diễn luồng H→P→D và thông báo |
| `ai` | dịch vụ I, Qdrant và Ollama bổ sung cho demo | Trình diễn phân loại, phân tích và bản nháp SOP |

Tên file overlay, lệnh chạy chính xác và fixture chỉ được công bố sau khi chúng tồn tại và vượt qua clean-host smoke test. Không sao chép lệnh từ Compose skeleton hiện tại sang tài liệu phát hành.

## 4. Mạng và điểm truy cập

- Caddy là dịch vụ duy nhất công khai cổng HTTP/HTTPS.
- Caddy định tuyến Web, Odoo, đăng nhập Keycloak và runtime Superset được nhúng tại `/analytics/*`.
- PostgreSQL, API nội bộ P, Node-RED editor, Superset admin, Keycloak admin, Qdrant, Ollama và Haystack nằm trong mạng riêng.
- Truy cập quản trị chỉ qua localhost hoặc profile quản trị được bật rõ ràng.
- Demo dùng TLS tại Caddy cho hostname cấu hình; phát triển localhost có thể dùng CA cục bộ của Caddy.

## 5. Secret và cấu hình

- File secret sinh cục bộ phải nằm ngoài Git; môi trường chia sẻ dùng mounted secret hoặc cơ chế tương đương.
- Không cung cấp mật khẩu mặc định hoạt động được trong Compose hoặc tài liệu.
- Mỗi thành phần dùng database và tài khoản tối thiểu riêng.
- Cấm wildcard CORS và token/danh tính giả qua header.
- Fixture được nạp bằng tác vụ rõ ràng, idempotent và tách theo môi trường `dev`, `test`, `demo`.
- `dev`, `test` tạm thời và `demo` dùng secret, database, volume, hostname và cấu hình định danh riêng; chuyển môi trường không yêu cầu sửa source.

## 6. Khóa dependency và model

Trước khi chấp nhận triển khai:

- commit `pnpm-lock.yaml` cho Web và P, với dependency trực tiếp dùng phiên bản chính xác;
- commit `uv.lock` cho I;
- ghi image digest bất biến cho mọi dịch vụ Compose;
- ghi commit SHA chính xác của OCA `auth_oidc`;
- commit model manifest chứa ID, digest, giấy phép, giới hạn context hoặc kích thước embedding, cấu hình phần cứng và phiên bản retrieval/prompt;
- không dùng `latest` hoặc alias model chưa được ghi nhận;
- `core` và kiểm thử mặc định không tải model AI.

## 7. Điều kiện để công bố lệnh cài đặt chính thức

Tài liệu này chỉ được bổ sung lệnh cài đặt có thể sao chép sau khi CI xác nhận:

1. Máy sạch dựng được từng profile từ source và các tệp khóa.
2. Migration và readiness check hoàn tất.
3. Luồng ticket mẫu chạy qua P mà Node-RED hoặc Odoo không ghi trực tiếp bảng P.
4. Demo đăng nhập, phân quyền theo nhóm và Superset RLS từ chối mặc định khi thiếu scope.
5. Profile AI index, retrieve và generate một lần bằng model manifest đã ghim.
6. Không có cổng đặc quyền, mật khẩu mẫu, wildcard CORS, tag `latest` hoặc model alias trôi nổi.
7. CPU, RAM, dung lượng tối thiểu và chế độ không AI được đo và ghi trong README phát hành.

## 8. Sao lưu và phục hồi

Lúc 00:30 theo `Asia/Ho_Chi_Minh`, hệ thống đích tạo dump logic cho P, Odoo, Keycloak và metadata Superset, đồng thời sao chép attachment, Odoo filestore và tri thức đã xuất bản. Mỗi thành phần có trạng thái hoàn thành riêng. Archive được mã hóa bằng khóa mount tách biệt, gửi tới destination URI cấu hình ngoài host và ghi checksum, object/version ID, kích thước, thời gian cùng kết quả.

Chính sách giữ bản: 7 bản ngày, 4 bản tuần và 12 bản tháng. Chỉ xóa bản vượt chính sách sau khi xác minh checksum của bản giữ lại; thao tác xóa phải được audit. Bản sao thiếu thành phần, sai checksum hoặc thất bại bị đánh dấu không hoàn chỉnh, tạo cảnh báo/việc vận hành trong ngày và không thay thế bản hợp lệ cũ.

Hằng tháng phải phục hồi một bản hợp lệ vào môi trường cô lập có secret và hostname khác nguồn. Bộ xác minh kiểm tra database, phiên bản migration, số bản ghi kiểm soát, checksum tệp mẫu, SOP hiện hành, đăng nhập thử nghiệm, dựng lại Qdrant và quyền đọc ticket/tệp mẫu. Sau lần thử, lưu backup ID, thời gian, phiên bản hệ thống, checklist và kết quả; thất bại tạo việc có người phụ trách, còn dữ liệu thử chỉ được dọn theo runbook sau khi lưu bằng chứng.

Qdrant được dựng lại từ nguồn đã xuất bản và embedding manifest; model/cache được tái tạo từ manifest đã ghim. Log sao lưu không chứa dữ liệu khách hàng, token, prompt, nội dung tệp hoặc khóa mã hóa; chỉ vai trò vận hành được xem metadata và thực hiện phục hồi.
