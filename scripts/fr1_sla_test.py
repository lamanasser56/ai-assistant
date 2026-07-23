#!/usr/bin/env python3
"""FR1 SLA test: single-user and five-concurrent sessions."""

import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

import requests


URL = "http://127.0.0.1:8000/v1/chat/completions"
MODEL = "assistant"

PROMPT = (
    "You are drafting an internal memo for a mid-sized enterprise. "
    "Summarize the key benefits of hosting AI models on company "
    "infrastructure instead of external cloud APIs. Cover data "
    "sovereignty, regulatory compliance, latency control, and cost "
    "predictability. Keep the tone professional and address it to "
    "department managers who are not technical experts. "
    "Write approximately three short paragraphs."
)


@dataclass
class Result:
    session_id: int
    ttft: float | None
    completion_tokens: int
    total_time: float
    generation_time: float
    tokens_per_second: float
    error: str | None = None


def run_session(session_id: int, max_tokens: int = 300) -> Result:
    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": PROMPT,
            }
        ],
        "max_tokens": max_tokens,
        "temperature": 0,
        "stream": True,
        "stream_options": {
            "include_usage": True,
        },
    }

    start = time.perf_counter()
    first_token_at = None
    completion_tokens = None

    try:
        with requests.post(
            URL,
            json=payload,
            stream=True,
            timeout=300,
        ) as response:
            response.raise_for_status()

            for raw_line in response.iter_lines():
                if not raw_line:
                    continue

                line = raw_line.decode("utf-8")

                if not line.startswith("data: "):
                    continue

                data = line[6:]

                if data == "[DONE]":
                    break

                chunk = json.loads(data)

                usage = chunk.get("usage")
                if usage:
                    completion_tokens = usage.get(
                        "completion_tokens",
                        completion_tokens,
                    )

                choices = chunk.get("choices", [])

                if not choices:
                    continue

                content = (
                    choices[0]
                    .get("delta", {})
                    .get("content", "")
                )

                if content and first_token_at is None:
                    first_token_at = time.perf_counter()

        end = time.perf_counter()

        if first_token_at is None:
            raise RuntimeError("No output token was received.")

        if completion_tokens is None:
            raise RuntimeError(
                "vLLM did not return completion token usage."
            )

        ttft = first_token_at - start
        total_time = end - start
        generation_time = end - first_token_at

        tokens_per_second = (
            completion_tokens / generation_time
            if generation_time > 0
            else 0
        )

        return Result(
            session_id=session_id,
            ttft=ttft,
            completion_tokens=completion_tokens,
            total_time=total_time,
            generation_time=generation_time,
            tokens_per_second=tokens_per_second,
        )

    except Exception as exc:
        return Result(
            session_id=session_id,
            ttft=None,
            completion_tokens=0,
            total_time=time.perf_counter() - start,
            generation_time=0,
            tokens_per_second=0,
            error=str(exc),
        )


def report(
    results: list[Result],
    ttft_sla: float | None,
    tps_sla: float,
    title: str,
) -> bool:
    print(f"\n=== {title} ===")

    print(
        f"{'Session':<9}"
        f"{'TTFT(s)':<10}"
        f"{'Tokens':<9}"
        f"{'Total(s)':<10}"
        f"{'Tok/s':<9}"
        f"{'Result'}"
    )

    all_passed = True

    for result in sorted(results, key=lambda item: item.session_id):
        ttft_pass = (
            result.ttft is not None
            and (
                ttft_sla is None
                or result.ttft <= ttft_sla
            )
        )

        throughput_pass = (
            result.tokens_per_second >= tps_sla
        )

        passed = (
            result.error is None
            and ttft_pass
            and throughput_pass
        )

        all_passed = all_passed and passed

        ttft_display = (
            f"{result.ttft:.2f}"
            if result.ttft is not None
            else "N/A"
        )

        print(
            f"{result.session_id:<9}"
            f"{ttft_display:<10}"
            f"{result.completion_tokens:<9}"
            f"{result.total_time:<10.2f}"
            f"{result.tokens_per_second:<9.2f}"
            f"{'PASS' if passed else 'FAIL'}"
        )

        if result.error:
            print(f"  Error: {result.error}")

    print(
        f"Overall: "
        f"{'ALL PASS' if all_passed else 'FAIL'}"
    )

    return all_passed


def main() -> int:
    print(f"Endpoint: {URL}")
    print(f"Model: {MODEL}")
    print(
        "Test time: "
        + time.strftime("%Y-%m-%d %H:%M:%S %Z")
    )

    single = [run_session(1)]

    single_passed = report(
        single,
        ttft_sla=3.0,
        tps_sla=10.0,
        title=(
            "Single session "
            "(TTFT <= 3s, throughput >= 10 tok/s)"
        ),
    )

    with ThreadPoolExecutor(max_workers=5) as executor:
        concurrent = list(
            executor.map(run_session, range(1, 6))
        )

    concurrent_passed = report(
        concurrent,
        # البريف يحدد صراحة حد throughput لكل جلسة.
        # نسجل TTFT أيضًا، لكن لا نجعله سبب فشل هنا.
        ttft_sla=None,
        tps_sla=5.0,
        title=(
            "Five concurrent sessions "
            "(each session >= 5 tok/s)"
        ),
    )

    return 0 if single_passed and concurrent_passed else 1


if __name__ == "__main__":
    sys.exit(main())
