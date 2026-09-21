# -*- coding: utf-8 -*-
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import pipeline, router as api_router

app = FastAPI(
    title="DX-LAB Intelligence & RAG API",
    description="Dịch vụ tư vấn AI dùng Qdrant và OpenRouter qua adapter nội bộ.",
    version="0.2.0",
)

allowed_origins = [item.strip() for item in os.environ.get("I_ALLOWED_ORIGINS", "").split(",") if item.strip()]
if "*" in allowed_origins:
    raise RuntimeError("cors_wildcard_not_allowed")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=bool(allowed_origins),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    """Liveness only; never performs paid or external provider calls."""
    return {"status": "healthy", "service": "dxlab-haystack-rag", "version": "0.2.0"}


@app.get("/ready", tags=["Health"])
async def readiness_check():
    """Validate local provider configuration without sending an inference request."""
    readiness = pipeline.readiness()
    if not readiness.ready:
        raise HTTPException(status_code=503, detail=readiness.reason)
    return {"status": "ready", "provider": pipeline.provider}


app.include_router(api_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
