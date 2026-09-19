---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/specs/spec-dx-lab/SPEC.md
  - _bmad-output/specs/spec-dx-lab/business-rules.md
  - _bmad-output/specs/spec-dx-lab/acceptance-matrix.md
  - _bmad-output/planning-artifacts/prds/prd-dx-lab-2026-09-18/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/TECHNOLOGY-SOURCES.md
  - _bmad-output/planning-artifacts/ux-designs/ux-DX-LAB-2026-09-18/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-DX-LAB-2026-09-18/EXPERIENCE.md
---

# DX-LAB — Phân rã Epic và Story

## Tổng quan

Tài liệu này sẽ chứa toàn bộ Epic và User Story của DX-LAB. Các yêu cầu dưới đây được tổng hợp từ Spec, PRD, kiến trúc và thiết kế UX để làm cơ sở phân rã thành các phần việc có thể triển khai và nghiệm thu.

## Danh mục yêu cầu

### Yêu cầu chức năng

- **FR-1 — Điều hướng từ DX-Portal:** Người dùng có thể bấm trực tiếp các không gian H/P/D/I để mở đúng trang tổng hợp H, trang tổng hợp quy trình P, Resources và đúng phần D/I của Dashboard; mọi đích đến vẫn kiểm tra quyền và SOP nháp không xuất hiện trong thư viện công bố.
- **FR-2 — Tra cứu tri thức đã duyệt:** Nhân viên có thể tìm và mở SOP/FAQ đang có hiệu lực trong Resources, xem phiên bản và trạng thái công bố; AI chỉ được tham chiếu phiên bản đã công bố.
- **FR-3 — Thông báo nội bộ theo quyền:** Người được giao ticket nhận đúng một thông báo Odoo chứa mã ticket và liên kết tới hồ sơ được phép xem; phát lại không tạo bản sao, lỗi gửi có trạng thái và cơ chế thử lại an toàn.
- **FR-4 — Tạo ticket hợp lệ:** Khách gửi họ tên, số điện thoại, email bắt buộc, loại yêu cầu và mô tả, kèm tối đa một ảnh hoặc PDF không quá 10 MB; hệ thống kiểm tra ở giao diện và nơi ghi dữ liệu, cấp mã/timestamp, liên kết hoặc tạo hồ sơ khách theo số điện thoại, đánh dấu xung đột liên hệ và gửi email xác nhận.
- **FR-5 — Phân loại AI có người xác nhận:** Sau khi ticket được tạo, AI chỉ đọc mô tả để đề xuất Khiếu nại, Tư vấn hoặc Bảo hành; người nhận phải xác nhận hoặc sửa loại trước khi xử lý. Hệ thống lưu loại khách chọn, loại AI gợi ý, loại cuối cùng, người và thời điểm xác nhận; AI lỗi dùng loại khách chọn làm phương án tạm và thay đổi nhóm phải thu hồi quyền cũ, phân công lại, lưu lịch sử.
- **FR-6 — Phân công công bằng:** Hệ thống chỉ chọn nhân viên sẵn sàng của nhóm phù hợp, ưu tiên số lượt nhận chính thức thấp nhất rồi quay vòng theo ID tăng dần; mỗi người có tối đa một ticket đang hoạt động hoặc giữ chỗ. Chọn và giữ chỗ phải nguyên tử; khi tất cả bận, ticket chờ FIFO; bộ đếm chỉ tăng lúc nhân viên xác nhận loại và nhận trách nhiệm.
- **FR-7 — Vòng đời, lịch sử xử lý và SLA:** Ticket tuân theo `WAITING → IN_PROGRESS → CLOSED`; chỉ người phụ trách hiện tại được bắt đầu và đóng sau khi ghi đủ kết quả. Mỗi loại có quy trình phiên bản hóa, Bảo hành có bước kiểm tra ghi thời điểm; SLA là hai giờ làm việc theo lịch thứ Hai–thứ Sáu 08:00–12:00 và 13:00–17:00 `Asia/Ho_Chi_Minh`, trừ ngày nghỉ cấu hình, tính cả mọi thời gian chờ và giữ dấu quá hạn sau khi đóng.
- **FR-8 — Đóng ticket và thu CSAT:** Sự kiện đóng gửi đúng một email kết quả kèm liên kết CSAT bằng token mời hết hạn, dùng một lần; khách đánh giá 1–5 sao và nhận xét tùy chọn. Chưa phản hồi khác điểm thấp; đánh giá 1–2 sao tạo đúng một việc rà soát cho Trưởng nhóm và mọi lần gửi có trạng thái/thử lại chống trùng.
- **FR-9 — Phân quyền theo trách nhiệm:** Nhân viên xem danh sách ticket của nhóm với PII đã che; chỉ người phụ trách xem thông tin liên hệ và tệp để xử lý; Trưởng nhóm xem chi tiết nhóm; Trưởng phòng và Giám đốc xem toàn bộ. Quyền phải nhất quán tại API, Odoo, Dashboard, tệp và dữ liệu xuất, đồng thời chặn liên kết cũ sau khi thu hồi.
- **FR-10 — Dashboard và bản chốt ngày:** Người có quyền xem ticket mới, tồn đọng, đã đóng, đúng/quá SLA, thời gian từng bước và CSAT; lọc theo thời gian, trạng thái, loại và truy ngược tới ticket theo quyền. Dữ liệu mới xuất hiện trong 60 giây; bản chốt ngày chạy idempotent và lưu thời điểm, kỳ, phạm vi nhóm, phiên bản định nghĩa chỉ số cùng dấu truy vết nguồn.
- **FR-11 — Phát hiện điểm nghẽn có bằng chứng:** Khi có ít nhất ba ticket Bảo hành nhận trong bảy ngày lịch gần nhất, tất cả quá SLA và cùng có bước kiểm tra kéo dài trên 60 phút làm việc, hệ thống tạo đúng một phân tích cho mỗi khóa bằng chứng. Báo cáo nêu bước chậm, kỳ, số lượng, ticket dẫn chứng, SOP nguồn đã công bố và chỉ cấp dữ liệu tổng hợp hoặc đã che định danh cho AI; hai ticket hoặc đúng 60 phút không kích hoạt.
- **FR-12 — Quyết định và cải tiến SOP:** Giám đốc chấp nhận hoặc từ chối khuyến nghị và hệ thống lưu người/thời điểm. Chỉ nhánh chấp nhận mới cho AI soạn nháp SOP và tạo việc Odoo cho Người duyệt tri thức; nháp chưa có hiệu lực, chỉ phiên bản được duyệt mới xuất hiện trong Resources và được AI sử dụng; tỷ lệ Bảo hành quá hạn trước/sau là chỉ số đánh giá cải tiến.
- **FR-13 — Hành trình đóng góp đầu tiên:** Người mới có thể dựng profile `core`, nạp fixture, chạy luồng ticket mẫu, sửa một quy tắc hoặc mẫu thông báo, chạy kiểm thử hành vi và chuẩn bị pull request mà không tải mô hình AI; tài liệu nêu rõ môi trường, lệnh chạy, dữ liệu mẫu và cách kiểm tra.

### Yêu cầu phi chức năng

- **NFR-1 — Nguồn mở và giấy phép:** Mã nguồn sản phẩm phải công khai, dùng giấy phép được OSI chấp nhận, có toàn văn giấy phép, SPDX/header thích hợp và kiểm tra tương thích giấy phép của phụ thuộc cùng mô hình AI.
- **NFR-2 — Dựng lại và phát hành:** Hệ thống phải dựng được từ mã nguồn bằng công cụ nguồn mở, cấu hình qua biến môi trường/cơ chế công khai và có bản phát hành SemVer định dạng mở chạy được ngoài thư mục mã nguồn mà không sửa mã để đổi môi trường.
- **NFR-3 — Khả năng cộng tác:** Kho mã phải có README, changelog, kênh ghi nhận lỗi, hướng dẫn đóng góp và kiểm thử tự động cho các hành vi nghiệp vụ trọng yếu.
- **NFR-4 — Quản trị phụ thuộc:** Mọi thành phần bên thứ ba phải được kê khai tên, phiên bản cố định, giấy phép và vai trò; không chép mã thư viện vào kho để thay thế cơ chế quản lý phụ thuộc chuẩn và không dùng tag `latest`.
- **NFR-5 — Quyền riêng tư:** PII, tệp, token, prompt và nội dung khách hàng phải được giảm thiểu, che hoặc loại khỏi nơi không cần thiết; AI phân loại không được nhận định danh và quyền đọc chi tiết phải nhất quán trên mọi bề mặt.
- **NFR-6 — Ranh giới quyết định của AI:** AI chỉ đưa đề xuất, giải thích và bản nháp; không tự gửi quyết định có tác động bên ngoài/tài chính, thay đổi hồ sơ chuẩn hoặc công bố SOP khi chưa có người có thẩm quyền phê duyệt.
- **NFR-7 — Toàn vẹn và kiểm toán:** Thay đổi trạng thái, phân công, phân loại, quyết định, đính chính và xuất bản phải có lịch sử nối tiếp gồm tác nhân, thời gian UTC, tương quan/nguồn gây ra và giá trị trước/sau; bản đóng không được sửa âm thầm.
- **NFR-8 — Khả năng mang dữ liệu đi:** Dữ liệu nghiệp vụ phải xuất được dưới dạng UTF-8 CSV hoặc JSON có ID ổn định, schema/từ điển trường và nguồn gốc; SOP đã duyệt phải xuất ở định dạng tài liệu mở kèm thông tin phê duyệt.
- **NFR-9 — Tính lắp ghép:** Portal, quy trình, báo cáo và AI dùng cùng mã ticket, trạng thái, loại yêu cầu và định nghĩa chỉ số; ranh giới tích hợp cùng nơi ghi dữ liệu chuẩn phải được công bố để thay adapter mà không viết lại lịch sử.
- **NFR-10 — Khả năng vận hành:** Lỗi dead-letter, outbox kẹt, Dashboard cũ và sao lưu/bản chốt thất bại phải tạo cảnh báo hoặc việc vận hành trong ngày; Dashboard phải cho biết thời điểm dữ liệu mới nhất khi cập nhật chậm.
- **NFR-11 — Sao lưu và khôi phục:** Lúc 00:30 mỗi ngày phải sao lưu cơ sở dữ liệu P/Odoo/Keycloak/Superset, tệp đính kèm, Odoo filestore và tri thức công bố; bản sao mã hóa được lưu ngoài máy, giữ 7 bản ngày/4 bản tuần/12 bản tháng, kiểm checksum và ghi bằng chứng khôi phục hàng tháng.
- **NFR-12 — Khả năng truy cập và đáp ứng:** Bề mặt web tự xây hướng tới WCAG 2.2 AA, hỗ trợ bàn phím, focus rõ, nhãn và tóm tắt lỗi, nội dung thay thế biểu đồ, không dùng màu làm tín hiệu duy nhất, dùng được tại 320 CSS px và zoom 200%; Odoo phải được kiểm tra thực tế trên desktop và trình duyệt điện thoại.
- **NFR-13 — Độ tin cậy phân tán:** Lệnh tạo và side effect phải idempotent; cập nhật dùng điều kiện phiên bản; outbox/inbox bền vững hỗ trợ retry giới hạn, khử trùng, dead-letter và thứ tự `aggregate_version`.
- **NFR-14 — An toàn triển khai:** Caddy là lối vào công khai duy nhất; dịch vụ dữ liệu, quản trị và AI đặc quyền nằm trong mạng riêng; cấm mật khẩu mặc định, wildcard CORS và secret trong kho mã.
- **NFR-15 — Phạm vi nền tảng demo:** Sản phẩm chạy trực tuyến trên web, tiếng Việt là ngôn ngữ chính, hỗ trợ máy tính và điện thoại; demo không yêu cầu offline, ứng dụng cài đặt, camera hoặc GPS.

### Yêu cầu bổ sung từ kiến trúc

- **AR-1 — Chủ quyền dữ liệu nghiệp vụ:** Chỉ các command của P được thay đổi ticket, phân công, bước xử lý, CSAT, khuyến nghị và vòng đời SOP; Odoo, Web, Node-RED, D và I chỉ dùng API hoặc sự kiện đã commit.
- **AR-2 — Lõi lục giác:** Luật xác thực, phân công, trạng thái, SLA, CSAT và phê duyệt nằm trong module domain/application TypeScript; adapter chỉ chuyển đổi giao thức/lưu trữ và Node-RED không chứa bất biến nghiệp vụ.
- **AR-3 — Trạng thái và sự kiện chống phát lại:** Giao dịch P phải ghi thay đổi cùng outbox; consumer khử trùng bằng `event_id`, theo dõi phiên bản aggregate và đưa lỗi quá số lần thử vào dead-letter.
- **AR-4 — Cô lập sở hữu dữ liệu:** P, Odoo, Keycloak và Superset dùng database/người dùng riêng theo quyền tối thiểu; Superset chỉ đọc reporting view, Odoo nhận projection và I chỉ nhận DTO đã làm sạch.
- **AR-5 — Danh tính tập trung:** Keycloak là OIDC issuer duy nhất; `sub` là định danh bất biến, trình duyệt dùng Authorization Code + PKCE, dịch vụ dùng client credentials và P kiểm tra audience, scope, vai trò, nhóm, phân công tại từng tài nguyên.
- **AR-6 — Web/BFF là ranh giới trình duyệt:** Một Next.js BFF phục vụ Portal, H/P, form ticket/CSAT và Dashboard D/I; token tái sử dụng ở phía máy chủ, cookie phiên an toàn, mutation chống CSRF, intake ẩn danh có giới hạn tốc độ/idempotency và mã ticket không phải quyền truy cập.
- **AR-7 — Odoo là bề mặt tác nghiệp:** Odoo chứa projection tối thiểu, chat và việc duyệt SOP; hành động gọi command P, liên kết chi tiết quay về kiểm tra quyền P và chỉ P ghi phê duyệt/công bố.
- **AR-8 — AI tư vấn trên dữ liệu tối thiểu:** P tự đánh giá điều kiện định lượng; I chỉ nhận mô tả hoặc bằng chứng tổng hợp/che định danh và tri thức đã công bố, trả kết quả có kiểu qua command xác thực; lưu phiên bản model, prompt, nguồn và đầu ra.
- **AR-9 — Tệp đính kèm riêng tư:** P cung cấp storage port; adapter demo lưu khóa mờ ngoài web root và metadata/checksum/MIME/kích thước trong PostgreSQL; endpoint có quyền kiểm chữ ký, phần mở rộng và giới hạn 10 MB.
- **AR-10 — Một chủ sở hữu chỉ số:** P sở hữu reporting view phiên bản hóa, phạm vi quyền và job bản chốt; Superset chỉ hiển thị dữ liệu đó, bộ lọc không cấp quyền và BFF truyền phạm vi nhóm qua grant ngắn hạn, thiếu phạm vi thì từ chối toàn bộ.
- **AR-11 — Một ingress được gia cố:** Docker Compose chia mạng public/application/data; chỉ Caddy mở cổng host, `/analytics/*` chỉ lộ runtime nhúng và mọi giao diện quản trị/dịch vụ nội bộ giữ riêng tư.
- **AR-12 — Bằng chứng vận hành:** Audit bất biến, log JSON có cấu trúc không chứa dữ liệu nhạy cảm, readiness kiểm phụ thuộc và retry có giới hạn/quan sát được.
- **AR-13 — Sao lưu trạng thái không thể tái tạo:** Backup adapter phải ghi checksum, ID/phiên bản đối tượng và kết quả; Qdrant được dựng lại từ nguồn công bố/embedding manifest, model và cache từ manifest cố định.
- **AR-14 — Profile đóng góp độc lập:** Compose có `core`, `demo`, `ai`; `core` chỉ cần P, PostgreSQL và test double, còn `demo` thêm Web/Keycloak/Odoo/Node-RED/Superset và `ai` thêm Haystack/Qdrant/Ollama.
- **AR-15 — Cổng xuất dữ liệu có quyền:** P sở hữu export port và áp dụng cùng chính sách vai trò, nhóm, phân công, che dữ liệu như khi đọc trực tuyến.
- **AR-16 — Cổng gửi thông báo:** P ghi ý định và trạng thái gửi; adapter Mailpit/SMTP hoặc Node-RED thực thi nhưng P giữ quy tắc gửi một lần cho mỗi sự kiện ngữ nghĩa.
- **AR-17 — Sàn nghiệm thu UX:** Bề mặt tùy biến và widget Odoo trọng yếu phải qua kiểm tra bàn phím, trình đọc màn hình, mobile, 320 CSS px và zoom 200% trước phát hành.
- **AR-18 — Tái lập AI:** Manifest trong kho phải khóa model sinh và embedding bằng ID/digest bất biến, giấy phép, giới hạn ngữ cảnh/kích thước vector, cấu hình phần cứng và phiên bản retrieval/prompt; fixture/fake dùng cho kiểm thử mặc định.
- **AR-19 — Phân công nguyên tử:** Chọn nhân viên và giữ chỗ diễn ra trong một transaction có bảo vệ đồng thời; sửa loại khác nhóm giải phóng và phân bổ lại nguyên tử.
- **AR-20 — Ngữ nghĩa vòng đời dùng chung:** Mọi bề mặt phải dùng cùng state machine, lịch SLA và quy tắc CSAT thấp; ticket đóng không mở lại, việc tiếp theo tạo ticket mới có liên kết.
- **AR-21 — Hợp đồng tích hợp là nguồn chuẩn:** OpenAPI và JSON Schema trong `contracts/` là nguồn giao diện duy nhất; CI chạy kiểm thử tương thích producer-consumer, sự kiện có phiên bản và consumer phát hiện gap/tái đồng bộ từ snapshot P.
- **AR-22 — Ủy quyền người dùng từ Odoo:** Odoo dùng OAuth 2.0 Token Exchange để cấp token ngắn hạn mang cả `sub` người dùng và danh tính ứng dụng gọi; P kiểm tra và audit cả hai, không tin header danh tính do caller tự gửi.
- **AR-23 — Công việc AI bất đồng bộ:** P quản lý state machine `QUEUED | RUNNING | SUCCEEDED | FAILED | EXPIRED | SUPERSEDED` với ID, digest đầu vào/bằng chứng, phiên bản model/prompt/nguồn, số lần thử và hạn; kết quả muộn, sai ngữ cảnh hoặc đã kết thúc bị từ chối idempotent.
- **AR-24 — Môi trường tách biệt:** `dev`, `test` tạm thời và `demo` tái lập phải tách secret, dữ liệu, volume và cấu hình định danh; fixture nạp tường minh/idempotent, chuyển môi trường không sửa mã, demo có TLS và ghi nhận cấu hình phần cứng tối thiểu cùng phương án không AI.
- **AR-25 — Stack và phiên bản:** Triển khai theo stack seed đã chốt trong Architecture Spine/Technology Sources và khóa phiên bản, lockfile, image digest, OCA commit cùng model digest; thay đổi stack phải cập nhật quyết định kiến trúc và kiểm thử migration.
- **AR-26 — Chuyển đổi brownfield:** Di chuyển Node-RED hiện có từ `services/p_process` sang `services/p_automation`, tạo lõi Fastify P mới, di trú schema cũ có kiểm thử, nâng Node-RED/Superset theo chủ đích và thay mạng Compose mở cổng rộng bằng kiến trúc Caddy/Keycloak đã chốt.
- **AR-27 — Cổng kiểm thử phát hành:** CI phải có unit test bất biến miền, integration test PostgreSQL/migration/outbox-inbox, contract test API/sự kiện/quyền, E2E mỏng cho UJ-1/UJ-2, accessibility checks, clean build các profile và kiểm giấy phép/phát hành.
- **AR-28 — Dữ liệu cấu hình còn phải chốt:** Chủ quy trình phải xác nhận tên bước và điều kiện hoàn tất của từng loại, trong đó Bảo hành có bước kiểm tra được tính giờ; đội demo phải chốt tài khoản/kịch bản, đề bài OLP chính thức và chính sách lưu giữ dài hạn trước các story phụ thuộc.

