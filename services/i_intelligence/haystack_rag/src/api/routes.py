# -*- coding: utf-8 -*-
# ==============================================================================
# DX-LAB (DX-OS) - Intelligence Layer API Routes
# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0
# ==============================================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from src.pipelines.rag_pipeline import DxLabRAGPipeline

router = APIRouter()
pipeline = DxLabRAGPipeline()

class AskRequest(BaseModel):
    query: str = Field(..., description="Câu hỏi của nhân viên hoặc hệ thống")
    user_id: Optional[str] = Field(None, description="Mã định danh người dùng từ Tầng H")
    top_k: Optional[int] = Field(3, description="Số lượng tài liệu ngữ cảnh cần trích xuất")

class DocumentSource(BaseModel):
    content: str
    score: float

class AskResponse(BaseModel):
    query: str
    answer: str
    retrieved_documents: List[DocumentSource]

@router.post("/ai/ask", response_model=AskResponse, tags=["RAG"])
async def ask_intelligence(request: AskRequest):
    """
    Điểm cuối (Endpoint) nhận câu hỏi từ Tầng H/P, kích hoạt truy vấn RAG
    và trả về câu trả lời tổng hợp từ Local LLM (Ollama).
    """
    try:
        result = pipeline.run_query(request.query, top_k=request.top_k or 3)
        return AskResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
