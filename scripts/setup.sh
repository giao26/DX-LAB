#!/usr/bin/env bash
# ==============================================================================
# DX-LAB (DX-OS) - Environment Setup Script
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

set -e

echo "=== [DX-LAB] Khởi tạo môi trường phát triển ==="

# 1. Kiểm tra file .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "[INFO] Tạo file .env từ .env.example..."
        cp .env.example .env
        echo "[OK] Đã tạo file .env thành công."
    else
        echo "[ERROR] Không tìm thấy file .env.example!"
        exit 1
    fi
else
    echo "[INFO] File .env đã tồn tại."
fi

# 2. Tạo các thư mục dữ liệu cục bộ cần thiết nếu chưa có
echo "[INFO] Khởi tạo các thư mục lưu trữ dữ liệu..."
mkdir -p services/d_data/postgres/init
mkdir -p services/p_automation/data
mkdir -p services/h_human/addons
mkdir -p services/i_intelligence/qdrant/config
mkdir -p dist

# 3. Phân quyền thực thi cho các script
chmod +x scripts/*.sh 2>/dev/null || true

echo "=== [DX-LAB] Hoàn tất thiết lập môi trường sẵn sàng! ==="