### Yêu cầu thiết kế UX

- **UX-DR-1 — Ngôn ngữ hình ảnh:** Portal, form và Dashboard dùng một bản sắc DX-OS “Công nghệ mở”, biến thể “A · Xanh tin cậy”, giao diện sáng, rõ và thể hiện bằng chứng truy vết H→P→D→I.
- **UX-DR-2 — Bốn không gian tương tác:** Màn đầu Portal ưu tiên bốn ô H/P/D/I có thể bấm toàn bộ; H và P mở hai trang tổng hợp riêng, D và I mở đúng hai phần của cùng một Dashboard Giám đốc.
- **UX-DR-3 — Vai trò của Odoo:** Odoo giữ giao diện tác nghiệp quen thuộc cho nhân viên, nhắn tin, rà soát CSAT thấp và duyệt SOP; DX-OS chỉ bổ sung mã ticket nổi bật, trạng thái bằng chữ, hành động chính, focus và phản hồi lỗi nhất quán.
- **UX-DR-4 — Một mã hồ sơ xuyên suốt:** Cùng mã ticket phải hiện rõ và truy theo được từ form, email, Odoo, Dashboard và báo cáo AI.
- **UX-DR-5 — Form một cột:** Form khách dùng nhãn trên trường, email bắt buộc và bố cục một cột trên điện thoại; lỗi giữ dữ liệu, đưa focus tới tóm tắt lỗi liên kết từng trường, thành công chỉ thông báo một lần mã ticket và trạng thái email.
- **UX-DR-6 — Dashboard ưu tiên ba KPI:** Phần D hiển thị đầu tiên ticket mới, ticket quá SLA và CSAT, sau đó mới tới biểu đồ, bộ lọc và danh sách khoan sâu; KPI phải có tên, kỳ, đơn vị/mẫu số và đọc được từ màn chiếu.
- **UX-DR-7 — Dữ liệu có thể kiểm chứng:** Mọi biểu đồ có bảng hoặc mô tả văn bản tương đương; bộ lọc thay đổi KPI và danh sách nguồn trong cùng phạm vi quyền, mỗi chỉ số có đường tới ticket nguồn.
- **UX-DR-8 — Trạng thái dữ liệu:** Dashboard hiển thị thời điểm dữ liệu mới nhất; khi cũ hoặc lỗi tải phải nói rõ và cho thử lại, không trình bày số cũ như số mới.
- **UX-DR-9 — Khuyến nghị AI có bằng chứng:** Thành phần AI tách rõ bằng chứng, bước chậm, kỳ, số ticket, SOP nguồn, quyết định Giám đốc, trạng thái nháp và trạng thái duyệt; không mô tả đề xuất như quyết định đã thi hành.
- **UX-DR-10 — Xác nhận hành động hệ trọng:** Đóng ticket, chấp nhận/từ chối khuyến nghị và duyệt SOP phải xác nhận ngay trong ngữ cảnh, nêu hậu quả bằng một câu, báo kết quả và lưu người/thời điểm; không xếp chồng hộp thoại.
- **UX-DR-11 — Trạng thái SOP rõ ràng:** Odoo phân biệt Nháp, Chờ duyệt, Từ chối, Đã duyệt—chưa xuất bản và Đã công bố; Resources luôn giữ bản hiệu lực cũ cho tới khi bản mới xuất bản thành công.
- **UX-DR-12 — Trạng thái và lỗi bằng chữ:** Chờ xử lý, Đang xử lý, Đóng, quá SLA, chờ duyệt, lỗi gửi và thử lại luôn có chữ/biểu tượng; màu chỉ hỗ trợ.
- **UX-DR-13 — Rào chắn dễ hiểu:** Nếu chưa có người sẵn sàng, giao diện nói ticket đang chờ nhưng SLA vẫn chạy; đóng thiếu kết quả giữ trạng thái Đang xử lý và chỉ rõ trường thiếu; lỗi tích hợp không làm mất khả năng mở hồ sơ theo quyền.
- **UX-DR-14 — CSAT truy cập được:** CSAT là nhóm radio có tên với lựa chọn “1 sao” đến “5 sao”, dùng được bằng bàn phím, giữ lựa chọn khi gửi lỗi và xác nhận bằng văn bản; “Chưa phản hồi” không hiển thị như điểm thấp.
- **UX-DR-15 — Bố cục đáp ứng:** Desktop từ 1024 px, tablet 768–1023 px, mobile dưới 768 px; tác vụ chính không cuộn ngang tại 320 CSS px hoặc zoom 200%, vùng bấm tối thiểu 24×24 CSS px và hành động chính mobile ưu tiên 44×44 CSS px.
- **UX-DR-16 — Chuyển vai demo thật:** Người trình diễn dùng các tab/phiên tài khoản chuẩn bị sẵn cho khách, nhân viên, Giám đốc và Người duyệt tri thức; phiên được cách ly và không có bộ chuyển vai giả trong sản phẩm.
- **UX-DR-17 — Luồng nhân viên đa thiết bị:** Nhân viên phải hoàn thành xem thông báo → mở ticket → xác nhận/sửa loại → nhận trách nhiệm → ghi bước → đóng trên cả desktop và trình duyệt điện thoại với cùng dữ liệu/quyền.
- **UX-DR-18 — Trạng thái trống:** Trang H, Resources, Odoo và Dashboard phải giải thích khi không có dữ liệu trong phạm vi và cung cấp hành động quay lại hoặc chỉnh bộ lọc, không tạo dữ liệu giả.
- **UX-DR-19 — Giọng văn tiếng Việt:** Nội dung dùng câu trực tiếp, nêu đối tượng và hành động tiếp theo; thời gian SLA phải nói rõ là phút/giờ làm việc và mốc tính; không dùng thuật ngữ mơ hồ hoặc tuyên bố AI quá mức.
- **UX-DR-20 — Luồng demo bắt buộc:** UX phải hỗ trợ trọn UJ-1 một ticket qua H→P→D→I, UJ-2 khuyến nghị–quyết định–duyệt/công bố SOP, UJ-3 đóng góp đầu tiên và luồng phụ Trưởng nhóm xử lý CSAT thấp.

### Bản đồ bao phủ yêu cầu chức năng

- **FR-1 → Epic 2:** Điều hướng trực tiếp từ DX-Portal tới các không gian và chức năng tương ứng.
- **FR-2 → Epic 2:** Tra cứu SOP/FAQ đã duyệt và nhận biết phiên bản có hiệu lực.
- **FR-3 → Epic 1:** Gửi thông báo Odoo đúng người, đúng ticket và đúng phạm vi quyền.
- **FR-4 → Epic 1:** Tiếp nhận ticket hợp lệ, cấp mã và gửi email xác nhận.
- **FR-5 → Epic 1:** AI phân loại từ mô tả với bước xác nhận bắt buộc của nhân viên.
- **FR-6 → Epic 1:** Phân công công bằng, nguyên tử và có hàng đợi FIFO.
- **FR-7 → Epic 1:** Quản lý vòng đời, bước xử lý, lịch sử và SLA theo giờ làm việc.
- **FR-8 → Epic 1:** Đóng ticket, gửi CSAT và tạo việc rà soát điểm thấp.
- **FR-9 → Epic 1:** Áp dụng quyền xem ticket và dữ liệu theo nhóm, trách nhiệm và vai trò.
- **FR-10 → Epic 3:** Cung cấp Dashboard, khoan sâu và bản chốt ngày có thể truy vết.
- **FR-11 → Epic 4:** Phát hiện điểm nghẽn bằng điều kiện định lượng và bằng chứng nguồn.
- **FR-12 → Epic 4:** Giám đốc quyết định, AI soạn nháp và con người duyệt trước khi công bố SOP.
- **FR-13 → Epic 5:** Cho phép người mới dựng, sửa, kiểm thử và chuẩn bị đóng góp mà không cần AI.

## Danh sách Epic

### Epic 1: Xử lý yêu cầu hỗ trợ trọn vòng đời

Khách có thể tạo ticket; hệ thống phân loại và phân công công bằng; nhân viên nhận trách nhiệm, xử lý theo SLA và đóng ticket; khách gửi CSAT; mỗi vai trò chỉ xem dữ liệu thuộc phạm vi được phép.

**Bao phủ FR:** FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9.

**Ghi chú triển khai:** Hoàn thiện một lát cắt nghiệp vụ độc lập từ form khách tới Odoo, email và CSAT. Các story trong Epic phải thiết lập lõi P cùng chính sách quyền dùng lại được cho các Epic sau.

### Epic 2: Truy cập không gian làm việc và tri thức đã duyệt

Người dùng có thể đi từ DX-Portal tới đúng không gian H/P/D/I, tìm SOP/FAQ đang có hiệu lực và không nhầm bản nháp với tài liệu chính thức.

**Bao phủ FR:** FR-1, FR-2.

**Ghi chú triển khai:** Dùng luồng ticket của Epic 1 làm đích đến từ Portal; quản lý rõ vòng đời và quyền truy cập tri thức công bố.

### Epic 3: Điều hành bằng dữ liệu có thể truy vết

Giám đốc và người quản lý xem KPI, biểu đồ, bộ lọc và bản chốt ngày, đồng thời truy ngược từ chỉ số tới ticket nguồn theo đúng quyền.

**Bao phủ FR:** FR-10.

**Ghi chú triển khai:** Dùng định nghĩa chỉ số và reporting view do P sở hữu; Superset chỉ trình bày dữ liệu đã được cấp phạm vi.

### Epic 4: Cải tiến SOP có AI hỗ trợ và con người phê duyệt

Hệ thống phát hiện điểm nghẽn có bằng chứng; Giám đốc ra quyết định; AI soạn nháp; Người duyệt tri thức phê duyệt trong Odoo trước khi SOP mới được công bố.

**Bao phủ FR:** FR-11, FR-12.

**Ghi chú triển khai:** Dùng dữ liệu từ Epic 1, chỉ số từ Epic 3 và tri thức công bố từ Epic 2; AI không nắm quyền quyết định hoặc xuất bản.

### Epic 5: Người mới có thể dựng và đóng góp cho DX-LAB

Người đóng góp mới có thể chạy profile `core`, nạp fixture, sửa một hành vi nhỏ, chạy kiểm thử và chuẩn bị pull request mà không cần tải mô hình AI.

**Bao phủ FR:** FR-13.

**Ghi chú triển khai:** Đóng gói lát cắt lõi đã xây dựng thành hành trình độc lập với Odoo, Superset và mô hình AI.

## Epic 1: Xử lý yêu cầu hỗ trợ trọn vòng đời

Khách có thể tạo ticket; hệ thống phân loại và phân công công bằng; nhân viên nhận trách nhiệm, xử lý theo SLA và đóng ticket; khách gửi CSAT; mỗi vai trò chỉ xem dữ liệu thuộc phạm vi được phép.

### Story 1.1: Người duy trì chuyển mã hiện có sang cấu trúc kiến trúc chuẩn

**Yêu cầu liên quan:** NFR-3, NFR-4, NFR-9, NFR-13, NFR-14; AR-1, AR-2, AR-4, AR-21, AR-26, AR-27.

Với vai trò là **người duy trì DX-LAB**,
tôi muốn **chuyển các thành phần hiện có sang cấu trúc repository và ranh giới đã chốt**,
để **người đóng góp có một nền tảng nhất quán, không chứa hai nơi cùng sở hữu nghiệp vụ**.

**Tiêu chí chấp nhận:**

**Cho trước** repository hiện có sử dụng `services/p_process` cho tài sản Node-RED
**Khi** hoàn tất chuyển đổi cấu trúc
**Thì** tài sản Node-RED được đặt tại `services/p_automation`
**Và** lõi P mới dùng TypeScript/Fastify được đặt tại `services/p_process`
**Và** chỉ P được phép ghi trạng thái ticket chuẩn.

**Cho trước** dữ liệu hoặc schema thử nghiệm hiện có
**Khi** lập kế hoạch migration PostgreSQL phiên bản hóa
**Thì** tài sản cũ được kiểm kê và ánh xạ chủ sở hữu trước khi di chuyển
**Và** Story nền tảng chỉ tạo migration khởi tạo cùng metadata kỹ thuật cần để P chạy
**Và** bảng nghiệp vụ ticket, phân công, bước xử lý, CSAT và SOP chỉ được tạo hoặc mở rộng tại Story đầu tiên thực sự cần chúng.

**Cho trước** Node-RED và Superset cũ đang dùng phiên bản khác kiến trúc đã chốt
**Khi** nâng cấp thành phần
**Thì** phiên bản được khóa theo Technology Sources
**Và** dữ liệu demo được dựng lại bằng fixture có phiên bản
**Và** smoke test chứng minh Node-RED nhận/giao sự kiện và Superset đọc reporting view.

**Cho trước** các giao diện tích hợp giữa P, Odoo, Node-RED, Web và AI
**Khi** cấu trúc mới được thiết lập
**Thì** OpenAPI và JSON Schema trong `contracts/` là nguồn giao diện chuẩn
**Và** không có thành phần nào đọc hoặc ghi trực tiếp bảng riêng của thành phần khác
**Và** CI kiểm tra tương thích producer–consumer.

