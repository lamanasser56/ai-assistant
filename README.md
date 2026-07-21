# Sovereign AI Assistant Platform

A phased Kubernetes platform for self-hosted AI services. The complete platform is not production-ready; only Phase 1 runtime validation is complete.

## Implementation status

- [x] Phase 1 — AI Chat Assistant
- [ ] Phase 2 — Speech-to-Text
- [ ] Phase 3 — OCR
- [ ] Phase 4 — Backend API
- [ ] Phase 5 — Frontend Portal
- [ ] Phase 6 — Ingress, TLS, security, and monitoring integration

## Phase 1 summary

Phase 1 serves `Qwen/Qwen2.5-7B-Instruct-AWQ` with vLLM on an NVIDIA Tesla T4 through the internal `assistant-api` ClusterIP Service. Five concurrent sessions and Pod self-healing were validated manually.

See [`docs/phase-1-ai-assistant.md`](docs/phase-1-ai-assistant.md) for design, API, SLA, capacity, limitations, and evidence.

## Canonical Phase 1 manifests

~~~text
kubernetes/
├── namespace.yaml
└── assistant/
    ├── deployment.yaml
    └── service.yaml
~~~

Older YAML is retained and marked `DEPRECATED` or `EVIDENCE ONLY`.

## Deferred work

Backend, Frontend, Whisper, OCR, Ingress, TLS, authentication, and monitoring integration are intentionally deferred.

## Static validation

~~~bash
kubectl apply --dry-run=client -f kubernetes/namespace.yaml
kubectl apply --dry-run=client -f kubernetes/assistant/
~~~

## Local API verification

Port-forward is for administrator testing, not production exposure:

~~~bash
kubectl port-forward -n ai-llm svc/assistant-api 8000:8000
curl -i http://localhost:8000/health
curl http://localhost:8000/v1/models
VLLM_BASE_URL=http://127.0.0.1:8000 ./tests/test-chat.sh
VLLM_BASE_URL=http://127.0.0.1:8000 python3 tests/test-concurrency.py
~~~
