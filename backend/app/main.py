from __future__ import annotations

import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .clients import UpstreamClients, UpstreamError
from .config import settings
from .middleware import RequestIdMiddleware, configure_json_logging
from .models import ChatRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    timeout = httpx.Timeout(settings.request_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout) as client:
        app.state.clients = UpstreamClients(client, settings.vllm_url, settings.whisper_url, settings.ocr_url)
        yield


app = FastAPI(title="AI Platform Backend", version="1.0.0", lifespan=lifespan)
configure_json_logging()
app.add_middleware(RequestIdMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=list(settings.cors_origins), allow_credentials=False, allow_methods=["*"], allow_headers=["*"])


def clients(request: Request) -> UpstreamClients:
    return request.app.state.clients


def upstream_http_error(exc: UpstreamError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=str(exc))


@app.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
async def ready(request: Request) -> dict[str, str]:
    if not hasattr(request.app.state, "clients"):
        raise HTTPException(status_code=503, detail="upstream client is not initialized")
    return {"status": "ready"}


@app.get("/api/v1/services/health")
async def services_health(request: Request) -> dict[str, object]:
    checks = {}
    for service, path in (("vllm", "/health"), ("whisper", "/health/live"), ("ocr", "/health/live")):
        try:
            _, elapsed = await clients(request).health(service, path)
            checks[service] = {"status": "ok", "upstream_processing_ms": elapsed}
        except UpstreamError as exc:
            checks[service] = {"status": "error", "detail": str(exc)}
    return {"services": checks}


@app.post("/api/v1/chat")
async def chat(payload: ChatRequest, request: Request) -> dict:
    started = time.perf_counter()
    body = {
        "model": "assistant",
        "messages": [
            {
                "role": "user",
                "content": payload.message,
            }
        ],
    }

    if payload.max_tokens is not None:
        body["max_tokens"] = payload.max_tokens

    if payload.temperature is not None:
        body["temperature"] = payload.temperature
    try:
        result, elapsed = await clients(request).request("vllm", "POST", "/v1/chat/completions", json=body)
    except UpstreamError as exc:
        raise upstream_http_error(exc) from exc
    result["backend_processing_ms"] = round((time.perf_counter() - started) * 1000, 2)
    result["upstream_processing_ms"] = elapsed
    result["request_id"] = request.state.request_id
    return result


async def upload_proxy(request: Request, upload: UploadFile, service: str, path: str) -> dict:
    content_type = upload.content_type or ""
    if service == "whisper" and not content_type.startswith("audio/"):
        raise HTTPException(status_code=415, detail="audio content type is required")
    if service == "ocr" and not (
        content_type.startswith("image/") or content_type == "application/pdf"
    ):
        raise HTTPException(
            status_code=415,
            detail="image or PDF content type is required",
        )
    data = await upload.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="upload exceeds configured size limit")
    started = time.perf_counter()
    try:
        result, upstream_ms = await clients(request).request(service, "POST", path, files={"file": (upload.filename or "upload", data, content_type)})
    except UpstreamError as exc:
        raise upstream_http_error(exc) from exc
    result["backend_processing_ms"] = round((time.perf_counter() - started) * 1000, 2)
    result["upstream_processing_ms"] = upstream_ms
    result["request_id"] = request.state.request_id
    return result


@app.post("/api/v1/transcribe")
async def transcribe(request: Request, file: UploadFile = File(...)) -> dict:
    return await upload_proxy(request, file, "whisper", "/v1/audio/transcriptions")


@app.post("/api/v1/ocr")
async def ocr(request: Request, file: UploadFile = File(...)) -> dict:
    return await upload_proxy(request, file, "ocr", "/v1/ocr")
