#!/usr/bin/env python3
"""Measure Whisper transcription latency for a local/forwarded endpoint."""
from __future__ import annotations
import argparse, json, os, time, urllib.request

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio")
    parser.add_argument("--max-seconds", type=float, default=30.0)
    args = parser.parse_args()
    base_url = os.getenv("WHISPER_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    boundary = "----CodexWhisperBoundary"
    with open(args.audio, "rb") as audio:
        payload = audio.read()
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{os.path.basename(args.audio)}\"\r\nContent-Type: application/octet-stream\r\n\r\n").encode() + payload + f"\r\n--{boundary}--\r\n".encode()
    request = urllib.request.Request(f"{base_url}/v1/audio/transcriptions", data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}, method="POST")
    started = time.perf_counter()
    with urllib.request.urlopen(request, timeout=args.max_seconds + 30) as response:
        result = json.load(response)
    elapsed = time.perf_counter() - started
    if not result.get("text", "").strip():
        raise SystemExit("FAIL: transcript is empty")
    status = "PASS" if elapsed < args.max_seconds else "FAIL"
    print(f"{status}: processing_seconds={elapsed:.3f} limit_seconds={args.max_seconds:g}")
    return 0 if status == "PASS" else 1

if __name__ == "__main__":
    raise SystemExit(main())
