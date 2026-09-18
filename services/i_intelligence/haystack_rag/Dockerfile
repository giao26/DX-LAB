# ==============================================================================
# DX-LAB (DX-OS) - Haystack RAG Service Containerfile
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ /app/src/

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
