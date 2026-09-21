# Bảng Kê Khai Phụ Thuộc & Giấy Phép Bên Thứ Ba (Dependencies & Bundling Notice)

Dự án **DX-LAB (DX-OS)** tuân thủ nghiêm ngặt nguyên tắc **không nhúng (bundle) trực tiếp mã nguồn của các thư viện bên thứ ba** vào kho mã nguồn chính. Thay vào đó, toàn bộ thư viện, package và dịch vụ thượng nguồn (upstream) được kéo và quản lý thông qua các công cụ quản lý gói nguồn mở chính thống (`pip`/`uv`, `npm`, OCI Container Registry).

---

## 1. Các Dịch Vụ Thượng Nguồn (Upstream Services)

| Thành phần | Phiên bản khuyến nghị | Giấy phép (License) | Mục đích sử dụng | Nguồn phát hành |
| :--- | :--- | :--- | :--- | :--- |
| **Odoo Community** | 17.0+ / 18.0 | LGPL-3.0 | Tầng H: Quản trị nhân sự, vai trò, dữ liệu tri thức ERP | [github.com/odoo/odoo](https://github.com/odoo/odoo) |
| **Node-RED** | 3.1+ | Apache-2.0 | Tầng P: Điều phối luồng quy trình, tự động hóa và validation | [nodered.org](https://nodered.org/) |
| **PostgreSQL** | 16-alpine | PostgreSQL License | Tầng D: Hệ quản trị cơ sở dữ liệu quan hệ trung tâm | [postgresql.org](https://www.postgresql.org/) |
| **Apache Superset** | 4.0+ | Apache-2.0 | Tầng D: Khám phá, trực quan hóa và dashboard phân tích dữ liệu | [superset.apache.org](https://superset.apache.org/) |
| **Qdrant** | v1.11+ | Apache-2.0 | Tầng I: Cơ sở dữ liệu Vector lưu trữ vector embeddings | [qdrant.tech](https://qdrant.tech/) |
| **Haystack AI** | 2.x | Apache-2.0 | Tầng I: Framework xây dựng RAG pipelines và AI agent | [haystack.deepset.ai](https://haystack.deepset.ai/) |
| **OpenRouter** | Hosted service | Proprietary service terms | Tầng I: API suy luận tương thích OpenAI qua HTTPS; không được bundle trong repository | [openrouter.ai](https://openrouter.ai/) |
| **Qwen3-8B** | `qwen/qwen3-8b` | Apache-2.0 | Model sinh được yêu cầu cố định qua OpenRouter | [Qwen/Qwen3-8B](https://huggingface.co/Qwen/Qwen3-8B) |

---

## 2. Thư Viện Python (Quản lý qua `pyproject.toml` / `requirements.txt`)

| Thư viện | Giấy phép | Vai trò trong hệ thống |
| :--- | :--- | :--- |
| `haystack-ai` | Apache-2.0 | Lõi điều phối pipeline RAG |
| `fastapi` | MIT | Cung cấp RESTful API endpoint cho Tầng I |
| `uvicorn` | BSD-3-Clause | ASGI Server hiệu năng cao chạy FastAPI |
| `pydantic` | MIT | Xác thực dữ liệu (Data validation) |
| `qdrant-client` | Apache-2.0 | Giao tiếp API với Qdrant Vector Database |
| `psycopg2-binary` | LGPL-3.0 | Kết nối cơ sở dữ liệu PostgreSQL |
| `httpx` 0.27.0 | BSD-3-Clause | HTTP client bất đồng bộ gọi OpenRouter với timeout hữu hạn |

---

## 3. Thư Viện Node.js (Quản lý qua `package.json`)

| Thư viện | Giấy phép | Vai trò trong hệ thống |
| :--- | :--- | :--- |
| `node-red` | Apache-2.0 | Môi trường lập trình trực quan dựa trên flow |
| `node-red-contrib-custom` | MIT | Mở rộng nodes xử lý cho bài toán DX-OS |

---

## 4. Tuyên Bố Về Bundling & Độc Lập Mã Nguồn

1. **Không chỉnh sửa mã nguồn bên thứ ba**: Dự án cam kết không phân phối lại bất kỳ mã nguồn bên thứ ba nào đã bị can thiệp, chỉnh sửa nội bộ.
2. **Sử dụng package chính thức**: Tất cả dependency được tải trực tiếp từ PyPI, npmjs và Docker Hub chính thức trong quá trình build image, đảm bảo tính minh bạch và cập nhật bảo mật liên tục.
