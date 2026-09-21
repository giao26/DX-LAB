# -*- coding: utf-8 -*-
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.pipelines.rag_pipeline import DxLabRAGPipeline, PipelineError

router = APIRouter()
pipeline = DxLabRAGPipeline()


class AskRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4_000, description="Câu hỏi đã giảm thiểu dữ liệu")
    user_id: Optional[str] = Field(None, description="Mã định danh nội bộ; không chuyển tới provider")
    top_k: int = Field(3, ge=1, le=10)


class DocumentSource(BaseModel):
    content: str
    score: float


class AskResponse(BaseModel):
    query: str
    answer: str
    retrieved_documents: list[DocumentSource]


@router.post("/ai/ask", response_model=AskResponse, tags=["RAG"])
async def ask_intelligence(request: AskRequest):
    """Generate an advisory answer while preserving the existing response schema."""
    try:
        return AskResponse(**await pipeline.run_query(request.query, top_k=request.top_k))
    except PipelineError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.code) from None
    except Exception:
        raise HTTPException(status_code=500, detail="ai_service_internal_error") from None
