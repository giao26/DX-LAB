# ==============================================================================
# DX-LAB (DX-OS) - Apache Superset Configuration
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

import os

# Cấu hình Secret Key
SECRET_KEY = os.environ.get('SUPERSET_SECRET_KEY', 'dxlab-superset-secret-key-olp-2026')

# Kết nối cơ sở dữ liệu siêu dữ liệu Superset
SQLALCHEMY_DATABASE_URI = os.environ.get(
    'SQLALCHEMY_DATABASE_URI',
    'postgresql+psycopg2://dxlab_admin:dxlab_postgres_password_2026@postgres:5432/dxlab_db'
)

# Thiết lập ngôn ngữ giao diện
BABEL_DEFAULT_LOCALE = 'en'
LANGUAGES = {
    'en': {'flag': 'us', 'name': 'English'},
    'vi': {'flag': 'vn', 'name': 'Vietnamese'},
}

# Tùy chọn bảo mật và tính năng
ROW_LIMIT = 5000
SUPERSET_WEBSERVER_PORT = 8088
WTF_CSRF_ENABLED = True
FEATURE_FLAGS = {
    "ENABLE_TEMPLATE_PROCESSING": True,
}
