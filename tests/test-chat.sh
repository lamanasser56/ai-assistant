#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${VLLM_BASE_URL:-http://127.0.0.1:8000}"

response="$({
  curl --fail-with-body --silent --show-error \
    --connect-timeout 10 \
    --max-time 120 \
    --header 'Content-Type: application/json' \
    --request POST \
    --data '{
      "model": "assistant",
      "messages": [
        {"role": "user", "content": "Reply with exactly: vLLM is ready"}
      ],
      "temperature": 0,
      "max_tokens": 16
    }' \
    "${BASE_URL%/}/v1/chat/completions"
})"

python3 -c '
import json
import sys

payload = json.load(sys.stdin)
choices = payload.get("choices", [])
if not choices or not choices[0].get("message", {}).get("content"):
    raise SystemExit("FAIL: response did not contain assistant content")
print("PASS:", choices[0]["message"]["content"].strip())
' <<<"$response"