**Cho trước** mã cũ chứa logic phân công, SLA hoặc trạng thái bên ngoài P
**Khi** chuyển đổi
**Thì** các bất biến được chuyển vào module domain/application của P
**Và** adapter chỉ chuyển đổi giao thức hoặc lưu trữ
**Và** Node-RED chỉ còn vai trò lập lịch và chuyển giao tích hợp.

**Cho trước** repository sau chuyển đổi
**Khi** người duy trì chạy kiểm thử kiến trúc
**Thì** kiểm thử thất bại nếu Odoo, Node-RED, Superset hoặc AI ghi trực tiếp bảng P
**Và** kiểm thử thất bại nếu một dependency dùng `latest`, phiên bản không khóa hoặc bí mật thật được commit.

**Cho trước** một người mới xem cấu trúc repository
**Khi** đọc README kiến trúc
**Thì** họ xác định được vị trí Web, P, Odoo, Node-RED, Dashboard, AI, contracts, hạ tầng và tài liệu
**Và** hiểu thành phần nào sở hữu dữ liệu, command và sự kiện của từng năng lực.

### Story 1.2: Người mới dựng các profile tái lập mà không cần tải AI

**Yêu cầu liên quan:** NFR-2, NFR-4, NFR-14, NFR-15; AR-11, AR-14, AR-18, AR-24, AR-25.

Với vai trò là **người đóng góp mới**,
tôi muốn **dựng hệ thống từ mã nguồn bằng các profile có phạm vi rõ ràng**,
để **bắt đầu phát triển trên máy sạch mà không phải cài toàn bộ hệ sinh thái hoặc tải mô hình AI**.

**Tiêu chí chấp nhận:**

**Cho trước** một máy sạch đáp ứng điều kiện tối thiểu đã tài liệu hóa
**Khi** người mới checkout đúng phiên bản phát hành và làm theo README
**Thì** họ có thể tạo cấu hình cục bộ từ tệp mẫu
**Và** secret sinh ra được lưu trong tệp ignored, không cần sửa mã hoặc header
**Và** mọi công cụ bắt buộc để build và chạy đều là nguồn mở.

**Cho trước** người mới chạy profile `core`
**Khi** Docker Compose khởi động thành công
**Thì** chỉ P, PostgreSQL và các test double cần thiết được chạy
**Và** health/readiness endpoint cùng migration nền hoạt động qua harness đã tài liệu hóa
**Và** profile không giả định bảng hoặc API ticket trước Story tiếp nhận ticket
**Và** không tải hoặc khởi động Odoo, Superset, Node-RED hay mô hình AI.

**Cho trước** người mới chạy lệnh nạp fixture cho `core`
**Khi** fixture đã tồn tại và lệnh được chạy lại
**Thì** dữ liệu mẫu không bị nhân đôi
**Và** kết quả có cùng ID ổn định cần thiết cho kiểm thử
**Và** fixture chỉ chứa dữ liệu của các năng lực đã được triển khai tại thời điểm đó
**Và** fixture được ghi nhãn rõ là dữ liệu demo.

**Cho trước** người duy trì chạy profile `demo`
**Khi** Compose khởi động
**Thì** Web, Keycloak, Odoo, Node-RED và Superset được thêm vào `core`
**Và** Caddy là dịch vụ duy nhất mở cổng public của host
**Và** PostgreSQL, P nội bộ, Node-RED editor, Superset admin và Keycloak admin không được công khai.

**Cho trước** người duy trì bật thêm profile `ai`
**Khi** cấu hình model hợp lệ
**Thì** Haystack, Qdrant và Ollama được khởi động với model/embedding đã khóa digest
**Và** core behavior vẫn có thể kiểm thử bằng fixture hoặc fake nếu profile `ai` không chạy.

**Cho trước** môi trường `dev`, `test` tạm thời và `demo`
**Khi** được tạo trên cùng máy hoặc CI
**Thì** mỗi môi trường sử dụng secret, database, volume, hostname và cấu hình định danh riêng
**Và** chuyển môi trường không yêu cầu sửa mã nguồn
**Và** fixture chỉ được nạp bằng lệnh tường minh.

**Cho trước** môi trường demo dùng hostname đã cấu hình
**Khi** người dùng truy cập
**Thì** Caddy kết thúc TLS và định tuyến Web, Odoo, Keycloak cùng runtime Dashboard được phép
**Và** không sử dụng mật khẩu mặc định, wildcard CORS hoặc tag `latest`.

**Cho trước** profile đã khởi động
**Khi** chạy lệnh kiểm tra sức khỏe
**Thì** readiness phản ánh trạng thái các dependency bắt buộc
**Và** thông báo lỗi chỉ rõ thành phần chưa sẵn sàng mà không để lộ secret.

**Cho trước** tài nguyên máy không đáp ứng mức tối thiểu
**Khi** người mới cố chạy `demo` hoặc `ai`
**Thì** tài liệu và kiểm tra trước khi chạy nêu rõ CPU, RAM, dung lượng còn thiếu
**Và** chỉ dẫn sử dụng `core` hoặc phương án không AI.

**Cho trước** một phiên bản phát hành được dựng lại trên máy sạch
**Khi** dùng đúng lockfile, image digest và cấu hình mẫu
**Thì** hệ thống tạo ra cùng cấu trúc dịch vụ và chạy được ngoài thư mục mã nguồn
**Và** smoke test của profile tương ứng hoàn thành thành công.

### Story 1.3: Khách tạo ticket hợp lệ

**Yêu cầu liên quan:** FR-4; NFR-12; AR-1, AR-2, AR-6; UX-DR-5, UX-DR-12, UX-DR-15, UX-DR-19.

Với vai trò là **khách hàng**,
tôi muốn **gửi yêu cầu hỗ trợ bằng biểu mẫu trực tuyến**,
để **nhận được mã ticket và biết rằng yêu cầu đã được hệ thống tiếp nhận**.

**Tiêu chí chấp nhận:**

**Cho trước** khách đang mở biểu mẫu tạo DX-Ticket
**Khi** khách nhập họ tên, số điện thoại, email, loại yêu cầu và mô tả hợp lệ rồi gửi
**Thì** hệ thống tạo đúng một ticket ở trạng thái `WAITING`
**Và** cấp mã ticket cùng thời điểm tiếp nhận từ máy chủ
**Và** lưu nguyên loại yêu cầu do khách chọn để đối chiếu với kết quả phân loại sau này
**Và** giao diện thông báo mã ticket bằng văn bản, đưa focus tới thông báo thành công.

**Cho trước** một trường bắt buộc bị bỏ trống hoặc email hay số điện thoại sai định dạng
**Khi** khách gửi biểu mẫu
**Thì** hệ thống không tạo ticket hoặc hồ sơ khách hàng
**Và** giữ lại dữ liệu hợp lệ đã nhập
**Và** hiển thị tóm tắt lỗi có liên kết tới từng trường lỗi
**Và** đưa focus bàn phím tới phần tóm tắt lỗi.

**Cho trước** số điện thoại sau chuẩn hóa đã thuộc một hồ sơ khách hàng
**Khi** ticket hợp lệ được tạo
**Thì** ticket liên kết với hồ sơ khách hàng hiện có
**Và** hệ thống không tạo khách hàng trùng.

**Cho trước** số điện thoại chưa tồn tại
**Khi** ticket hợp lệ được tạo
**Thì** hệ thống tạo hồ sơ khách hàng mới và liên kết ticket với hồ sơ đó.

**Cho trước** số điện thoại trùng nhưng email hoặc họ tên xung đột với hồ sơ hiện có
**Khi** ticket được tiếp nhận
**Thì** hệ thống tạo ticket và đánh dấu hồ sơ để rà soát
**Và** không tự động ghi đè dữ liệu liên hệ hiện có.

**Cho trước** cùng một yêu cầu được gửi lại với cùng `Idempotency-Key`
**Khi** máy chủ đã xử lý lần gửi đầu tiên
**Thì** hệ thống trả về cùng mã ticket
**Và** không tạo thêm ticket hoặc hồ sơ khách hàng.

**Cho trước** biểu mẫu được sử dụng tại 320 CSS px hoặc zoom 200%
**Khi** khách nhập và gửi yêu cầu
**Thì** tác vụ chính không yêu cầu cuộn ngang
**Và** nhãn, lỗi, trạng thái cùng điều khiển đều sử dụng được bằng bàn phím.

### Story 1.4: Khách nhận email xác nhận không trùng

**Yêu cầu liên quan:** FR-4; NFR-13; AR-3, AR-16.

Với vai trò là **khách hàng**,
tôi muốn **nhận email xác nhận sau khi gửi yêu cầu**,
để **có mã tham chiếu và biết trạng thái tiếp nhận của ticket**.

**Tiêu chí chấp nhận:**

**Cho trước** một ticket hợp lệ vừa được tạo
**Khi** giao dịch tạo ticket được ghi thành công
**Thì** hệ thống ghi ý định gửi email xác nhận vào outbox trong cùng giao dịch
**Và** email chứa mã ticket, thời điểm tiếp nhận và thông báo yêu cầu đang chờ xử lý
**Và** trạng thái gửi ban đầu được lưu để người vận hành có thể theo dõi.

**Cho trước** ý định gửi email đang chờ trong outbox
**Khi** worker chuyển email tới Mailpit hoặc máy chủ SMTP đã cấu hình
**Thì** hệ thống lưu kết quả của nhà cung cấp và đánh dấu lần gửi thành công
**Và** trạng thái trên trang xác nhận được cập nhật bằng văn bản.

**Cho trước** cùng một sự kiện tạo ticket được xử lý lại
**Khi** worker hoặc Node-RED phát lại sự kiện
**Thì** hệ thống không tạo thêm ý định gửi email cho cùng ticket và cùng sự kiện ngữ nghĩa
**Và** không tạo bản ghi thông báo trùng.

**Cho trước** nhà cung cấp email tạm thời không khả dụng
**Khi** lần gửi thất bại
**Thì** ticket vẫn tồn tại và khách vẫn thấy mã ticket trên trang xác nhận
**Và** hệ thống lưu trạng thái gửi lỗi, nguyên nhân kỹ thuật đã làm sạch và số lần thử
**Và** thực hiện số lần thử lại có giới hạn trước khi chuyển sang trạng thái cần xử lý vận hành.

**Cho trước** phản hồi thành công từ nhà cung cấp bị thất lạc sau khi email đã được chấp nhận
**Khi** tiến trình gửi được chạy lại
**Thì** khóa idempotency của thông báo được giữ nguyên
**Và** hệ thống không tạo một ý định gửi mới.

**Cho trước** hệ thống ghi log quá trình gửi
**Khi** email thành công hoặc thất bại
**Thì** log không chứa nội dung mô tả của khách, token, tệp đính kèm hoặc thông tin xác thực SMTP
**Và** audit vẫn liên kết được lần gửi với mã ticket và correlation ID.

### Story 1.5: Khách gửi tệp đính kèm riêng tư

**Yêu cầu liên quan:** FR-4, FR-9; NFR-5; AR-9; UX-DR-5, UX-DR-12, UX-DR-15.

Với vai trò là **khách hàng**,
tôi muốn **đính kèm ảnh hoặc PDF minh họa cho yêu cầu**,
để **nhân viên có đủ bằng chứng cần thiết khi xử lý ticket**.

**Tiêu chí chấp nhận:**

**Cho trước** khách đã nhập các trường bắt buộc hợp lệ
**Khi** khách đính kèm một ảnh hoặc PDF có kích thước không quá 10 MB rồi gửi biểu mẫu
**Thì** hệ thống kiểm tra phần mở rộng, MIME thực tế, chữ ký tệp và kích thước
**Và** lưu tệp bằng khóa mờ bên ngoài web root
**Và** lưu metadata gồm tên hiển thị, kích thước, MIME đã phát hiện và checksum SHA-256
**Và** liên kết tệp với đúng ticket được tạo.

**Cho trước** khách không đính kèm tệp
**Khi** khách gửi dữ liệu ticket hợp lệ
**Thì** hệ thống vẫn tạo ticket bình thường.

**Cho trước** khách chọn nhiều hơn một tệp
**Khi** gửi biểu mẫu
**Thì** hệ thống từ chối yêu cầu trước khi ghi ticket
**Và** thông báo rõ chỉ được phép đính kèm một tệp.

**Cho trước** tệp lớn hơn 10 MB, sai định dạng, có MIME giả hoặc chữ ký không khớp
**Khi** khách gửi biểu mẫu
**Thì** hệ thống không tạo ticket và không giữ tệp không hợp lệ
**Và** giữ lại các trường văn bản hợp lệ trên giao diện
**Và** đưa focus tới tóm tắt lỗi có liên kết tới trường tệp.

**Cho trước** một yêu cầu có tệp được gửi lại với cùng `Idempotency-Key`
**Khi** lần gửi đầu đã thành công
**Thì** hệ thống trả về cùng ticket và cùng bản ghi tệp
**Và** không tạo bản sao tệp hoặc metadata mới.

**Cho trước** một người thử đoán đường dẫn hoặc khóa lưu trữ của tệp
**Khi** gửi yêu cầu trực tiếp tới web server hoặc storage volume
**Thì** hệ thống không trả nội dung tệp
**Và** tệp chỉ có thể được đọc qua endpoint của P sau khi kiểm tra quyền.

**Cho trước** hệ thống ghi log quá trình tải tệp
**Khi** tải lên thành công hoặc thất bại
**Thì** log không chứa nội dung tệp, thông tin liên hệ của khách hoặc khóa truy cập có thể tái sử dụng.

### Story 1.6: Người dùng nội bộ xem ticket đúng phạm vi trách nhiệm

**Yêu cầu liên quan:** FR-9; NFR-5; AR-5, AR-7, AR-22; UX-DR-3, UX-DR-4, UX-DR-12, UX-DR-15, UX-DR-17.

Với vai trò là **người dùng nội bộ**,
tôi muốn **chỉ xem dữ liệu ticket thuộc phạm vi trách nhiệm của mình**,
để **thông tin khách hàng được bảo vệ nhưng công việc vẫn có thể được theo dõi**.

**Tiêu chí chấp nhận:**

**Cho trước** người dùng đăng nhập qua Keycloak
**Khi** Web hoặc Odoo gọi P thay mặt người đó
**Thì** P xác thực issuer, audience, scope và `sub` bất biến
**Và** kiểm tra vai trò, nhóm cùng quan hệ phân công tại mỗi yêu cầu tài nguyên
**Và** không tin bất kỳ header danh tính nào do ứng dụng gọi tự cung cấp.

**Cho trước** một Nhân viên thuộc nhóm xử lý ticket
**Khi** mở danh sách ticket của nhóm
**Thì** nhân viên thấy mã, loại, trạng thái, SLA và phần tóm tắt nghiệp vụ cần thiết
**Và** họ tên, email, số điện thoại cùng liên kết tệp được che nếu người đó chưa nhận trách nhiệm.

**Cho trước** Nhân viên là người phụ trách hiện tại của ticket
**Khi** mở chi tiết ticket
**Thì** nhân viên được xem thông tin liên hệ và tải tệp qua endpoint có kiểm tra quyền
**Và** audit ghi nhận tác nhân cùng ứng dụng gọi mà không ghi nội dung nhạy cảm.

**Cho trước** Trưởng nhóm mở ticket thuộc nhóm mình
**Khi** yêu cầu chi tiết ticket
**Thì** Trưởng nhóm được xem dữ liệu cần thiết để giám sát và rà soát
**Và** không xem được ticket của nhóm khác nếu không có vai trò rộng hơn.

**Cho trước** Trưởng phòng hoặc Giám đốc đã được cấp vai trò tương ứng
**Khi** truy cập danh sách hoặc chi tiết ticket
**Thì** họ được xem toàn bộ phạm vi tổ chức theo chính sách đã cấu hình.

**Cho trước** một Nhân viên khác nhóm, người chưa được phân công hoặc token thiếu phạm vi
**Khi** mở URL trực tiếp, gọi API hoặc dùng liên kết Odoo tới chi tiết/tệp
**Thì** hệ thống từ chối theo mặc định
**Và** không tiết lộ qua thông báo lỗi rằng tài nguyên đó có tồn tại hay không.

**Cho trước** quyền hoặc tư cách nhóm của một tài khoản đã bị thu hồi
**Khi** người đó dùng lại tab, phiên hoặc liên kết cũ
**Thì** lần đọc tiếp theo bị từ chối
**Và** dữ liệu đã truy cập trước đó không còn được tải lại từ API.

