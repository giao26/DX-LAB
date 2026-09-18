# ==============================================================================
# DX-LAB (DX-OS) - Odoo CE Custom Containerfile
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

FROM odoo:17.0

USER root

# Cài đặt các gói phụ trợ nếu cần
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    python3-requests \
    && rm -rf /var/lib/apt/lists/*

USER odoo

EXPOSE 8069 8072
