# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0

import asyncio
import json
import sys
from pathlib import Path

import httpx
import pytest

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from src.pipelines.rag_pipeline import (
    MAX_OUTPUT_TOKENS,
    DxLabRAGPipeline,
    OPENROUTER_MODEL,
    PipelineError,
)


def run(coro):
    return asyncio.run(coro)


def configure_openrouter(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openrouter")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-never-sent-to-logs")
    monkeypatch.setenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    monkeypatch.setenv("OPENROUTER_TIMEOUT_SECONDS", "5")


def test_fixture_is_deterministic_and_offline(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "fixture")

    async def forbid_network(_request):
        raise AssertionError("fixture attempted a network call")

    pipeline = DxLabRAGPipeline(httpx.MockTransport(forbid_network))
    first = run(pipeline.run_query("Quy trình nào?"))
    second = run(pipeline.run_query("Quy trình nào?"))
    assert first == second
    assert first["retrieved_documents"]


def test_openrouter_success_uses_fixed_private_payload(monkeypatch):
    configure_openrouter(monkeypatch)
    captured = {}

    async def handler(request):
        captured["request"] = request
        captured["payload"] = json.loads(request.content)
        return httpx.Response(
            200,
            headers={"x-request-id": "req-123"},
            json={"id": "generation-1", "model": OPENROUTER_MODEL, "choices": [{"message": {"content": "Câu trả lời"}}]},
        )

    pipeline = DxLabRAGPipeline(httpx.MockTransport(handler))
    result = run(pipeline.run_query("Liên hệ a@example.com hoặc 0901234567"))

    assert result["answer"] == "Câu trả lời"
    assert captured["request"].url.path.endswith("/api/v1/chat/completions")
    assert captured["payload"]["model"] == "qwen/qwen3-8b"
    assert captured["payload"]["max_tokens"] == MAX_OUTPUT_TOKENS
    assert captured["payload"]["provider"] == {
        "data_collection": "deny",
        "zdr": True,
        "require_parameters": True,
    }
    serialized = json.dumps(captured["payload"])
    assert "a@example.com" not in serialized
    assert "0901234567" not in serialized
    assert "BEGIN UNTRUSTED QUESTION" in captured["payload"]["messages"][1]["content"]
    assert "BEGIN TRUSTED SOURCES" in captured["payload"]["messages"][1]["content"]
    assert "không đủ bằng chứng" in captured["payload"]["messages"][0]["content"]
    assert pipeline.last_request_metadata == {
        "requested_model": OPENROUTER_MODEL,
        "actual_model": OPENROUTER_MODEL,
        "request_id": "req-123",
        "prompt_version": "rag-answer-v1",
        "retrieval_version": "fixture-retrieval-v1",
        "sources": ["published-knowledge-fixture-v1"],
    }


def test_missing_key_fails_closed_without_network(monkeypatch):
    configure_openrouter(monkeypatch)
    monkeypatch.delenv("OPENROUTER_API_KEY")

    async def forbid_network(_request):
        raise AssertionError("missing key attempted a network call")

    pipeline = DxLabRAGPipeline(httpx.MockTransport(forbid_network))
    assert pipeline.readiness().reason == "openrouter_api_key_missing"
    with pytest.raises(PipelineError, match="openrouter_api_key_missing"):
        run(pipeline.run_query("test"))


@pytest.mark.parametrize(
    ("status", "code"),
    [(401, "ai_provider_authentication_failed"), (403, "ai_provider_authentication_failed"),
     (429, "ai_provider_rate_limited"), (500, "ai_provider_unavailable"), (503, "ai_provider_unavailable")],
)
def test_provider_errors_are_stable_and_sanitized(monkeypatch, status, code):
    configure_openrouter(monkeypatch)

    async def handler(_request):
        return httpx.Response(status, text="upstream secret diagnostic")

    pipeline = DxLabRAGPipeline(httpx.MockTransport(handler))
    with pytest.raises(PipelineError) as error:
        run(pipeline.run_query("safe query"))
    assert error.value.code == code
    assert "diagnostic" not in str(error.value)