**Cho trước** nhân viên sử dụng Odoo trên máy tính hoặc trình duyệt điện thoại
**Khi** điều hướng danh sách và mở ticket được phép
**Thì** mã ticket, trạng thái bằng chữ, focus và hành động chính đều sử dụng được bằng bàn phím
**Và** không có dữ liệu ngoài phạm vi bị lộ trong danh sách, thông báo hoặc nội dung chat.

### Story 1.7: Hệ thống phân công công bằng và thông báo qua Odoo

**Yêu cầu liên quan:** FR-3, FR-6; NFR-13; AR-3, AR-7, AR-16, AR-19, AR-21; UX-DR-3, UX-DR-4, UX-DR-12, UX-DR-13, UX-DR-17.

Với vai trò là **nhân viên hỗ trợ**,
tôi muốn **nhận ticket phù hợp theo một quy tắc phân công công bằng**,
để **khối lượng công việc được cân bằng và không có hai ticket giữ chỗ cho tôi cùng lúc**.

**Tiêu chí chấp nhận:**

**Cho trước** một ticket mới ở trạng thái `WAITING`
**Khi** hệ thống bắt đầu phân công tạm theo loại khách đã chọn
**Thì** hệ thống xác định đúng nhóm xử lý được ánh xạ với loại đó
**Và** chỉ xét nhân viên đang sẵn sàng, không có ticket hoạt động hoặc lượt giữ chỗ khác.

**Cho trước** nhiều nhân viên đủ điều kiện trong cùng nhóm
**Khi** hệ thống chọn người nhận
**Thì** ưu tiên người có số lượt nhận trách nhiệm chính thức thấp nhất
**Và** nếu bằng nhau, chọn theo vòng ID nhân viên bất biến tăng dần kể từ người được chọn gần nhất.

**Cho trước** hai ticket được tạo gần như đồng thời
**Khi** cả hai tiến trình cùng tìm nhân viên sẵn sàng
**Thì** việc chọn người và tạo lượt giữ chỗ diễn ra nguyên tử trong cơ sở dữ liệu
**Và** một nhân viên không thể bị giữ chỗ cho cả hai ticket.

**Cho trước** mọi nhân viên của nhóm đều bận hoặc đã được giữ chỗ
**Khi** có ticket mới
**Thì** ticket được đưa vào hàng đợi theo thời điểm tiếp nhận rồi mã ticket
**Và** giao diện ghi rõ ticket chưa có người chịu trách nhiệm nhưng SLA vẫn đang được tính.

**Cho trước** một vị trí xử lý vừa được giải phóng
**Khi** hệ thống xét lại hàng đợi
**Thì** ticket đến sớm nhất được phân công trước
**Và** vẫn áp dụng quy tắc số lượt thấp nhất cùng vòng ID tăng dần.

**Cho trước** một lượt giữ chỗ tạm vừa được tạo
**Khi** giao dịch được commit
**Thì** P ghi sự kiện phân công vào outbox
**Và** Node-RED chuyển sự kiện có xác thực tới endpoint Odoo có phiên bản
**Và** Odoo ghi sự kiện vào inbox bền vững cùng projection trước khi trả xác nhận thành công.

**Cho trước** Odoo nhận lại cùng `event_id` hoặc một phiên bản aggregate cũ
**Khi** xử lý sự kiện
**Thì** Odoo không tạo thêm thông báo hay work item
**Và** bỏ qua phiên bản cũ nhưng vẫn giữ khả năng phát hiện khoảng trống phiên bản.

**Cho trước** sự kiện phân công được xử lý thành công
**Khi** nhân viên mở Odoo
**Thì** họ thấy đúng một thông báo chứa mã ticket, trạng thái giữ chỗ và liên kết nội bộ
**Và** liên kết vẫn được P kiểm tra quyền khi mở
**Và** thông báo/chat không chứa email, số điện thoại hoặc URL tệp của khách.

**Cho trước** lỗi giao sự kiện hoặc thông báo Odoo
**Khi** số lần thử giới hạn đã hết
**Thì** bản ghi chuyển sang dead-letter hoặc trạng thái gửi lỗi
**Và** tạo cảnh báo vận hành trong ngày
**Và** ticket vẫn truy cập được từ danh sách theo quyền.

**Cho trước** nhân viên chưa xác nhận loại và trách nhiệm
**Khi** ticket mới chỉ được giữ chỗ tạm
**Thì** bộ đếm lượt nhận chính thức của nhân viên chưa tăng.

### Story 1.8: Nhân viên xác nhận phân loại do AI đề xuất

**Yêu cầu liên quan:** FR-5, FR-6; NFR-5, NFR-6, NFR-13; AR-8, AR-19, AR-23; UX-DR-3, UX-DR-4, UX-DR-12, UX-DR-13, UX-DR-17, UX-DR-19.

Với vai trò là **nhân viên được giữ chỗ cho ticket**,
tôi muốn **xem, xác nhận hoặc sửa loại yêu cầu do AI đề xuất**,
để **ticket được chuyển đúng nhóm và tôi chỉ nhận trách nhiệm sau khi kiểm tra**.

**Tiêu chí chấp nhận:**

**Cho trước** một ticket hợp lệ vừa được commit
**Khi** P tạo công việc phân loại AI
**Thì** công việc có `job_id`, digest đầu vào, phiên bản model/prompt, số lần thử, thời hạn và trạng thái ban đầu `QUEUED`
**Và** dữ liệu gửi tới AI chỉ chứa phần mô tả vấn đề
**Và** không chứa loại khách chọn, họ tên, điện thoại, email hoặc tệp đính kèm.

**Cho trước** AI trả kết quả hợp lệ trong thời hạn
**Khi** P kiểm tra đúng `job_id`, digest và phiên bản yêu cầu
**Thì** hệ thống lưu loại AI đề xuất cùng phiên bản model/prompt/đầu ra
**Và** hiển thị đề xuất cho nhân viên nhưng chưa coi đó là loại cuối cùng.

**Cho trước** AI timeout, thất bại hoặc hết hạn
**Khi** nhân viên mở ticket
**Thì** hệ thống dùng loại khách chọn làm loại tạm thời
**Và** vẫn bắt buộc nhân viên xác nhận hoặc sửa trước khi xử lý
**Và** giao diện giải thích rõ AI chưa cung cấp kết quả.

**Cho trước** một kết quả AI đến muộn, sai digest, sai phiên bản hoặc thuộc công việc đã `EXPIRED` hay `SUPERSEDED`
**Khi** P nhận kết quả
**Thì** P từ chối kết quả theo cách idempotent
**Và** không thay đổi loại hoặc người đang giữ chỗ.

**Cho trước** nhân viên đồng ý với loại đang hiển thị
**Khi** chọn xác nhận và nhận trách nhiệm
**Thì** hệ thống lưu loại khách chọn, loại AI gợi ý, loại cuối cùng, người và thời điểm xác nhận
**Và** chuyển lượt giữ chỗ thành phân công chính thức trong một giao dịch
**Và** tăng bộ đếm lượt nhận chính thức của nhân viên đúng một lần.

**Cho trước** nhân viên sửa loại nhưng loại mới vẫn thuộc cùng nhóm
**Khi** xác nhận và nhận trách nhiệm
**Thì** hệ thống lưu loại cuối cùng đã sửa cùng lịch sử trước/sau
**Và** giữ nguyên người phụ trách
**Và** tăng bộ đếm chính thức đúng một lần.

**Cho trước** nhân viên sửa loại làm thay đổi nhóm xử lý
**Khi** xác nhận loại mới
**Thì** hệ thống nguyên tử thu hồi lượt giữ chỗ và quyền chi tiết của nhân viên cũ
**Và** không tăng bộ đếm của nhóm cũ
**Và** phân công lại trong nhóm mới theo quy tắc công bằng
**Và** lưu lịch sử chuyển giao cùng người xác nhận và thời điểm.

**Cho trước** nhân viên gửi lại thao tác xác nhận với cùng `Idempotency-Key`
**Khi** lần xác nhận đầu đã thành công
**Thì** hệ thống trả về cùng kết quả
**Và** không tăng bộ đếm hoặc tạo sự kiện phân công lần thứ hai.

**Cho trước** nhân viên chưa xác nhận loại cuối cùng và trách nhiệm
**Khi** cố chuyển ticket sang `IN_PROGRESS`
**Thì** hệ thống từ chối
**Và** chỉ rõ cần hoàn tất bước xác nhận trước.

**Cho trước** widget phân loại được dùng trên desktop hoặc trình duyệt điện thoại
**Khi** nhân viên dùng bàn phím hoặc công nghệ hỗ trợ
**Thì** loại khách chọn, gợi ý AI, loại cuối cùng và hành động xác nhận có nhãn rõ
**Và** trạng thái AI không chỉ được thể hiện bằng màu.

### Story 1.9: Nhân viên xử lý ticket theo quy trình và SLA

**Yêu cầu liên quan:** FR-7; NFR-7, NFR-12; AR-2, AR-20, AR-28; UX-DR-3, UX-DR-4, UX-DR-12, UX-DR-13, UX-DR-15, UX-DR-17, UX-DR-19.

Với vai trò là **người phụ trách ticket**,
tôi muốn **ghi nhận các bước xử lý và theo dõi SLA theo giờ làm việc**,
để **hoàn thành yêu cầu đúng quy trình và nhận biết nguy cơ quá hạn**.

**Tiêu chí chấp nhận:**

**Cho trước** nhân viên đã xác nhận loại cuối cùng và nhận trách nhiệm
**Khi** bắt đầu xử lý
**Thì** ticket chuyển từ `WAITING` sang `IN_PROGRESS`
**Và** hệ thống gắn phiên bản quy trình tương ứng với loại cuối cùng
**Và** audit lưu tác nhân, thời điểm UTC, trạng thái trước/sau và correlation ID.

**Cho trước** ticket Khiếu nại sử dụng cấu hình quy trình demo đã được phiên bản hóa
**Khi** người phụ trách thực hiện quy trình
**Thì** các bước theo thứ tự là Tiếp nhận và xác minh → Xử lý khiếu nại → Phản hồi kết quả
**Và** từng bước lần lượt yêu cầu ghi nội dung xác minh, hành động xử lý và kết quả phản hồi trước khi hoàn tất.

**Cho trước** ticket Tư vấn sử dụng cấu hình quy trình demo đã được phiên bản hóa
**Khi** người phụ trách thực hiện quy trình
**Thì** các bước theo thứ tự là Xác định nhu cầu → Chuẩn bị phương án → Tư vấn và xác nhận
**Và** từng bước lần lượt yêu cầu ghi tóm tắt nhu cầu, phương án đề xuất và kết quả xác nhận trước khi hoàn tất.

**Cho trước** ticket Bảo hành sử dụng cấu hình quy trình demo đã được phiên bản hóa
**Khi** người phụ trách thực hiện quy trình
**Thì** các bước theo thứ tự là Tiếp nhận sản phẩm → Kiểm tra → Thực hiện bảo hành → Kiểm tra kết quả
**Và** Bước kiểm tra yêu cầu thời điểm bắt đầu, kết thúc và kết quả chẩn đoán
**Và** các bước còn lại lần lượt yêu cầu thông tin tiếp nhận, hành động bảo hành và kết quả kiểm tra cuối.

**Cho trước** người dùng không phải người phụ trách hiện tại
**Khi** cố bắt đầu, cập nhật bước hoặc ghi kết quả xử lý
**Thì** P từ chối thao tác kể cả khi yêu cầu đi qua Odoo
**Và** không thay đổi ticket hoặc lịch sử.

**Cho trước** ticket đang `IN_PROGRESS`
**Khi** người phụ trách bắt đầu hoặc hoàn tất một bước hợp lệ
**Thì** hệ thống lưu tên bước, phiên bản quy trình, thời điểm bắt đầu/kết thúc và người thực hiện
**Và** ngăn việc kết thúc trước thời điểm bắt đầu hoặc hoàn tất sai thứ tự quy trình.

**Cho trước** ticket loại Bảo hành
**Khi** người phụ trách thực hiện Bước kiểm tra
**Thì** hệ thống bắt buộc ghi mốc bắt đầu và kết thúc riêng
**Và** thời lượng bước được tính theo cùng lịch giờ làm việc với SLA
**Và** bước còn mở được tính tới thời điểm truy vấn.

**Cho trước** một ticket được tiếp nhận trong giờ làm việc
**Khi** hệ thống tính hạn SLA
**Thì** hạn hoàn tất bằng hai giờ làm việc kể từ thời điểm tiếp nhận hợp lệ
**Và** lịch áp dụng là thứ Hai–thứ Sáu, 08:00–12:00 và 13:00–17:00 theo `Asia/Ho_Chi_Minh`, trừ ngày nghỉ đã cấu hình.

**Cho trước** ticket được nhận ngoài ca, trong giờ nghỉ trưa hoặc trước ngày nghỉ
**Khi** hệ thống tính SLA
**Thì** đồng hồ chỉ tiến trong ca làm việc kế tiếp
**Và** kết quả đúng tại các ranh giới bắt đầu/kết thúc ca và ngày nghỉ.

**Cho trước** ticket đang chờ phân công, kiểm tra, linh kiện hoặc thao tác khác
**Khi** khoảng thời gian đó nằm trong giờ làm việc
**Thì** thời gian chờ vẫn được tính vào SLA
**Và** không có trạng thái nghiệp vụ nào tự động tạm dừng đồng hồ.

**Cho trước** thời lượng SLA vượt hai giờ làm việc trước khi ticket đóng
**Khi** bộ tính SLA hoặc tác vụ định kỳ đánh giá ticket
**Thì** ticket được đánh dấu quá SLA với thời điểm vượt hạn
**Và** giao diện hiển thị bằng chữ số phút/giờ làm việc cùng mốc tính, không chỉ dùng màu.

**Cho trước** hai cập nhật dùng cùng phiên bản aggregate
**Khi** một cập nhật đã commit trước
**Thì** cập nhật còn lại bị từ chối do xung đột phiên bản
**Và** giao diện yêu cầu tải lại dữ liệu thay vì ghi đè âm thầm.

**Cho trước** nhân viên thao tác trên desktop hoặc trình duyệt điện thoại
**Khi** xem trạng thái, SLA và ghi bước xử lý
**Thì** mã ticket, bước hiện tại, hành động tiếp theo và lỗi xác thực có nhãn rõ
**Và** tác vụ chính dùng được bằng bàn phím, không cuộn ngang tại 320 CSS px.

### Story 1.10: Người phụ trách đóng ticket và khách gửi CSAT

**Yêu cầu liên quan:** FR-7, FR-8; NFR-7, NFR-12, NFR-13; AR-16, AR-20; UX-DR-4, UX-DR-10, UX-DR-12, UX-DR-13, UX-DR-14, UX-DR-15, UX-DR-17, UX-DR-19.

Với vai trò là **người phụ trách ticket**,
tôi muốn **đóng ticket sau khi hoàn tất quy trình và gửi lời mời đánh giá cho khách**,
để **kết quả xử lý được xác nhận và chất lượng dịch vụ được đo lường**.

**Tiêu chí chấp nhận:**

**Cho trước** ticket đang `IN_PROGRESS` nhưng thiếu kết quả xử lý hoặc bước bắt buộc chưa hoàn tất
**Khi** người phụ trách chọn Đóng
**Thì** hệ thống giữ ticket ở `IN_PROGRESS`
**Và** chỉ rõ từng dữ liệu hoặc bước còn thiếu
**Và** không phát sinh email đóng hoặc lời mời CSAT.

**Cho trước** người dùng không phải người phụ trách hiện tại
**Khi** cố đóng ticket qua Odoo hoặc gọi trực tiếp API
**Thì** P từ chối thao tác
**Và** không thay đổi trạng thái, SLA hoặc lịch sử.

**Cho trước** người phụ trách đã ghi đủ kết quả và hoàn tất các bước bắt buộc
**Khi** xác nhận hành động Đóng trong đúng ngữ cảnh
**Thì** giao diện nêu hậu quả của việc đóng bằng một câu
**Và** P chuyển ticket sang `CLOSED` đúng một lần
**Và** lưu kết quả, người đóng, thời điểm UTC và audit trước/sau
**Và** dừng đồng hồ SLA tại thời điểm đóng.

**Cho trước** ticket đã quá SLA trước khi đóng
**Khi** trạng thái chuyển sang `CLOSED`
**Thì** cờ quá SLA và thời điểm vượt hạn vẫn được giữ trong lịch sử
**Và** ticket không được chuyển thành đúng hạn.

**Cho trước** ticket vừa đóng
**Khi** giao dịch đóng được commit
**Thì** lượt xử lý của nhân viên được giải phóng
**Và** hệ thống xét ticket chờ tiếp theo theo FIFO và quy tắc phân công công bằng
**Và** ghi đúng một ý định gửi email kết quả kèm lời mời CSAT vào outbox.

