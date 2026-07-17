#!/usr/bin/env python3
"""Send concurrent OpenAI-compatible chat requests using the standard library."""

from __future__ import annotations

import concurrent.futures
import json
import os
import time
import urllib.error
import urllib.request


BASE_URL = os.getenv("VLLM_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
CONCURRENCY = int(os.getenv("VLLM_CONCURRENCY", "5"))
TIMEOUT_SECONDS = float(os.getenv("VLLM_TIMEOUT_SECONDS", "180"))


def send_request(index: int) -> tuple[int, float, str]:
    body = json.dumps(
        {
            "model": "assistant",
            "messages": [
                {
                    "role": "user",
                    "content": f"In one short sentence, identify request {index}.",
                }
            ],
            "temperature": 0,
            "max_tokens": 32,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        f"{BASE_URL}/v1/chat/completions",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    started = time.monotonic()
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        payload = json.load(response)
    elapsed = time.monotonic() - started
    content = payload["choices"][0]["message"]["content"].strip()
    if not content:
        raise ValueError(f"request {index} returned empty assistant content")
    return index, elapsed, content


def main() -> None:
    if CONCURRENCY < 1:
        raise SystemExit("VLLM_CONCURRENCY must be at least 1")

    started = time.monotonic()
    failures: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        futures = [pool.submit(send_request, index) for index in range(CONCURRENCY)]
        for future in concurrent.futures.as_completed(futures):
            try:
                index, elapsed, content = future.result()
                print(f"PASS request={index} elapsed={elapsed:.2f}s response={content!r}")
            except (urllib.error.URLError, KeyError, ValueError, TimeoutError) as error:
                failures.append(str(error))
                print(f"FAIL {error}")

    total = time.monotonic() - started
    print(f"Completed {CONCURRENCY} requests in {total:.2f}s")
    if failures:
        raise SystemExit(f"{len(failures)} of {CONCURRENCY} requests failed")


if __name__ == "__main__":
    main()

