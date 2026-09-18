#!/usr/bin/env bash
# ==============================================================================
# DX-LAB (DX-OS) - Open Source Release Packaging Script
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
#
# Tạo gói phát hành theo tiêu chuẩn OLP PMNM 2026:
# - Sử dụng định dạng mở: .tar.gz (Tuyệt đối không dùng zip, rar, arj)
# - Đặt tên gói theo phiên bản ngữ nghĩa (Semantic Versioning)
# - Tạo tệp băm SHA256 để kiểm tra tính toàn vẹn
# ==============================================================================

set -e

VERSION=$(cat VERSION | tr -d '[:space:]')
RELEASE_NAME="dx-lab-${VERSION}"
DIST_DIR="dist"
ARCHIVE_FILE="${DIST_DIR}/${RELEASE_NAME}.tar.gz"

echo "=== [DX-LAB] Tạo gói phát hành nguồn mở: ${RELEASE_NAME} ==="

mkdir -p "${DIST_DIR}"

# Đóng gói mã nguồn sạch (loại trừ các tệp git, env cục bộ, dữ liệu tạm)
tar --exclude='.git' \
    --exclude='.env' \
    --exclude='dist' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='node_modules' \
    --exclude='.venv' \
    --exclude='.agent' \
    --exclude='.agents' \
    --exclude='_bmad' \
    --exclude='_bmad-output' \
    -czvf "${ARCHIVE_FILE}" \
    .

echo "[INFO] Tạo mã băm toàn vẹn SHA256..."
if command -v sha256sum &> /dev/null; then
    sha256sum "${ARCHIVE_FILE}" > "${ARCHIVE_FILE}.sha256"
elif command -v shasum &> /dev/null; then
    shasum -a 256 "${ARCHIVE_FILE}" > "${ARCHIVE_FILE}.sha256"
fi

echo "=== [DX-LAB] Bản phát hành mở đã được tạo tại: ${ARCHIVE_FILE} ==="
ls -lh "${DIST_DIR}"
