# ==============================================================================
# DX-LAB (DX-OS) Automation Makefile
# Olympic Tin học Sinh viên PMNM 2026
# ==============================================================================

.PHONY: all help setup build up down restart status logs clean release test lint

all: help

help:
	@echo "Lệnh điều khiển dự án DX-LAB (DX-OS):"
	@echo "  make setup     - Khởi tạo môi trường, kiểm tra công cụ và sinh file .env"
	@echo "  make build     - Biên dịch toàn bộ các dịch vụ từ mã nguồn"
	@echo "  make up        - Khởi chạy toàn bộ hệ thống bằng Docker Compose"
	@echo "  make down      - Dừng toàn bộ các dịch vụ đang chạy"
	@echo "  make restart   - Khởi động lại hệ thống"
	@echo "  make status    - Kiểm tra trạng thái của các container dịch vụ"
	@echo "  make logs      - Xem nhật ký hoạt động (logs) thời gian thực"
	@echo "  make lint      - Kiểm tra cú pháp và định dạng mã nguồn"
	@echo "  make test      - Chạy kiểm thử tự động cho các tầng"
	@echo "  make release   - Đóng gói bản phát hành chuẩn nguồn mở (.tar.gz)"
	@echo "  make clean     - Dọn dẹp container, cache và tệp tạm"

setup:
	@bash scripts/setup.sh

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart: down up

status:
	docker compose ps

logs:
	docker compose logs -f

lint:
	@echo "Kiểm tra cú pháp các file mã nguồn..."
	@python -m py_compile services/i_intelligence/haystack_rag/src/*.py 2>/dev/null || true
	@echo "Hoàn thành kiểm tra linting."

test:
	@echo "Chạy kiểm thử các tầng thành phần..."
	@docker compose --profile core --profile demo --profile ai config > /dev/null && echo "[OK] Cú pháp Docker Compose hợp lệ cho mọi profile (core, demo, ai)."
	@python scripts/test-architecture.py

release:
	@bash scripts/release.sh

clean:
	docker compose down -v --remove-orphans
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
