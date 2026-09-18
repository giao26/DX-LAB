# ==============================================================================
# DX-LAB (DX-OS) - Apache Superset Containerfile
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

FROM apache/superset:3.1.3

USER root

# Cài đặt driver kết nối PostgreSQL
RUN pip install --no-cache-dir psycopg2-binary

USER superset

ENV SUPERSET_CONFIG_PATH=/app/pythonpath/superset_config.py

EXPOSE 8088