**Cho trước** email đóng được tạo
**Khi** adapter gửi email xử lý thông báo
**Thì** email chứa mã ticket, kết quả xử lý và một liên kết CSAT bằng token mờ
**Và** token có hạn sử dụng, chỉ dùng một lần và được ràng buộc với đúng ticket
**Và** mã ticket không được dùng thay cho quyền gửi đánh giá.

**Cho trước** sự kiện đóng hoặc tiến trình gửi email được phát lại
**Khi** cùng khóa idempotency đã được xử lý
**Thì** hệ thống không tạo thêm ý định gửi, token CSAT hoặc email ngữ nghĩa mới
**Và** trạng thái gửi cùng kết quả nhà cung cấp vẫn có thể được theo dõi và thử lại có giới hạn.

**Cho trước** khách mở một token CSAT hợp lệ chưa sử dụng
**Khi** chọn từ 1 đến 5 sao, nhập nhận xét tùy chọn và gửi
**Thì** hệ thống lưu đúng một phản hồi gắn với ticket
**Và** đánh dấu token đã sử dụng
**Và** xác nhận kết quả bằng văn bản.

**Cho trước** token CSAT hết hạn, đã dùng hoặc không hợp lệ
**Khi** khách gửi phản hồi
**Thì** hệ thống từ chối mà không tiết lộ dữ liệu ticket
**Và** không tạo hoặc thay đổi phản hồi đã có.

**Cho trước** khách chưa gửi CSAT
**Khi** hệ thống tổng hợp trạng thái phản hồi
**Thì** ticket được ghi nhận là “Chưa phản hồi”
**Và** không bị tính như 0 sao hoặc phản hồi thấp.

**Cho trước** khách sử dụng biểu mẫu CSAT bằng bàn phím hoặc công nghệ hỗ trợ
**Khi** chọn điểm
**Thì** điểm được trình bày dưới dạng nhóm radio có tên với lựa chọn “1 sao” đến “5 sao”
**Và** trạng thái chọn, lỗi gửi và xác nhận thành công đều có nội dung bằng chữ.

**Cho trước** một ticket đã `CLOSED`
**Khi** có nhu cầu xử lý tiếp
**Thì** ticket cũ không được mở lại trong bản demo
**Và** người có quyền có thể tạo ticket mới liên kết tới ticket cũ.

### Story 1.11: Trưởng nhóm rà soát phản hồi CSAT thấp

**Yêu cầu liên quan:** FR-8, FR-9; NFR-7, NFR-12, NFR-13; AR-7, AR-20, AR-21, AR-22; UX-DR-3, UX-DR-4, UX-DR-12, UX-DR-13, UX-DR-15, UX-DR-17, UX-DR-19.

Với vai trò là **Trưởng nhóm**,
tôi muốn **nhận và hoàn thành việc rà soát khi khách đánh giá thấp**,
để **nhóm xác định nguyên nhân và có hành động khắc phục phù hợp**.

**Tiêu chí chấp nhận:**

**Cho trước** khách gửi đánh giá 1 hoặc 2 sao hợp lệ
**Khi** phản hồi CSAT được commit
**Thì** P tạo đúng một việc rà soát cho Trưởng nhóm của ticket
**Và** việc rà soát liên kết tới ticket, điểm, nhận xét, nhóm chịu trách nhiệm và thời điểm phản hồi
**Và** sự kiện tạo việc được ghi vào outbox trong cùng giao dịch.

**Cho trước** khách gửi đánh giá từ 3 đến 5 sao
**Khi** phản hồi được ghi nhận
**Thì** hệ thống không tạo việc rà soát CSAT thấp.

**Cho trước** ticket chưa nhận được phản hồi CSAT
**Khi** tiến trình kiểm tra phản hồi chạy
**Thì** hệ thống giữ trạng thái “Chưa phản hồi”
**Và** không tạo việc rà soát.

**Cho trước** sự kiện CSAT thấp được phát lại hoặc Odoo nhận lại cùng `event_id`
**Khi** consumer xử lý sự kiện
**Thì** không tạo thêm work item hoặc thông báo
**Và** cùng một phản hồi chỉ có một việc rà soát đang được quản lý.

**Cho trước** Odoo đã nhận sự kiện CSAT thấp
**Khi** Trưởng nhóm mở danh sách việc
**Thì** họ thấy mã ticket, điểm bằng chữ, nhận xét nếu có và trạng thái rà soát
**Và** liên kết chi tiết chỉ mở được trong phạm vi nhóm của họ
**Và** thông báo không chứa PII hoặc URL tệp ngoài phạm vi cần thiết.

**Cho trước** Trưởng nhóm của nhóm khác hoặc Nhân viên thường
**Khi** cố mở hay cập nhật việc rà soát
**Thì** P từ chối thao tác
**Và** không tiết lộ nội dung ticket hoặc phản hồi.

**Cho trước** Trưởng nhóm đang xem một việc hợp lệ
**Khi** ghi nguyên nhân, kết luận và hành động khắc phục rồi hoàn thành
**Thì** hệ thống lưu kết quả rà soát, người thực hiện và thời điểm
**Và** trạng thái work item được đồng bộ với Odoo
**Và** audit ghi giá trị trước/sau.

**Cho trước** kết quả rà soát còn thiếu trường bắt buộc
**Khi** Trưởng nhóm chọn Hoàn thành
**Thì** hệ thống giữ việc ở trạng thái đang rà soát
**Và** chỉ rõ nội dung còn thiếu.

**Cho trước** việc chuyển tới Odoo thất bại
**Khi** số lần thử giới hạn đã hết
**Thì** trạng thái gửi lỗi và cảnh báo vận hành được ghi nhận
**Và** việc rà soát vẫn tồn tại trong P để không bị mất.

**Cho trước** Trưởng nhóm thao tác bằng bàn phím hoặc trên trình duyệt điện thoại
**Khi** xem và hoàn thành việc rà soát
**Thì** điểm CSAT, trạng thái, trường bắt buộc và hành động chính có nhãn rõ
**Và** màu không phải tín hiệu duy nhất.

## Epic 2: Truy cập không gian làm việc và tri thức đã duyệt

Người dùng có thể đi từ DX-Portal tới đúng không gian H/P/D/I, tìm SOP/FAQ đang có hiệu lực và không nhầm bản nháp với tài liệu chính thức.

### Story 2.1: Nhân sự công ty điều hướng qua bốn không gian H/P/D/I

**Yêu cầu liên quan:** FR-1, FR-9; NFR-12, NFR-15; AR-5, AR-6, AR-17; UX-DR-1, UX-DR-2, UX-DR-4, UX-DR-12, UX-DR-15, UX-DR-18, UX-DR-19.

Với vai trò là **nhân sự thuộc công ty**,
tôi muốn **đăng nhập và bấm trực tiếp vào từng không gian H, P, D hoặc I**,
để **đi tới đúng khu vực làm việc nội bộ mà không phải tự tìm đường dẫn của từng công cụ**.

**Tiêu chí chấp nhận:**

**Cho trước** người dùng chưa đăng nhập
**Khi** mở DX-Portal hoặc URL con của Portal
**Thì** hệ thống chuyển người dùng tới Keycloak để đăng nhập
**Và** không tải nội dung, thông báo hoặc đường dẫn nội bộ trước khi xác thực thành công.

**Cho trước** người dùng đăng nhập bằng tài khoản công ty đang hoạt động
**Khi** Keycloak trả token có issuer, audience và tư cách thành viên hợp lệ
**Thì** người dùng được mở DX-Portal
**Và** phiên sử dụng cookie có `Secure`, `HttpOnly`, `SameSite=Lax`.

**Cho trước** tài khoản không thuộc công ty, đã bị vô hiệu hóa hoặc thiếu tư cách thành viên
**Khi** cố đăng nhập hoặc mở URL Portal trực tiếp
**Thì** hệ thống từ chối truy cập
**Và** không hiển thị cấu trúc, thông báo hoặc dữ liệu nội bộ.

**Cho trước** nhân sự mở DX-Portal
**Khi** trang tải thành công
**Thì** bốn không gian H, P, D và I xuất hiện ở vùng ưu tiên
**Và** toàn bộ mỗi ô là một liên kết có tên đầy đủ và mô tả ngắn
**Và** giao diện sử dụng hướng “Công nghệ mở”, màu “Xanh tin cậy”.

**Cho trước** nhân sự chọn H hoặc P
**Khi** kích hoạt liên kết
**Thì** hệ thống mở trang tổng hợp tương ứng
**Và** luôn có đường quay lại DX-Portal.

**Cho trước** nhân sự có quyền Dashboard
**Khi** chọn D hoặc I
**Thì** hệ thống mở cùng một ứng dụng Dashboard
**Và** đưa người dùng tới đúng phần D hoặc I.

**Cho trước** nhân sự không có quyền đối với một chức năng bên trong Portal
**Khi** họ bấm liên kết hoặc mở URL trực tiếp
**Thì** tài nguyên đích kiểm tra lại quyền và từ chối theo mặc định
**Và** không làm lộ dữ liệu ngoài phạm vi.

**Cho trước** khách hàng có liên kết công khai tới biểu mẫu DX-Ticket
**Khi** khách mở hoặc gửi biểu mẫu
**Thì** khách chỉ truy cập được biểu mẫu và trang xác nhận
**Và** không thể dùng phiên đó để truy cập DX-Portal, Resources nội bộ, Odoo hoặc Dashboard.

**Cho trước** Portal được mở trên màn chiếu, điện thoại hoặc tại zoom 200%
**Khi** nhân sự quan sát và điều hướng
**Thì** thứ tự H→P→D→I vẫn rõ ràng
**Và** không phải cuộn ngang tại 320 CSS px
**Và** mọi ô dùng được bằng bàn phím với focus rõ.

### Story 2.2: Nhân viên tra cứu SOP và FAQ đang có hiệu lực

**Yêu cầu liên quan:** FR-2; NFR-5, NFR-8, NFR-12; AR-7, AR-8, AR-15, AR-17; UX-DR-11, UX-DR-12, UX-DR-15, UX-DR-18, UX-DR-19.

Với vai trò là **nhân viên công ty**,
tôi muốn **tìm và mở SOP hoặc FAQ đã được công bố**,
để **thực hiện công việc theo đúng phiên bản tri thức đang có hiệu lực**.

**Tiêu chí chấp nhận:**

**Cho trước** nhân viên đã đăng nhập và có quyền vào Resources
**Khi** mở thư viện
**Thì** hệ thống chỉ liệt kê SOP và FAQ ở trạng thái đã công bố mà người đó được phép xem
**Và** mỗi mục hiển thị tên, loại tài liệu, phiên bản, ngày hiệu lực và trạng thái bằng chữ.

**Cho trước** thư viện có nhiều tài liệu
**Khi** nhân viên tìm theo từ khóa hoặc lọc theo loại
**Thì** kết quả chỉ được tạo từ các phiên bản đã công bố
**Và** không trả về bản nháp, bản chờ duyệt, bản bị từ chối hoặc bản đã thay thế như tài liệu hiện hành.

**Cho trước** một SOP có nhiều phiên bản
**Khi** nhân viên mở SOP từ kết quả chính
**Thì** hệ thống hiển thị phiên bản đang có hiệu lực
**Và** cho biết mã phiên bản, người phê duyệt và thời điểm công bố
**Và** không tự động trộn nội dung của các phiên bản.

**Cho trước** người dùng có URL trực tiếp tới một bản nháp hoặc bản chưa công bố
**Khi** mở URL đó qua Resources
**Thì** hệ thống từ chối theo mặc định
**Và** không hiển thị nội dung, metadata nhạy cảm hoặc liên kết tải xuống của bản nháp.

**Cho trước** endpoint truy xuất tri thức dành cho AI
**Khi** AI yêu cầu nội dung tham chiếu
**Thì** endpoint chỉ trả tài liệu đã công bố kèm đúng phiên bản và nguồn gốc
**Và** bản nháp hoặc tài liệu chưa duyệt không được đưa vào chỉ mục truy xuất.

**Cho trước** việc tạo chỉ mục bị lỗi sau khi một SOP mới đã được phê duyệt
**Khi** Resources được truy cập
**Thì** phiên bản có hiệu lực cũ vẫn tiếp tục được hiển thị
**Và** phiên bản mới mang trạng thái “Đã duyệt — chưa xuất bản” tại nơi quản trị
**Và** hệ thống cho phép người có trách nhiệm thử xuất bản lại.

**Cho trước** không có tài liệu phù hợp với quyền hoặc bộ lọc
**Khi** thư viện trả kết quả rỗng
**Thì** giao diện thông báo rõ chưa có tài liệu phù hợp
**Và** cung cấp thao tác xóa bộ lọc hoặc quay lại trang H
**Và** không tạo tài liệu mẫu giả.

**Cho trước** nhân viên dùng bàn phím, trình đọc màn hình hoặc màn hình 320 CSS px
**Khi** tìm kiếm và mở tài liệu
**Thì** trường tìm kiếm, bộ lọc, kết quả, phiên bản và trạng thái có nhãn rõ
**Và** tác vụ chính không yêu cầu cuộn ngang hoặc phụ thuộc riêng vào màu sắc.

### Story 2.3: Nhân viên khởi tạo công việc từ trang tổng hợp H và P

**Yêu cầu liên quan:** FR-1, FR-3; NFR-9, NFR-12, NFR-15; AR-6, AR-7, AR-17; UX-DR-2, UX-DR-3, UX-DR-12, UX-DR-15, UX-DR-18, UX-DR-19.

Với vai trò là **nhân viên công ty**,
tôi muốn **xem thông tin cần thiết và mở đúng công cụ từ các trang tổng hợp H và P**,
để **bắt đầu công việc mà không phải nhớ đường dẫn riêng của từng hệ thống**.

**Tiêu chí chấp nhận:**

**Cho trước** nhân viên chọn H từ DX-Portal
**Khi** trang tổng hợp H tải thành công
**Thì** trang hiển thị thông báo nội bộ theo quyền, lối vào Resources và lối vào Odoo
**Và** mỗi khối nêu rõ mục đích cùng hành động tiếp theo
**Và** có đường quay lại DX-Portal.

**Cho trước** nhân viên chỉ thuộc một nhóm nội bộ
**Khi** trang H tải thông báo
**Thì** họ chỉ thấy thông báo toàn công ty và thông báo của nhóm được phép
**Và** không thấy tiêu đề, nội dung hoặc số lượng thông báo của nhóm khác.

**Cho trước** một thông báo trỏ tới ticket, chủ đề Odoo hoặc tài liệu
**Khi** nhân viên kích hoạt liên kết
**Thì** tài nguyên đích kiểm tra lại quyền
**Và** liên kết trên Portal không thay thế kiểm tra quyền của P, Odoo hoặc Resources.

**Cho trước** nhân viên chọn P từ DX-Portal
**Khi** trang tổng hợp P tải thành công
**Thì** trang hiển thị danh sách quy trình được phép sử dụng
**Và** DX-Ticket xuất hiện như một quy trình có mô tả, đối tượng sử dụng và hành động mở biểu mẫu
**Và** trang không mở thẳng form trước khi người dùng chọn quy trình.

**Cho trước** nhân viên chọn quy trình DX-Ticket
**Khi** kích hoạt hành động tạo yêu cầu
**Thì** hệ thống mở biểu mẫu công khai đã triển khai ở Story 1.3–1.5
**Và** biểu mẫu không cung cấp đường truy cập ngược tới nội dung nội bộ cho khách hàng không có phiên công ty.

**Cho trước** nhân viên chọn lối vào xử lý ticket trong Odoo
**Khi** Odoo mở bằng phiên đăng nhập hợp lệ
**Thì** nhân viên chỉ thấy danh sách và hành động thuộc phạm vi đã xác định ở Epic 1
**Và** mã ticket cùng tên trạng thái nhất quán với Portal và P.

**Cho trước** trang H hoặc P không có thông báo hay quy trình trong phạm vi
**Khi** dữ liệu trả về rỗng
**Thì** giao diện giải thích rõ trạng thái trống
**Và** cung cấp đường quay lại Portal hoặc hành động phù hợp
**Và** không tạo dữ liệu mẫu giả.

**Cho trước** một nguồn tích hợp tạm thời lỗi
**Khi** trang tổng hợp vẫn còn các chức năng khác khả dụng
**Thì** giao diện chỉ báo lỗi tại khối liên quan và cho phép thử lại
**Và** các liên kết còn lại vẫn sử dụng được.

