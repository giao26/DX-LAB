# -*- coding: utf-8 -*-
# ==============================================================================
# DX-LAB (DX-OS) - Intelligence Layer FastAPI Entry Point
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router as api_router

app = FastAPI(
    title="DX-LAB Intelligence & RAG API",
    description="Cổng giao tiếp trí tuệ nhân tạo cục bộ (Qdrant + Haystack + Ollama) cho DX-OS",
    version="0.1.0"
)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
async def health_check():
    """Kiểm tra tình trạng hoạt động của Tầng I."""
    return {"status": "healthy", "service": "dxlab-haystack-rag", "version": "0.1.0"}

app.include_router(api_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
