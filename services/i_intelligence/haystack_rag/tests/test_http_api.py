# Copyright (C) 2026 DX-LAB Development Team
# License: AGPL-3.0

import importlib
import sys
from pathlib import Path

from fastapi.testclient import TestClient
import pytest

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from src.pipelines.rag_pipeline import PipelineError, ProviderReadiness


def load_modules(monkeypatch, origins=""):
    monkeypatch.setenv("I_ALLOWED_ORIGINS", origins)
    import src.api.routes as routes
    import src.main as main

    routes = importlib.reload(routes)
    main = importlib.reload(main)
    return routes, main


class SuccessPipeline:
    provider = "fixture"

    async def run_query(self, query, top_k=3):
        return {
            "query": query,
            "answer": "fixture answer",
            "retrieved_documents": [{"content": "published source", "score": 0.95}],
        }

    def readiness(self):
        return ProviderReadiness(True)


class ErrorPipeline(SuccessPipeline):
    async def run_query(self, query, top_k=3):
        raise PipelineError("ai_provider_unavailable", 502)


class UnreadyPipeline(SuccessPipeline):
    provider = "openrouter"

    def readiness(self):
        return ProviderReadiness(False, "openrouter_api_key_missing")


def test_http_success_preserves_response_schema(monkeypatch):
    routes, main = load_modules(monkeypatch)
    routes.pipeline = SuccessPipeline()
    response = TestClient(main.app).post("/api/v1/ai/ask", json={"query": "question", "top_k": 1})
    assert response.status_code == 200
    assert response.json() == {
        "query": "question",
        "answer": "fixture answer",
        "retrieved_documents": [{"content": "published source", "score": 0.95}],
    }


def test_http_provider_error_is_sanitized(monkeypatch):
    routes, main = load_modules(monkeypatch)
    routes.pipeline = ErrorPipeline()
    response = TestClient(main.app).post("/api/v1/ai/ask", json={"query": "question"})
    assert response.status_code == 502
    assert response.json() == {"detail": "ai_provider_unavailable"}


@pytest.mark.parametrize(
    ("pipeline", "status", "body"),
    [
        (SuccessPipeline(), 200, {"status": "ready", "provider": "fixture"}),
        (UnreadyPipeline(), 503, {"detail": "openrouter_api_key_missing"}),
    ],
)
def test_ready_reports_local_configuration(monkeypatch, pipeline, status, body):
    _, main = load_modules(monkeypatch)
    main.pipeline = pipeline
    response = TestClient(main.app).get("/ready")
    assert response.status_code == status
    assert response.json() == body


def test_cors_allows_only_configured_origin_and_headers(monkeypatch):
    _, main = load_modules(monkeypatch, "https://portal.example")
    client = TestClient(main.app)
    allowed = client.options(
        "/api/v1/ai/ask",
        headers={
            "Origin": "https://portal.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    denied = client.options(
        "/api/v1/ai/ask",
        headers={
            "Origin": "https://attacker.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    idempotency = client.options(
        "/api/v1/ai/ask",
        headers={
            "Origin": "https://portal.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "idempotency-key",
        },
    )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "https://portal.example"
    assert denied.status_code == 400
    assert "access-control-allow-origin" not in denied.headers
    assert idempotency.status_code == 400


def test_cors_wildcard_is_rejected_at_initialization(monkeypatch):
    monkeypatch.setenv("I_ALLOWED_ORIGINS", "*")
    with pytest.raises(RuntimeError, match="cors_wildcard_not_allowed"):
        if "src.main" in sys.modules:
            importlib.reload(sys.modules["src.main"])
        else:
            importlib.import_module("src.main")