**Cho trước** nhân viên sử dụng bàn phím, trình đọc màn hình hoặc trình duyệt điện thoại
**Khi** điều hướng trang H và P
**Thì** tiêu đề, vùng nội dung, liên kết và trạng thái lỗi có cấu trúc ngữ nghĩa
**Và** focus đi theo thứ tự hợp lý
**Và** tác vụ chính không cuộn ngang tại 320 CSS px hoặc zoom 200%.

## Epic 3: Điều hành bằng dữ liệu có thể truy vết

Giám đốc và người quản lý xem KPI, biểu đồ, bộ lọc và bản chốt ngày, đồng thời truy ngược từ chỉ số tới ticket nguồn theo đúng quyền.

### Story 3.1: Người quản lý xem bộ chỉ số thống nhất theo đúng phạm vi

**Yêu cầu liên quan:** FR-9, FR-10; NFR-5, NFR-9; AR-4, AR-10; UX-DR-6, UX-DR-7, UX-DR-12.

Với vai trò là **người quản lý**,
tôi muốn **truy vấn các chỉ số vận hành được định nghĩa thống nhất trong phạm vi quyền của mình**,
để **ra quyết định dựa trên cùng một nguồn số liệu có thể kiểm chứng**.

**Tiêu chí chấp nhận:**

**Cho trước** dữ liệu ticket, bước xử lý và CSAT đã được ghi trong P
**Khi** reporting view được truy vấn
**Thì** P cung cấp các chỉ số ticket mới, tồn đọng, đã đóng, đúng SLA, quá SLA, thời gian từng bước và CSAT
**Và** mỗi chỉ số có phiên bản định nghĩa, kỳ dữ liệu, đơn vị và mẫu số thích hợp.

**Cho trước** hệ thống tính CSAT
**Khi** tổng hợp phản hồi hợp lệ
**Thì** CSAT chính là tỷ lệ phản hồi 4–5 sao trên tổng phản hồi hợp lệ
**Và** luôn đi cùng số lượt phản hồi
**Và** “Chưa phản hồi” không được tính là 0 sao
**Và** điểm trung bình 1–5, nếu hiển thị, có tên riêng để không nhầm với tỷ lệ CSAT.

**Cho trước** Trưởng nhóm yêu cầu dữ liệu báo cáo
**Khi** P cấp phạm vi báo cáo
**Thì** phạm vi chỉ gồm các `group_id` do người đó quản lý
**Và** dữ liệu ngoài nhóm không được đưa vào kết quả hoặc số tổng.

**Cho trước** Trưởng phòng hoặc Giám đốc yêu cầu dữ liệu
**Khi** vai trò được P xác thực
**Thì** hệ thống cấp đúng phạm vi phòng ban hoặc toàn tổ chức
**Và** audit lưu người yêu cầu, phạm vi và thời điểm.

**Cho trước** phạm vi báo cáo bị thiếu, không xác định hoặc đã bị thu hồi
**Khi** BFF yêu cầu grant nhúng cho Superset
**Thì** P từ chối toàn bộ thay vì mở rộng mặc định
**Và** liên kết hoặc phiên Dashboard cũ không tiếp tục đọc được dữ liệu.

**Cho trước** P cấp một grant báo cáo hợp lệ
**Khi** BFF tạo phiên nhúng Superset
**Thì** grant có thời hạn ngắn và chứa chính xác danh sách nhóm được phép
**Và** BFF không thể tự thêm `group_id` ngoài phạm vi P đã cấp
**Và** bộ lọc giao diện không được dùng thay cho kiểm soát quyền.

**Cho trước** Superset truy vấn dữ liệu
**Khi** sử dụng tài khoản database dành cho báo cáo
**Thì** tài khoản chỉ đọc được reporting view phiên bản hóa và cột chỉ số được duyệt
**Và** không đọc được bảng P riêng tư, PII hoặc tệp đính kèm.

**Cho trước** Dashboard, bản chốt ngày và đầu vào phân tích AI sử dụng cùng một chỉ số
**Khi** truy vấn trong cùng kỳ và phạm vi
**Thì** cả ba sử dụng cùng phiên bản định nghĩa do P sở hữu
**Và** có thể truy vết về tập ticket hoặc sự kiện nguồn tương ứng.

**Cho trước** một người dùng cố sửa tham số nhóm, guest token hoặc URL nhúng
**Khi** phạm vi không khớp với quyền tại P
**Thì** hệ thống từ chối yêu cầu
**Và** không làm lộ số lượng, nhãn hoặc dữ liệu của nhóm ngoài phạm vi.

### Story 3.2: Giám đốc theo dõi và khoan sâu trên Dashboard D

**Yêu cầu liên quan:** FR-10; NFR-10, NFR-12; AR-10, AR-17; UX-DR-1, UX-DR-2, UX-DR-6, UX-DR-7, UX-DR-8, UX-DR-12, UX-DR-15, UX-DR-19.

Với vai trò là **Giám đốc**,
tôi muốn **xem tổng quan vận hành và truy ngược từ chỉ số tới ticket nguồn**,
để **phát hiện vấn đề và kiểm chứng số liệu ngay trong buổi điều hành**.

**Tiêu chí chấp nhận:**

**Cho trước** Giám đốc mở phần D từ DX-Portal
**Khi** Dashboard tải thành công
**Thì** ba thẻ đầu tiên lần lượt hiển thị ticket mới, ticket quá SLA và CSAT
**Và** mỗi thẻ có tên, giá trị, kỳ dữ liệu, đơn vị hoặc mẫu số cần thiết
**Và** thời điểm dữ liệu mới nhất được hiển thị bằng chữ.

**Cho trước** dữ liệu vận hành tồn tại trong phạm vi được phép
**Khi** Dashboard hiển thị phần tổng quan
**Thì** sau ba KPI là các biểu đồ về xu hướng ticket, trạng thái, loại yêu cầu và thời gian xử lý
**Và** mỗi biểu đồ có bảng hoặc phần mô tả văn bản chứa cùng dữ liệu
**Và** màu không phải tín hiệu duy nhất để phân biệt trạng thái.

**Cho trước** Giám đốc thay đổi bộ lọc thời gian, trạng thái hoặc loại yêu cầu
**Khi** bộ lọc được áp dụng
**Thì** ba KPI, biểu đồ và danh sách ticket nguồn cùng thay đổi theo một phạm vi
**Và** giao diện hiển thị rõ các bộ lọc đang có hiệu lực
**Và** không làm mở rộng quyền dữ liệu của phiên.

**Cho trước** một ticket hoặc sự kiện vừa được P commit
**Khi** chưa quá 60 giây kể từ thời điểm commit
**Thì** thay đổi xuất hiện trên Dashboard mà không cần sửa báo cáo thủ công
**Và** chỉ số sử dụng cùng định nghĩa phiên bản hóa của Story 3.1.

**Cho trước** Giám đốc chọn một KPI, điểm dữ liệu hoặc hàng nguồn
**Khi** yêu cầu khoan sâu
**Thì** Dashboard hiển thị danh sách ticket cấu thành chỉ số trong kỳ và bộ lọc hiện tại
**Và** mỗi ticket có mã, trạng thái, loại, SLA và đường mở hồ sơ theo quyền
**Và** không đưa PII vào biểu đồ hoặc danh sách khi không cần thiết.

**Cho trước** người dùng có phạm vi chỉ ở một nhóm hoặc phòng ban
**Khi** khoan sâu từ cùng một chỉ số
**Thì** chỉ những ticket thuộc phạm vi được trả về
**Và** số tổng khớp với danh sách nguồn trong cùng điều kiện lọc.

**Cho trước** dữ liệu chưa được làm mới trong giới hạn 60 giây hoặc truy vấn thất bại
**Khi** Dashboard phát hiện trạng thái cũ hoặc lỗi
**Thì** giao diện hiển thị thời điểm dữ liệu mới nhất, trạng thái lỗi và hành động thử lại
**Và** không trình bày số cũ như số liệu hiện tại
**Và** tạo cảnh báo vận hành nếu tình trạng cũ vượt ngưỡng cấu hình.

**Cho trước** không có ticket trong kỳ và phạm vi đã chọn
**Khi** Dashboard trả kết quả rỗng
**Thì** KPI hiển thị giá trị phù hợp cùng mẫu số
**Và** giao diện giải thích chưa có dữ liệu, cho phép đổi bộ lọc
**Và** không tạo biểu đồ hoặc ticket giả.

**Cho trước** Dashboard được trình chiếu trên desktop
**Khi** Giám đốc quan sát từ xa
**Thì** ba KPI đầu và mã ticket trong danh sách khoan sâu đọc được rõ ràng
**Và** biểu đồ có mức ưu tiên thị giác thấp hơn ba KPI.

**Cho trước** Dashboard được dùng bằng bàn phím, trình đọc màn hình, tại 320 CSS px hoặc zoom 200%
**Khi** người dùng lọc, đọc dữ liệu và khoan sâu
**Thì** điều khiển có nhãn, focus rõ và thứ tự hợp lý
**Và** nội dung xếp thành một cột khi cần mà không mất hành động chính
**Và** mọi thông tin biểu đồ vẫn có thể đọc dưới dạng văn bản hoặc bảng.

### Story 3.3: Người quản lý đối chiếu bản chốt ngày và dữ liệu nguồn

**Yêu cầu liên quan:** FR-10; NFR-7, NFR-8, NFR-10, NFR-13; AR-10, AR-12, AR-15; UX-DR-7, UX-DR-8, UX-DR-12, UX-DR-15, UX-DR-19.

Với vai trò là **người quản lý**,
tôi muốn **xem lại bộ chỉ số được chốt vào cuối mỗi ngày**,
để **nhận biết biến động bất thường và đối chiếu với dữ liệu nguồn khi có vấn đề**.

**Tiêu chí chấp nhận:**

**Cho trước** ngày làm việc vừa kết thúc
**Khi** tác vụ bản chốt chạy theo lịch cấu hình, mặc định sau 17:00 theo `Asia/Ho_Chi_Minh`
**Thì** hệ thống tạo bản chốt riêng cho từng phạm vi nhóm cần quản lý
**Và** lưu `as_of`, kỳ dữ liệu, `group_id`, phiên bản định nghĩa chỉ số và thời điểm hoàn thành.

**Cho trước** bản chốt của cùng ngày, phạm vi và phiên bản định nghĩa đã tồn tại
**Khi** tác vụ được chạy lại
**Thì** hệ thống trả về hoặc cập nhật đúng bản ghi được phép theo quy tắc đã định
**Và** không tạo bản chốt trùng hoặc đếm ticket hai lần.

**Cho trước** bản chốt được tạo thành công
**Khi** người quản lý mở lịch sử chỉ số
**Thì** họ xem được ticket mới, tồn đọng, đã đóng, đúng/quá SLA, thời gian từng bước và CSAT của ngày đó
**Và** mỗi chỉ số hiển thị kỳ, đơn vị, mẫu số và phiên bản định nghĩa.

**Cho trước** người quản lý so sánh hai ngày
**Khi** các bản chốt dùng cùng phiên bản định nghĩa
**Thì** hệ thống hiển thị mức thay đổi và xu hướng
**Và** cho phép truy tới tập ticket hoặc sự kiện nguồn của từng giá trị.

**Cho trước** hai bản chốt dùng phiên bản định nghĩa chỉ số khác nhau
**Khi** người dùng yêu cầu so sánh
**Thì** giao diện cảnh báo rõ hai giá trị không hoàn toàn tương đương
**Và** không tự trình bày chênh lệch như một xu hướng cùng cơ sở tính.

**Cho trước** Trưởng nhóm mở lịch sử bản chốt
**Khi** truy vấn dữ liệu
**Thì** chỉ bản chốt của nhóm được quản lý được trả về
**Và** Trưởng phòng hoặc Giám đốc chỉ nhận phạm vi tương ứng với quyền hiện tại.

**Cho trước** quyền của người dùng đã bị thu hồi
**Khi** họ dùng URL hoặc phiên cũ để mở bản chốt
**Thì** hệ thống từ chối truy cập
**Và** không cho phép truy ngược tới ticket nguồn.

**Cho trước** tác vụ bản chốt thất bại hoặc không hoàn thành đúng lịch
**Khi** hệ thống giám sát phát hiện lỗi
**Thì** tạo cảnh báo hoặc việc vận hành trong ngày
**Và** lưu trạng thái, số lần thử và nguyên nhân kỹ thuật đã làm sạch
**Và** không thay thế bản chốt cũ bằng dữ liệu chưa hoàn tất.

**Cho trước** người có quyền cần mang số liệu sang công cụ khác
**Khi** xuất bản chốt
**Thì** hệ thống tạo UTF-8 CSV hoặc JSON có ID ổn định, schema/từ điển trường, kỳ, phạm vi, phiên bản định nghĩa và nguồn gốc
**Và** áp dụng cùng chính sách quyền và che dữ liệu như khi xem trực tuyến.

**Cho trước** Dashboard hiển thị lịch sử bản chốt trên màn hình hẹp hoặc bằng công nghệ hỗ trợ
**Khi** người dùng chọn ngày, so sánh và truy nguồn
**Thì** điều khiển có nhãn, bảng đọc được bằng bàn phím và trình đọc màn hình
**Và** xu hướng không chỉ được biểu đạt bằng màu hoặc biểu đồ.

## Epic 4: Cải tiến SOP có AI hỗ trợ và con người phê duyệt

Hệ thống phát hiện điểm nghẽn có bằng chứng; Giám đốc ra quyết định; AI soạn nháp; Người duyệt tri thức phê duyệt trong Odoo trước khi SOP mới được công bố.

### Story 4.1: Giám đốc nhận cảnh báo điểm nghẽn có bằng chứng

**Yêu cầu liên quan:** FR-11; NFR-5, NFR-7, NFR-13; AR-8, AR-10, AR-23; UX-DR-8, UX-DR-9, UX-DR-12, UX-DR-19, UX-DR-20.

Với vai trò là **Giám đốc**,
tôi muốn **được cảnh báo khi nhiều ticket Bảo hành cùng chậm tại Bước kiểm tra**,
để **nhận biết điểm nghẽn quy trình dựa trên dữ liệu cụ thể**.

**Tiêu chí chấp nhận:**

**Cho trước** dữ liệu ticket và bước xử lý đã được P ghi nhận
**Khi** có sự kiện xử lý mới hoặc tác vụ đánh giá định kỳ chạy
**Thì** P đánh giá điều kiện điểm nghẽn bằng quy tắc miền xác định
**Và** không giao việc xác định điều kiện kích hoạt cho mô hình AI.

**Cho trước** có ít nhất ba ticket loại Bảo hành được tiếp nhận trong bảy ngày lịch gần nhất
**Và** tất cả đều quá SLA hai giờ làm việc
**Và** cùng có Bước kiểm tra kéo dài trên 60 phút làm việc
**Khi** P đánh giá dữ liệu
**Thì** hệ thống tạo một hồ sơ phân tích điểm nghẽn
**Và** lưu khoảng thời gian, tên/phiên bản bước, số ticket và danh sách mã ticket dẫn chứng.

**Cho trước** chỉ có hai ticket thỏa điều kiện
**Khi** P đánh giá
**Thì** hệ thống không tạo hồ sơ phân tích hoặc khuyến nghị.

**Cho trước** một Bước kiểm tra kéo dài đúng 60 phút làm việc
**Khi** P đánh giá
**Thì** bước đó không được tính là vượt ngưỡng.

**Cho trước** Bước kiểm tra chưa kết thúc
**Khi** P đánh giá thời lượng
**Thì** thời lượng được tính từ lúc bắt đầu đến thời điểm đánh giá theo lịch giờ làm việc
**Và** chỉ được tính là chậm khi lớn hơn 60 phút làm việc.

**Cho trước** một trong ba ticket chưa quá SLA hoặc nằm ngoài cửa sổ bảy ngày
**Khi** P đánh giá
**Thì** ticket đó không được tính vào tập bằng chứng
**Và** phân tích chỉ được tạo nếu tập còn lại vẫn có ít nhất ba ticket hợp lệ.

**Cho trước** cùng một loại, bước, kỳ và tập ticket dẫn chứng đã tạo hồ sơ phân tích
**Khi** dữ liệu được đọc lại hoặc sự kiện bị phát lại
**Thì** khóa bằng chứng tạo ra cùng kết quả
**Và** hệ thống không tạo khuyến nghị hoặc công việc phân tích trùng.

