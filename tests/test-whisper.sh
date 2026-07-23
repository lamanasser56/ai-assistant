#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${WHISPER_BASE_URL:-http://127.0.0.1:8000}"
curl --fail-with-body --silent --show-error "${BASE_URL%/}/health/live"
printf '\n'
curl --fail-with-body --silent --show-error "${BASE_URL%/}/health/ready"
printf '\n'
