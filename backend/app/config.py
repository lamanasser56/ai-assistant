from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    vllm_url: str = os.getenv("VLLM_URL", "http://assistant-api:8000").rstrip("/")
    whisper_url: str = os.getenv("WHISPER_URL", "http://whisper-api:8000").rstrip("/")
    ocr_url: str = os.getenv("OCR_URL", "http://ocr-api:8000").rstrip("/")
    request_timeout_seconds: float = float(os.getenv("BACKEND_REQUEST_TIMEOUT_SECONDS", "60"))
    max_upload_bytes: int = int(os.getenv("BACKEND_MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))
    cors_origins: tuple[str, ...] = tuple(filter(None, os.getenv("BACKEND_CORS_ORIGINS", "").split(",")))


settings = Settings()