**Cho trước** điều kiện điểm nghẽn vừa được xác nhận
**Khi** P tạo công việc phân tích bất đồng bộ
**Thì** công việc có `analysis_id`, `job_id`, digest bằng chứng, phiên bản định nghĩa chỉ số, phiên bản nguồn, số lần thử, hạn và trạng thái `QUEUED`
**Và** cùng giao dịch lưu sự kiện thông báo qua outbox.

**Cho trước** Giám đốc mở phần I khi phân tích AI chưa hoàn tất
**Khi** hồ sơ điểm nghẽn đã tồn tại
**Thì** Dashboard hiển thị cảnh báo gồm bước chậm, kỳ, số lượng và ticket dẫn chứng
**Và** trạng thái ghi rõ “Đang phân tích” thay vì trình bày như đã có khuyến nghị AI.

**Cho trước** bằng chứng được chuẩn bị cho AI
**Khi** P tạo DTO phân tích
**Thì** dữ liệu chỉ gồm số liệu tổng hợp, mã dẫn chứng cần thiết và nội dung đã che định danh
**Và** không chứa tên, email, số điện thoại, tệp hoặc token của khách.

### Story 4.2: Giám đốc xem khuyến nghị AI và dữ liệu dẫn chứng

**Yêu cầu liên quan:** FR-11; NFR-5, NFR-6, NFR-7, NFR-12; AR-8, AR-18, AR-23; UX-DR-2, UX-DR-7, UX-DR-8, UX-DR-9, UX-DR-12, UX-DR-15, UX-DR-19, UX-DR-20.

Với vai trò là **Giám đốc**,
tôi muốn **xem khuyến nghị AI cùng bằng chứng và nguồn tri thức đã sử dụng**,
để **đánh giá đề xuất trước khi đưa ra quyết định**.

**Tiêu chí chấp nhận:**

**Cho trước** P đã tạo công việc phân tích điểm nghẽn
**Khi** gửi yêu cầu tới dịch vụ I
**Thì** yêu cầu chỉ chứa DTO đã tổng hợp hoặc che định danh
**Và** tham chiếu duy nhất các SOP đã công bố kèm mã phiên bản
**Và** ghi model digest, phiên bản prompt, retrieval và nguồn tri thức trong manifest.

**Cho trước** AI hoàn thành phân tích đúng thời hạn
**Khi** trả kết quả về P
**Thì** kết quả có cấu trúc gồm tóm tắt vấn đề, bằng chứng được viện dẫn, đề xuất hành động và giới hạn phân tích
**Và** lặp lại đúng `analysis_id`, `job_id`, digest bằng chứng cùng phiên bản model/prompt/nguồn
**Và** không chứa lệnh tự thi hành hoặc tuyên bố rằng SOP đã được thay đổi.

**Cho trước** kết quả AI khớp công việc đang hoạt động
**Khi** P xác thực schema và ngữ cảnh
**Thì** P lưu đề xuất, giải thích, phiên bản đầu vào/đầu ra và chuyển công việc sang `SUCCEEDED`
**Và** cùng một kết quả gửi lại không tạo khuyến nghị trùng.

**Cho trước** kết quả đến muộn, sai digest, sai phiên bản hoặc thuộc công việc `EXPIRED`, `FAILED` hay `SUPERSEDED`
**Khi** P nhận kết quả
**Thì** P từ chối theo cách idempotent
**Và** không thay thế khuyến nghị hiện hành hoặc tạo nháp SOP.

**Cho trước** AI timeout hoặc thất bại sau số lần thử giới hạn
**Khi** Giám đốc mở phần I
**Thì** bằng chứng xác định từ Story 4.1 vẫn được hiển thị
**Và** trạng thái ghi rõ chưa có phân tích AI, kèm hành động thử lại nếu được phép
**Và** không tạo nội dung khuyến nghị giả.

**Cho trước** một khuyến nghị AI hợp lệ
**Khi** Giám đốc mở chi tiết
**Thì** giao diện tách rõ bước chậm, kỳ đánh giá, số ticket, ticket dẫn chứng, SOP nguồn và nội dung đề xuất
**Và** hiển thị trạng thái “Chờ Giám đốc quyết định”
**Và** không mô tả tương quan trước/sau như quan hệ nhân quả đã được chứng minh.

**Cho trước** Giám đốc chọn một ticket dẫn chứng
**Khi** mở hồ sơ nguồn
**Thì** P kiểm tra lại quyền ở thời điểm truy cập
**Và** mở đúng mã ticket cùng Bước kiểm tra liên quan
**Và** không đưa PII vào phần khuyến nghị tổng hợp.

**Cho trước** Giám đốc chuyển giữa phần D và I
**Khi** đang xem cùng kỳ hoặc phạm vi
**Thì** hai phần nằm trong cùng ứng dụng Dashboard
**Và** giữ rõ bộ lọc, phạm vi và đường quay lại bằng chứng liên quan.

**Cho trước** khuyến nghị được xem bằng bàn phím, trình đọc màn hình hoặc tại zoom 200%
**Khi** Giám đốc đọc bằng chứng và đề xuất
**Thì** cấu trúc tiêu đề, nguồn, trạng thái và hành động có nhãn rõ
**Và** nội dung không phụ thuộc vào màu hoặc biểu đồ để truyền đạt kết luận.

### Story 4.3: Giám đốc quyết định và yêu cầu AI soạn nháp SOP

**Yêu cầu liên quan:** FR-12; NFR-6, NFR-7, NFR-13; AR-7, AR-8, AR-23; UX-DR-9, UX-DR-10, UX-DR-11, UX-DR-12, UX-DR-19, UX-DR-20.

Với vai trò là **Giám đốc**,
tôi muốn **chấp nhận hoặc từ chối khuyến nghị và chỉ tạo nháp SOP khi chấp nhận**,
để **AI hỗ trợ chuẩn bị thay đổi nhưng quyền quyết định vẫn thuộc con người**.

**Tiêu chí chấp nhận:**

**Cho trước** một khuyến nghị đang chờ quyết định
**Khi** người không có vai trò Giám đốc cố chấp nhận hoặc từ chối
**Thì** P từ chối thao tác
**Và** không thay đổi trạng thái hoặc tạo công việc AI.

**Cho trước** Giám đốc chọn Chấp nhận hoặc Từ chối
**Khi** xác nhận hành động trong ngữ cảnh khuyến nghị
**Thì** giao diện nêu hậu quả của lựa chọn bằng một câu
**Và** P lưu quyết định, người quyết định, thời điểm UTC, lý do tùy chọn và audit trước/sau
**Và** thao tác lặp với cùng `Idempotency-Key` không tạo quyết định thứ hai.

**Cho trước** Giám đốc từ chối khuyến nghị
**Khi** quyết định được commit
**Thì** khuyến nghị chuyển sang trạng thái đã từ chối
**Và** hệ thống không tạo công việc soạn SOP, bản nháp hoặc việc Odoo
**Và** bằng chứng cùng quyết định vẫn được giữ để kiểm toán.

**Cho trước** Giám đốc chấp nhận khuyến nghị
**Khi** quyết định được commit
**Thì** P tạo công việc AI soạn nháp SOP bất đồng bộ
**Và** công việc lưu `job_id`, khuyến nghị nguồn, phiên bản SOP hiện hành, digest bằng chứng, phiên bản model/prompt/nguồn, số lần thử và hạn
**Và** trạng thái Dashboard ghi rõ “Đang soạn bản nháp”.

**Cho trước** AI soạn nháp SOP
**Khi** xử lý công việc
**Thì** AI chỉ nhận bằng chứng đã che định danh, quyết định được chấp nhận và nội dung SOP đã công bố đúng phiên bản
**Và** trả về bản nháp có cấu trúc, lý do thay đổi và liên kết tới bằng chứng
**Và** không gọi lệnh công bố hoặc thay đổi SOP hiện hành.

**Cho trước** AI trả bản nháp đúng `job_id`, digest và phiên bản yêu cầu
**Khi** P xác thực schema và ngữ cảnh
**Thì** P tạo một phiên bản SOP nháp bất biến liên kết với SOP nguồn, khuyến nghị và quyết định
**Và** lưu model, prompt, source và output version
**Và** không đưa bản nháp vào Resources hoặc chỉ mục truy xuất AI.

**Cho trước** kết quả AI đến muộn, sai ngữ cảnh hoặc thuộc công việc đã kết thúc
**Khi** P nhận kết quả
**Thì** P từ chối idempotent
**Và** không thay thế nháp hiện hành hoặc tạo work item mới.

**Cho trước** bản nháp hợp lệ vừa được lưu
**Khi** giao dịch được commit
**Thì** P tạo đúng một việc rà soát và sự kiện gửi tới Người duyệt tri thức trong Odoo
**Và** work item tham chiếu phiên bản nháp bất biến
**Và** Odoo hiển thị nhãn “Nháp — chờ duyệt”.

**Cho trước** có nháp mới thay thế nháp đang chờ
**Khi** phiên bản mới trở thành nháp hiện hành
**Thì** work item cũ được đánh dấu `SUPERSEDED` rõ ràng
**Và** không thể dùng việc cũ để phê duyệt hoặc xuất bản phiên bản mới.

**Cho trước** AI soạn nháp thất bại hoặc Odoo chưa nhận được việc
**Khi** Giám đốc xem trạng thái
**Thì** Dashboard phân biệt lỗi soạn nháp với lỗi chuyển việc
**Và** cung cấp hành động thử lại phù hợp có chống trùng
**Và** không trình bày SOP như đã thay đổi.

### Story 4.4: Người duyệt tri thức rà soát và công bố SOP trong Odoo

**Yêu cầu liên quan:** FR-2, FR-12; NFR-6, NFR-7, NFR-8, NFR-12, NFR-13; AR-7, AR-8, AR-15, AR-17, AR-21, AR-22; UX-DR-3, UX-DR-9, UX-DR-10, UX-DR-11, UX-DR-12, UX-DR-15, UX-DR-17, UX-DR-19, UX-DR-20.

Với vai trò là **Người duyệt tri thức**,
tôi muốn **rà soát, phê duyệt hoặc từ chối bản nháp SOP trong Odoo**,
để **chỉ nội dung đã được con người kiểm tra mới trở thành quy trình có hiệu lực**.

**Tiêu chí chấp nhận:**

**Cho trước** Người duyệt tri thức mở một work item còn hiệu lực trong Odoo
**Khi** xem chi tiết
**Thì** giao diện hiển thị bản nháp, SOP nguồn, phần thay đổi, lý do, khuyến nghị và bằng chứng liên quan
**Và** hiển thị rõ mã phiên bản cùng trạng thái “Nháp — chờ duyệt”
**Và** không đưa PII của khách vào nội dung rà soát.

**Cho trước** Odoo gọi P thay mặt Người duyệt
**Khi** gửi hành động phê duyệt hoặc từ chối
**Thì** Odoo dùng token ngắn hạn chứa cả `sub` người dùng và danh tính ứng dụng gọi
**Và** P kiểm tra vai trò Người duyệt tri thức cùng trạng thái phiên bản
**Và** không tin header danh tính do caller tự khai báo.

**Cho trước** người không có vai trò Người duyệt tri thức
**Khi** cố phê duyệt, từ chối hoặc mở nội dung nháp
**Thì** P từ chối thao tác
**Và** không làm lộ nội dung hoặc metadata của bản nháp.

**Cho trước** bản nháp đã bị thay thế hoặc work item mang trạng thái `SUPERSEDED`
**Khi** Người duyệt cố xử lý
**Thì** hệ thống từ chối phê duyệt
**Và** chỉ rõ phiên bản mới cần được rà soát.

**Cho trước** Người duyệt chọn Từ chối và nhập lý do bắt buộc
**Khi** xác nhận hành động
**Thì** P lưu trạng thái từ chối, người duyệt, thời điểm, lý do và audit trước/sau
**Và** bản nháp không xuất hiện trong Resources hoặc chỉ mục AI
**Và** Odoo cập nhật work item thành “Đã từ chối”.

**Cho trước** Người duyệt chọn Phê duyệt
**Khi** xác nhận hậu quả của việc công bố
**Thì** P lưu quyết định phê duyệt cùng người và thời điểm
**Và** chuyển phiên bản sang “Đã duyệt — chưa xuất bản” trước khi hoàn tất bước công bố
**Và** thao tác lặp với cùng `Idempotency-Key` không tạo lần duyệt thứ hai.

**Cho trước** bước xuất bản hoàn tất thành công
**Khi** nội dung và chỉ mục tri thức đã sẵn sàng
**Thì** P chuyển phiên bản mới thành SOP có hiệu lực
**Và** phiên bản cũ được giữ để truy vết nhưng không còn là bản hiện hành
**Và** Resources hiển thị phiên bản mới với người duyệt và thời điểm công bố
**Và** endpoint tri thức AI chỉ mục đúng phiên bản mới.

**Cho trước** việc tạo chỉ mục hoặc xuất bản thất bại sau khi phê duyệt
**Khi** hệ thống ghi nhận lỗi
**Thì** bản mới giữ trạng thái “Đã duyệt — chưa xuất bản”
**Và** Resources cùng AI tiếp tục sử dụng phiên bản có hiệu lực cũ
**Và** Người duyệt có hành động thử lại an toàn
**Và** lỗi tạo cảnh báo vận hành trong ngày.

**Cho trước** phiên bản SOP mới đã công bố
**Khi** người có quyền xuất tài liệu
**Thì** hệ thống cung cấp định dạng tài liệu mở kèm ID, phiên bản, SOP nguồn, người duyệt, thời điểm và nguồn gốc thay đổi.

**Cho trước** Người duyệt thao tác trên desktop, trình duyệt điện thoại hoặc bằng bàn phím
**Khi** xem thay đổi và ra quyết định
**Thì** phiên bản, trạng thái, bằng chứng, nút phê duyệt/từ chối và lỗi có nhãn rõ
**Và** hộp xác nhận không xếp chồng
**Và** focus quay về work item cùng thông báo kết quả bằng chữ.

### Story 4.5: Giám đốc đánh giá kết quả cải tiến trước và sau SOP

**Yêu cầu liên quan:** FR-12; NFR-7, NFR-9, NFR-12; AR-10, AR-17; UX-DR-7, UX-DR-8, UX-DR-9, UX-DR-12, UX-DR-15, UX-DR-19, UX-DR-20.

Với vai trò là **Giám đốc**,
tôi muốn **so sánh tỷ lệ ticket Bảo hành quá SLA trước và sau khi SOP mới có hiệu lực**,
để **đánh giá liệu quy trình có dấu hiệu cải thiện và quyết định bước tiếp theo**.

**Tiêu chí chấp nhận:**

**Cho trước** một SOP mới đã được công bố
**Khi** hệ thống thiết lập phép đánh giá cải tiến
**Thì** mốc phân chia trước/sau là thời điểm SOP bắt đầu có hiệu lực
**Và** hai kỳ so sánh có độ dài bằng nhau theo cấu hình
**Và** kỳ mặc định là bảy ngày lịch trước và bảy ngày lịch sau mốc hiệu lực.

**Cho trước** kỳ sau chưa đủ dữ liệu theo độ dài đã chọn
**Khi** Giám đốc mở đánh giá
**Thì** giao diện ghi rõ kỳ sau chưa hoàn tất và số ngày còn thiếu
**Và** không trình bày kết quả tạm thời như kết luận cuối cùng.

**Cho trước** hai kỳ đã đủ dữ liệu
**Khi** hệ thống tính tỷ lệ Bảo hành quá SLA
**Thì** mỗi kỳ hiển thị số ticket Bảo hành quá SLA, tổng ticket Bảo hành và tỷ lệ tương ứng
**Và** cả hai dùng cùng phiên bản định nghĩa chỉ số, phạm vi tổ chức và quy tắc SLA
**Và** mọi ticket được phân kỳ theo thời điểm tiếp nhận đã xác định.

**Cho trước** phiên bản định nghĩa chỉ số thay đổi giữa hai kỳ
**Khi** người dùng yêu cầu so sánh
**Thì** hệ thống cảnh báo phép so sánh không cùng cơ sở
**Và** không tự tính mức cải thiện cho tới khi chọn được dữ liệu cùng phiên bản định nghĩa.

**Cho trước** Giám đốc xem kết quả trước/sau
**Khi** mở chi tiết một kỳ
**Thì** có thể truy tới danh sách ticket cấu thành tử số và mẫu số
**Và** mỗi liên kết ticket được kiểm tra quyền tại thời điểm mở
**Và** phạm vi dữ liệu khớp với Dashboard D.

**Cho trước** tỷ lệ sau thấp hơn, bằng hoặc cao hơn tỷ lệ trước
**Khi** Dashboard diễn giải kết quả
**Thì** hệ thống trình bày mức chênh lệch và cỡ mẫu bằng ngôn ngữ trung lập
**Và** không tự khẳng định SOP mới là nguyên nhân duy nhất của thay đổi
**Và** không tự tạo quyết định quản trị mới.