def test_timeout_is_sanitized(monkeypatch):
    configure_openrouter(monkeypatch)

    async def handler(request):
        raise httpx.ReadTimeout("contains provider internals", request=request)

    pipeline = DxLabRAGPipeline(httpx.MockTransport(handler))
    with pytest.raises(PipelineError) as error:
        run(pipeline.run_query("safe query"))
    assert error.value.code == "ai_provider_timeout"
    assert "internals" not in str(error.value)


def test_invalid_provider_response_is_sanitized(monkeypatch):
    configure_openrouter(monkeypatch)

    async def handler(_request):
        return httpx.Response(200, json={"id": "generation-without-choices"})

    pipeline = DxLabRAGPipeline(httpx.MockTransport(handler))
    with pytest.raises(PipelineError) as error:
        run(pipeline.run_query("safe query"))
    assert error.value.code == "ai_provider_invalid_response"
    assert str(error.value) == "ai_provider_invalid_response"


def test_non_https_endpoint_is_rejected_before_network(monkeypatch):
    configure_openrouter(monkeypatch)
    monkeypatch.setenv("OPENROUTER_BASE_URL", "http://example.invalid/v1")
    pipeline = DxLabRAGPipeline()
    assert pipeline.readiness().reason == "openrouter_endpoint_invalid"


def test_default_provider_is_openrouter_and_requires_key(monkeypatch):
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    pipeline = DxLabRAGPipeline()
    assert pipeline.provider == "openrouter"
    assert pipeline.readiness().reason == "openrouter_api_key_missing"


@pytest.mark.parametrize("timeout", ["nan", "inf", "-inf", "0", "121", "invalid"])
def test_invalid_timeout_is_not_ready(monkeypatch, timeout):
    configure_openrouter(monkeypatch)
    monkeypatch.setenv("OPENROUTER_TIMEOUT_SECONDS", timeout)
    assert DxLabRAGPipeline().readiness().reason == "openrouter_timeout_invalid"


@pytest.mark.parametrize(
    "endpoint",
    [
        "https://example.invalid/api/v1",
        "https://user:pass@openrouter.ai/api/v1",
        "https://openrouter.ai:443/api/v1",
        "https://openrouter.ai/v1",
        "https://openrouter.ai/api/v1?unsafe=true",
    ],
)
def test_noncanonical_openrouter_endpoint_is_rejected(monkeypatch, endpoint):
    configure_openrouter(monkeypatch)
    monkeypatch.setenv("OPENROUTER_BASE_URL", endpoint)
    assert DxLabRAGPipeline().readiness().reason == "openrouter_endpoint_invalid"


@pytest.mark.parametrize(
    "response",
    [
        {"id": "req-1", "choices": [{"message": {"content": "answer"}}]},
        {"id": "req-1", "model": "other/model", "choices": [{"message": {"content": "answer"}}]},
        {"model": OPENROUTER_MODEL, "choices": [{"message": {"content": "answer"}}]},
        {"id": "", "model": OPENROUTER_MODEL, "choices": [{"message": {"content": "answer"}}]},
    ],
)
def test_model_and_request_id_are_required(monkeypatch, response):
    configure_openrouter(monkeypatch)

    async def handler(_request):
        return httpx.Response(200, json=response)

    with pytest.raises(PipelineError, match="ai_provider_invalid_response"):
        run(DxLabRAGPipeline(httpx.MockTransport(handler)).run_query("safe query"))


def test_pii_is_redacted_before_length_limit(monkeypatch):
    configure_openrouter(monkeypatch)
    captured = {}

    async def handler(request):
        captured["payload"] = json.loads(request.content)
        return httpx.Response(
            200,
            headers={"x-request-id": "req-1"},
            json={"model": OPENROUTER_MODEL, "choices": [{"message": {"content": "answer"}}]},
        )

    query = ("x" * 3995) + "secret@example.com"
    run(DxLabRAGPipeline(httpx.MockTransport(handler)).run_query(query))
    sent = captured["payload"]["messages"][1]["content"]
    assert "secret@example.com" not in sent
    assert "secret" not in sent
