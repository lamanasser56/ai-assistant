# Phase 1 — AI Chat Assistant

## Status

**Phase 1 runtime validation: PASS**

**Final external web integration: PENDING** until Backend, Frontend, and Ingress are implemented.

## Objective

Phase 1 provides a self-hosted, open-weight assistant using vLLM and `Qwen/Qwen2.5-7B-Instruct-AWQ` on Kubernetes with an NVIDIA Tesla T4.

## Architecture

~~~text
Internal Kubernetes Network
└── assistant-api (ClusterIP:8000)
      └── vLLM Pod
            └── Qwen2.5-7B-Instruct-AWQ
                  └── NVIDIA Tesla T4
~~~

Only vLLM consumes the GPU. Later CPU services will call it internally through Kubernetes DNS.

## Components

| Component | Implementation | Runtime | Exposure |
|---|---|---|---|
| AI model | Qwen2.5-7B-Instruct-AWQ | NVIDIA Tesla T4 | Internal |
| Serving engine | vLLM | Deployment `vllm` | Internal |
| API | OpenAI-compatible API | Port 8000 | `assistant-api` |
| Service | `assistant-api` | ClusterIP | Internal only |

Canonical desired state is `kubernetes/namespace.yaml`, `kubernetes/assistant/deployment.yaml`, and `kubernetes/assistant/service.yaml`. Historical YAML is marked `DEPRECATED` or `EVIDENCE ONLY`.

The canonical Deployment uses `lamai7/vllm-qwen2.5-7b-awq:0.1.0`; `inference/Dockerfile.vllm` shows that image is based on `vllm/vllm-openai:v0.6.3`. This distinction is retained rather than silently documenting the base image as the deployed image.

## Kubernetes design decisions

- Namespace is `ai-llm`.
- One replica and exactly one requested/limited GPU are used because the environment has one GPU.
- GPU labels are used instead of a fixed hostname.
- `assistant-api` is ClusterIP; no NodePort, LoadBalancer, or Ingress is used.
- A 2 GiB memory-backed `/dev/shm` is configured.
- CPU, memory, and GPU requests and limits are configured.
- CPU-based HPA is not used.
- Pod self-healing is available, but one GPU cannot provide node-level high availability.

## API contract

Verified endpoints are `GET /health`, `GET /v1/models`, and `POST /v1/chat/completions`.

Port-forward is an administrator test method, not production web exposure:

~~~bash
kubectl port-forward -n ai-llm svc/assistant-api 8000:8000
curl -i http://localhost:8000/health
curl http://localhost:8000/v1/models
curl http://localhost:8000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"assistant","messages":[{"role":"user","content":"Reply with a short test response."}],"temperature":0,"max_tokens":32}'
~~~

## SLA validation

| Test | Requirement | Observed result | Status |
|---|---:|---:|---|
| Single-session TTFT | ≤ 3 s | 1.86 s | PASS |
| Single-session throughput | ≥ 10 tokens/s | 33.37 tokens/s | PASS |
| Concurrent sessions | 5 | 5 completed | PASS |
| Per-session concurrent throughput | ≥ 5 tokens/s | minimum 28.00 tokens/s | PASS |
| Concurrent TTFT | all sessions below 3 s | 0.93–1.30 s | PASS |
| Health endpoint | HTTP 200 | HTTP 200 | PASS |
| Pod recovery | ≤ 120 s | 44 s | PASS |

All five sessions passed. Successful recovery was also observed in a separate run at 66 seconds. The selected primary measurements are not averages or merged values.

## Capacity and right-sizing

See [`capacity-math.md`](capacity-math.md).

| Setting | Repository and runtime value |
|---|---:|
| Quantization / dtype | `awq` / `half` |
| GPU memory utilization | `0.85` |
| Maximum model length | `4096` |
| Maximum active sequences | `8` |
| CPU request / limit | `2` / `4` |
| Memory request / limit | `10Gi` / `14Gi` |
| GPU request / limit | `1` / `1` |
| Observed QoS | `Burstable` |

AWQ lowers model-weight memory relative to FP16 weights. Remaining VRAM supports KV cache, CUDA graphs, activations, and runtime buffers. Preserving headroom is safer than allocating 100%. `max-model-len` and `max-num-seqs` affect KV-cache capacity. Five-user validation is stronger evidence than theoretical capacity alone.

Evidence reports one Tesla T4, 15,360 MiB VRAM, 11,443 MiB observed usage, four allocatable CPU cores, and 16,164,180 Ki allocatable memory. The supplied manually verified memory value was 16,164,184 Ki; the selected screenshot visibly shows 16,164,180 Ki, so the readable screenshot value is used and the four-Ki difference is reported rather than hidden.

**TODO:** Add the final reproducible VRAM and KV-cache calculation using exact deployed model metadata and active vLLM settings.

## Reliability

The Deployment recreated a deleted Pod in 44 seconds in the primary selected run. Startup, readiness, and liveness probes use `/health`. Evidence shows the image already present on the node, which can reduce restart time. The single GPU remains a node-level single point of failure.

## Security and exposure

`assistant-api` remains ClusterIP and is not directly Internet-exposed. Future traffic will flow through Ingress to Backend. TLS, authentication, authorization, rate limiting, and external controls belong to final integration. Secrets must not be committed.

## Evidence

See [the FR1 evidence matrix](evidence/fr1/README.md). Screenshots are runtime evidence; canonical manifests are static desired-state evidence.

## Remaining integration work

Whisper, OCR, Backend, Frontend, Ingress, TLS, authentication/access restrictions, monitoring integration, and final web-reachability validation are deferred and are not Phase 1 failures.