**Cho trước** một trong hai kỳ không có ticket Bảo hành
**Khi** hệ thống tính tỷ lệ
**Thì** giao diện hiển thị trạng thái không đủ mẫu số
**Và** không chia cho 0 hoặc hiển thị tỷ lệ gây hiểu nhầm.

**Cho trước** người dùng không có vai trò được phép xem toàn bộ phạm vi
**Khi** mở đánh giá bằng URL trực tiếp hoặc phiên cũ
**Thì** hệ thống từ chối hoặc giới hạn đúng phạm vi hiện tại
**Và** không làm lộ số lượng hay ticket ngoài quyền.

**Cho trước** đánh giá được xem bằng bàn phím, trình đọc màn hình hoặc trên màn hình hẹp
**Khi** Giám đốc đọc so sánh và truy nguồn
**Thì** số lượng, tỷ lệ, kỳ, cỡ mẫu và cảnh báo có nội dung văn bản đầy đủ
**Và** biểu đồ trước/sau có bảng dữ liệu tương đương
**Và** màu không phải tín hiệu duy nhất.

## Epic 5: Người mới có thể dựng và đóng góp cho DX-LAB

Người đóng góp mới có thể chạy profile `core`, nạp fixture, sửa một hành vi nhỏ, chạy kiểm thử và chuẩn bị pull request mà không cần tải mô hình AI; nhóm duy trì có thể phát hành, vận hành và bảo vệ dữ liệu bằng quy trình nguồn mở tái lập được.

### Story 5.1: Người mới sửa một hành vi và chạy kiểm thử liên quan

**Yêu cầu liên quan:** FR-13; NFR-3, NFR-4; AR-2, AR-14, AR-21, AR-27.

Với vai trò là **người đóng góp mới**,
tôi muốn **thay đổi một quy tắc hoặc mẫu thông báo nhỏ và kiểm chứng bằng kiểm thử**,
để **hiểu luồng phát triển DX-LAB trước khi nhận công việc lớn hơn**.

**Tiêu chí chấp nhận:**

**Cho trước** người mới đã dựng profile `core` và nạp fixture
**Khi** mở hướng dẫn “đóng góp đầu tiên”
**Thì** tài liệu chỉ ra một thay đổi mẫu có phạm vi nhỏ
**Và** nêu tệp cần sửa, hành vi mong đợi, lệnh kiểm thử và cách khôi phục dữ liệu mẫu.

**Cho trước** người mới chọn thay đổi một quy tắc miền
**Khi** sửa hành vi phân công, xác thực hoặc trạng thái trong phạm vi bài hướng dẫn
**Thì** thay đổi được đặt trong module domain/application của P
**Và** không cần sửa Node-RED, Odoo, Superset hoặc tải mô hình AI.

**Cho trước** người mới chọn thay đổi một mẫu thông báo
**Khi** sửa nội dung hoặc cách trình bày đã được phép
**Thì** ý định gửi và quy tắc gửi một lần của P không bị thay đổi
**Và** fixture/test double hiển thị được kết quả mới mà không cần SMTP thật.

**Cho trước** mã chưa được sửa hoặc bị cố ý sửa sai theo ví dụ hướng dẫn
**Khi** chạy kiểm thử hành vi liên quan
**Thì** ít nhất một kiểm thử thất bại vì kết quả nghiệp vụ không đúng
**Và** thông báo thất bại chỉ ra hành vi mong đợi, không chỉ lỗi cú pháp.

**Cho trước** thay đổi đúng đã được thực hiện
**Khi** chạy lại bộ kiểm thử được hướng dẫn
**Thì** unit test miền và integration test tối thiểu liên quan đều thành công
**Và** kiểm thử không phụ thuộc thứ tự chạy hoặc dữ liệu còn sót từ lần trước.

**Cho trước** thay đổi tác động hợp đồng API hoặc sự kiện
**Khi** chạy kiểm thử
**Thì** OpenAPI/JSON Schema và consumer compatibility test phát hiện khác biệt chưa cập nhật
**Và** thay đổi phá vỡ tương thích yêu cầu phiên bản major mới theo quy tắc kiến trúc.

**Cho trước** thay đổi tạo migration cơ sở dữ liệu
**Khi** chạy kiểm thử integration
**Thì** migration được kiểm tra trên database sạch và database ở phiên bản trước
**Và** lỗi migration làm kiểm thử thất bại trước khi tạo pull request.

**Cho trước** người mới chạy toàn bộ lệnh kiểm tra cho lát cắt `core`
**Khi** máy không có model AI, Odoo hoặc Superset
**Thì** các kiểm thử liên quan vẫn hoàn thành bằng fixture hoặc fake xác định
**Và** không tự động tải artifact AI dung lượng lớn.

**Cho trước** hướng dẫn đóng góp được thực hiện trên hệ điều hành hỗ trợ
**Khi** người mới sao chép các lệnh được tài liệu hóa
**Thì** lệnh, đường dẫn và kết quả mong đợi nhất quán
**Và** lỗi thường gặp có hướng xử lý cụ thể.

### Story 5.2: Người đóng góp chuẩn bị pull request có thể kiểm tra

**Yêu cầu liên quan:** FR-13; NFR-1, NFR-3, NFR-4, NFR-12; AR-14, AR-17, AR-21, AR-27; UX-DR-12, UX-DR-15.

Với vai trò là **người đóng góp**,
tôi muốn **chuẩn bị pull request với đầy đủ bối cảnh và bằng chứng kiểm thử**,
để **người duy trì có thể đánh giá thay đổi nhanh chóng và nhất quán**.

**Tiêu chí chấp nhận:**

**Cho trước** người đóng góp đã hoàn thành một thay đổi nhỏ
**Khi** đọc `CONTRIBUTING.md`
**Thì** tài liệu mô tả cách chọn hoặc tạo issue, tạo nhánh, chạy kiểm tra, cập nhật tài liệu/changelog và gửi pull request
**Và** liên kết tới quy tắc ứng xử, giấy phép và kênh trao đổi công khai của dự án.

**Cho trước** người đóng góp mở mẫu pull request
**Khi** điền nội dung
**Thì** mẫu yêu cầu mô tả vấn đề, giá trị người dùng, Story/yêu cầu liên quan, phạm vi thay đổi và rủi ro
**Và** có vị trí ghi lệnh kiểm thử, kết quả, ảnh hoặc bằng chứng UX khi phù hợp
**Và** có xác nhận không đưa secret hoặc dữ liệu thật của khách hàng vào thay đổi.

**Cho trước** pull request thay đổi hành vi sản phẩm
**Khi** CI chạy
**Thì** kiểm thử hành vi liên quan phải thành công
**Và** CI không chỉ kiểm tra cú pháp cấu hình
**Và** lỗi kiểm thử nêu rõ cổng chất lượng nào chưa đạt.

**Cho trước** pull request thay đổi mã P hoặc database
**Khi** CI chạy
**Thì** typecheck, unit test miền, integration test PostgreSQL và migration test liên quan được thực thi
**Và** kiểm thử phát hiện vi phạm bất biến phân công, SLA, trạng thái hoặc CSAT bị tác động.

**Cho trước** pull request thay đổi API, event hoặc integration adapter
**Khi** CI chạy
**Thì** OpenAPI/JSON Schema, contract test, idempotency và compatibility test liên quan được thực thi
**Và** thay đổi phá vỡ tương thích chưa tăng phiên bản bị từ chối.

**Cho trước** pull request thay đổi bề mặt Web hoặc widget Odoo trọng yếu
**Khi** CI và bằng chứng thủ công được đánh giá
**Thì** có kiểm tra nhãn, focus, bàn phím, tóm tắt lỗi và nội dung thay thế biểu đồ phù hợp
**Và** tác giả ghi kết quả kiểm tra 320 CSS px, zoom 200% hoặc mobile đối với phần bị ảnh hưởng.

**Cho trước** pull request thêm hoặc cập nhật dependency hay model
**Khi** CI chạy
**Thì** lockfile hoặc digest bất biến được cập nhật
**Và** tên, phiên bản, vai trò cùng giấy phép được kê khai
**Và** dependency dùng `latest`, thiếu giấy phép hoặc không tương thích bị từ chối.

**Cho trước** pull request chứa secret, token, mật khẩu mặc định, wildcard CORS hoặc dữ liệu nhận dạng khách hàng
**Khi** kiểm tra tự động hoặc review phát hiện
**Thì** pull request bị chặn
**Và** báo cáo không in lại toàn bộ giá trị nhạy cảm.

**Cho trước** mọi cổng bắt buộc đã thành công
**Khi** người duy trì mở pull request
**Thì** họ có thể truy từ thay đổi tới issue, Story/yêu cầu và bằng chứng kiểm thử
**Và** trạng thái review cùng hành động tiếp theo được trình bày rõ.

### Story 5.3: Người duy trì tạo bản phát hành nguồn mở tái lập được

**Yêu cầu liên quan:** FR-13; NFR-1, NFR-2, NFR-3, NFR-4, NFR-8, NFR-14; AR-14, AR-15, AR-18, AR-24, AR-25, AR-27; UX-DR-16, UX-DR-20.

Với vai trò là **người duy trì**,
tôi muốn **tạo một bản phát hành DX-LAB có phiên bản và đầy đủ bằng chứng nguồn mở**,
để **ban giám khảo hoặc cộng đồng có thể tải, kiểm tra và dựng lại sản phẩm**.

**Tiêu chí chấp nhận:**

**Cho trước** mã nguồn chuẩn bị phát hành
**Khi** chạy kiểm tra giấy phép
**Thì** repository có toàn văn AGPL-3.0, `LICENSE`, `NOTICE` và nhận diện SPDX/header phù hợp
**Và** mọi dependency cùng model được kê khai tên, phiên bản/digest, vai trò và giấy phép
**Và** thành phần có giấy phép không tương thích làm cổng phát hành thất bại.

**Cho trước** dependency, image, OCA addon hoặc model thuộc bản phát hành
**Khi** tạo manifest phát hành
**Thì** lockfile, image digest, OCA commit và model digest đều cố định
**Và** không có tag `latest` hoặc alias model không ghi nhận
**Và** SBOM được tạo ở định dạng mở.

**Cho trước** phiên bản SemVer đã được chọn
**Khi** tạo release artifact
**Thì** artifact có mã phiên bản, changelog, release notes, checksum và hướng dẫn xác minh
**Và** dùng định dạng đóng gói mở
**Và** không chứa secret, volume dữ liệu, PII hoặc cache riêng của máy build.

**Cho trước** người kiểm tra tải mã nguồn và artifact trên một máy sạch
**Khi** làm theo hướng dẫn build/cấu hình
**Thì** họ dựng được profile `core` và `demo` bằng công cụ nguồn mở
**Và** kết quả cài đặt chạy được ngoài thư mục mã nguồn
**Và** thay đổi hostname, cổng, SMTP hoặc secret không yêu cầu sửa mã.

**Cho trước** bản phát hành có tùy chọn AI
**Khi** người kiểm tra không muốn tải model
**Thì** `core` và các kiểm thử hành vi chính vẫn hoạt động bằng fixture/fake
**Và** manifest giải thích riêng yêu cầu phần cứng, giấy phép và cách lấy model cho profile `ai`.

**Cho trước** pipeline phát hành chạy
**Khi** một clean build, migration, contract test, hành trình UJ-1/UJ-2 hoặc kiểm tra giấy phép thất bại
**Thì** release không được công bố
**Và** báo cáo chỉ rõ artifact hoặc cổng chất lượng gây lỗi.

**Cho trước** các cổng phát hành đều đạt
**Khi** người duy trì công bố phiên bản
**Thì** mã nguồn, artifact, checksum, SBOM, changelog, hướng dẫn cài đặt và hướng dẫn đóng góp đều truy cập công khai
**Và** phiên bản được gắn tag bất biến
**Và** tài liệu liên kết đúng tới issue tracker và quy trình pull request.

**Cho trước** bản phát hành được dùng cho demo
**Khi** người duy trì chuẩn bị kịch bản
**Thì** tài khoản và fixture demo được nạp bằng cơ chế tường minh, idempotent
**Và** runbook chuẩn bị các tab hoặc phiên đăng nhập tách biệt cho khách, Nhân viên, Giám đốc và Người duyệt tri thức mà không thêm bộ chuyển vai giả vào sản phẩm
**Và** cấu hình phần cứng tối thiểu, phương án không AI và các giới hạn ngoài phạm vi được ghi rõ
**Và** không cần chỉnh mã nguồn để chuyển từ môi trường kiểm thử sang demo.

### Story 5.4: Người vận hành sao lưu và kiểm tra khả năng khôi phục

**Yêu cầu liên quan:** NFR-7, NFR-10, NFR-11, NFR-14; AR-12, AR-13, AR-24.

Với vai trò là **người vận hành hệ thống**,
tôi muốn **tạo bản sao lưu mã hóa và kiểm tra khôi phục định kỳ**,
để **các trạng thái nghiệp vụ không thể tái tạo không bị mất khi có sự cố**.

**Tiêu chí chấp nhận:**

**Cho trước** hệ thống đến 00:30 theo `Asia/Ho_Chi_Minh`
**Khi** lịch sao lưu hằng ngày kích hoạt
**Thì** hệ thống tạo logical dump cho database P, Odoo, Keycloak và metadata Superset
**Và** sao chép tệp đính kèm, Odoo filestore cùng kho tri thức đã công bố
**Và** mỗi thành phần có trạng thái hoàn thành riêng.

**Cho trước** các thành phần sao lưu đã được thu thập
**Khi** tạo archive
**Thì** archive được mã hóa bằng khóa gắn từ vị trí tách biệt
**Và** chuyển tới destination URI được cấu hình ngoài máy chạy demo
**Và** ghi checksum, object/version ID, kích thước, thời gian và kết quả.

**Cho trước** bản sao lưu chứa database hoặc tệp nhạy cảm
**Khi** tiến trình ghi log
**Thì** log không chứa nội dung khách hàng, token, prompt, tệp hoặc khóa mã hóa
**Và** chỉ người có vai trò vận hành được phép xem metadata và thực hiện khôi phục.

**Cho trước** nhiều bản sao lưu đã tồn tại
**Khi** tác vụ retention chạy
**Thì** giữ 7 bản ngày, 4 bản tuần và 12 bản tháng
**Và** chỉ xóa bản vượt chính sách sau khi xác nhận bản giữ lại có checksum hợp lệ
**Và** thao tác xóa được audit.

**Cho trước** Qdrant, model và cache AI có thể tái tạo
**Khi** lập phạm vi backup
**Thì** hệ thống không coi chúng là nguồn dữ liệu duy nhất
**Và** Qdrant được dựng lại từ SOP đã công bố cùng embedding manifest
**Và** model/cache được lấy lại từ manifest có ID và digest cố định.

**Cho trước** một bản sao lưu hằng ngày thất bại, thiếu thành phần hoặc sai checksum
**Khi** hệ thống kết thúc tác vụ
**Thì** toàn bộ lần chạy được đánh dấu không hoàn chỉnh
**Và** tạo cảnh báo hoặc việc vận hành trong cùng ngày
**Và** không xóa bản hợp lệ cũ theo giả định bản mới đã thành công.

**Cho trước** tới lịch kiểm tra khôi phục hằng tháng
**Khi** người vận hành chọn một bản sao hợp lệ
**Thì** dữ liệu được khôi phục vào môi trường cô lập, không ghi đè dev, test hoặc demo đang chạy
**Và** secret cùng hostname của môi trường kiểm tra khác môi trường nguồn.

**Cho trước** quá trình khôi phục hoàn tất
**Khi** chạy bộ xác minh
**Thì** hệ thống kiểm tra database mở được, migration đúng phiên bản, số lượng bản ghi kiểm soát, checksum tệp mẫu, SOP hiện hành và khả năng đăng nhập thử nghiệm
**Và** Qdrant có thể được dựng lại từ nguồn công bố
**Và** smoke test đọc ticket/tệp mẫu theo đúng quyền thành công.

**Cho trước** kiểm tra khôi phục thành công hoặc thất bại
**Khi** đóng lần kiểm tra
**Thì** lưu bằng chứng gồm backup ID, thời gian bắt đầu/kết thúc, phiên bản hệ thống, danh sách kiểm tra và kết quả
**Và** thất bại tạo việc khắc phục có người phụ trách
**Và** dữ liệu kiểm tra được dọn theo runbook sau khi bằng chứng đã lưu.
