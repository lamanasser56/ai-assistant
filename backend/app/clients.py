from __future__ import annotations

import time
from typing import Any

import httpx


class UpstreamError(RuntimeError):
    def __init__(self, service: str, message: str, status_code: int = 502):
        super().__init__(message)
        self.service = service
        self.status_code = status_code


class UpstreamClients:
    def __init__(self, client: httpx.AsyncClient, vllm_url: str, whisper_url: str, ocr_url: str):
        self.client, self.urls = client, {"vllm": vllm_url, "whisper": whisper_url, "ocr": ocr_url}

    async def request(self, service: str, method: str, path: str, **kwargs: Any) -> tuple[dict[str, Any], float]:
        started = time.perf_counter()
        try:
            response = await self.client.request(method, self.urls[service] + path, **kwargs)
            elapsed = round((time.perf_counter() - started) * 1000, 2)
            response.raise_for_status()
            return response.json(), elapsed
        except httpx.TimeoutException as exc:
            raise UpstreamError(service, f"{service} upstream timeout", 504) from exc
        except httpx.HTTPStatusError as exc:
            raise UpstreamError(service, f"{service} upstream returned {exc.response.status_code}", 502) from exc
        except httpx.HTTPError as exc:
            raise UpstreamError(service, f"{service} upstream unavailable", 502) from exc

    async def health(self, service: str, path: str) -> tuple[dict[str, Any], float]:
        return await self.request(service, "GET", path)
