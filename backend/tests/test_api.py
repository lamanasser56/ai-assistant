from __future__ import annotations

import httpx
import pytest
import pytest_asyncio

from backend.app.main import app


class FakeClients:
    async def health(self, service, path):
        return {"status": "ok"}, 1.0

    async def request(self, service, method, path, **kwargs):
        if service == "vllm":
            assert path == "/v1/chat/completions"
            assert kwargs["json"]["model"] == "assistant"
            assert kwargs["json"]["messages"] == [
                {"role": "user", "content": "hi"}
            ]
            return {"choices": [{"message": {"content": "hello"}}]}, 2.0
        return {"text": "transcript", "service": service}, 3.0


@pytest_asyncio.fixture
async def client():
    app.state.clients = FakeClients()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
        yield http


@pytest.mark.asyncio
async def test_live_has_request_id(client):
    response = await client.get("/health/live")
    assert response.status_code == 200
    assert response.headers["x-request-id"]


@pytest.mark.asyncio
async def test_chat_forces_assistant_model(client):
    response = await client.post("/api/v1/chat", json={"message": "hi"})
    assert response.status_code == 200
    assert response.json()["choices"][0]["message"]["content"] == "hello"


@pytest.mark.asyncio
async def test_transcribe_proxies_audio(client):
    response = await client.post("/api/v1/transcribe", files={"file": ("a.wav", b"audio", "audio/wav")})
    assert response.status_code == 200
    assert response.json()["text"] == "transcript"


@pytest.mark.asyncio
async def test_transcribe_rejects_non_audio(client):
    response = await client.post("/api/v1/transcribe", files={"file": ("a.txt", b"text", "text/plain")})
    assert response.status_code == 415


@pytest.mark.asyncio
async def test_ocr_proxies_upload(client):
    response = await client.post("/api/v1/ocr", files={"file": ("a.png", b"image", "image/png")})
    assert response.status_code == 200
    assert response.json()["service"] == "ocr"


@pytest.mark.asyncio
async def test_services_health(client):
    response = await client.get("/api/v1/services/health")
    assert response.status_code == 200
    assert set(response.json()["services"]) == {"vllm", "whisper", "ocr"}
