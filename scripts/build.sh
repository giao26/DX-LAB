#!/usr/bin/env bash
# ==============================================================================
# DX-LAB (DX-OS) - Build Script
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

set -e

echo "=== [DX-LAB] Bắt đầu quá trình biên dịch từ mã nguồn ==="

# Kiểm tra Docker Engine
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker chưa được cài đặt. Vui lòng tham khảo BUILD.md."
    exit 1
fi

# Biên dịch các service
echo "[INFO] Biên dịch toàn bộ các dịch vụ bằng Docker Compose..."
docker compose build --parallel

echo "=== [DX-LAB] Quá trình biên dịch thành công! ==="
