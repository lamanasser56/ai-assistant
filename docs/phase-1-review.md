# Phase 1 Review

## Scope and architecture

Phase 1 contains only the internal vLLM assistant API.

```text
Internal Kubernetes Network
└── assistant-api:8000 (ClusterIP) → deployment/vllm → GPU worker
```

The namespace is `ai-llm`. `assistant-api` selects the vLLM pod through
`app.kubernetes.io/name: vllm`; service port `8000` targets the named
container port `http`, also port `8000`.

## Canonical manifests and inventory

The desired state consists of:

- `kubernetes/namespace.yaml`: Namespace; no ConfigMap or Secret.
- `kubernetes/assistant/deployment.yaml`: vLLM Deployment, embedded model,
  memory-backed `/dev/shm`; no PVC or hostPath.
- `kubernetes/assistant/service.yaml`: `assistant-api` ClusterIP Service.
- `inference/Dockerfile.vllm`: builds the current image from vLLM 0.6.3 and
  embeds `Qwen/Qwen2.5-7B-Instruct-AWQ`.
- `tests/test-chat.sh`, `tests/test-concurrency.py`, and
  `scripts/fr1_sla_test.py`: API and load tests.
- `docs/capacity-math.md`: T4 capacity rationale.

No Whisper or OCR manifests, Services, ConfigMaps, Secret references, or
deployable applications exist.

The following files are retained but are not canonical and must not be applied:

- `assistant-vllm.yaml`: obsolete `assistant` namespace and service name.
- `kubernetes/vllm.yaml`: older combined manifest with service `vllm`, a
  PVC, and a different model-loading strategy.
- `current-vllm.yaml`: cluster export with server-generated metadata/status.
- `docs/vllm-working-deployment.yaml` and
  `docs/assistant-api-working-service.yaml`: cluster snapshots rather than
  desired state.

## vLLM settings for Tesla T4 16 GiB

| Setting | Value | Rationale |
|---|---:|---|
| Model | `/models/qwen2.5-7b-instruct-awq` | Embedded required Qwen AWQ model. |
| Quantization / dtype | `awq` / `half` | T4-compatible; no BF16 assumption. |
| GPU utilization | `0.85` | Leaves VRAM headroom. |
| Maximum model length | `4096` | Bounded KV-cache usage. |
| Maximum active sequences | `4` | Conservative; extra requests queue. |
| CPU request / limit | `2` / `4` | Reserved preprocessing plus bounded burst. |
| Memory request / limit | `10Gi` / `14Gi` | Runtime capacity with node headroom. |
| `/dev/shm` | `2Gi`, memory-backed | Avoids the small runtime default. |

The Deployment has one replica, uses `Recreate`, requests and limits exactly
one `nvidia.com/gpu`, and selects through
`nvidia.com/gpu.present: "true"`. It does not pin a hostname. No other Phase 1
workload requests a GPU.

## Health and lifecycle

The vLLM OpenAI-compatible server exposes `/health`; it is used for startup,
readiness, and liveness. The startup probe allows approximately 20 minutes for
model initialization. Readiness runs every 10 seconds. Liveness runs every 30
seconds and cannot trigger until startup succeeds. `/v1/models` is reserved
for an end-to-end post-start validation. Termination grace is 60 seconds.

## Security and configuration

The container disables privilege escalation, drops all Linux capabilities, and
uses `RuntimeDefault` seccomp. A non-root UID and read-only root filesystem
were not asserted because support has not been proven for the existing image.
No token or password appears in canonical YAML. If runtime model downloads are
introduced later, use a Secret reference for `HF_TOKEN`.

## Validation

Static validation:

```bash
kubectl apply --dry-run=client -f kubernetes/namespace.yaml
kubectl apply --dry-run=client -f kubernetes/assistant/
```

Cluster verification, to be run manually:

```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/assistant/
kubectl rollout status deployment/vllm -n ai-llm --timeout=20m
kubectl get deploy,pod,svc,endpoints -n ai-llm -o wide
kubectl describe pod -n ai-llm <pod-name>
kubectl logs -n ai-llm <pod-name>
kubectl run curl-phase1 -n ai-llm --rm -it --restart=Never --image=curlimages/curl -- curl --fail http://assistant-api:8000/health
kubectl run curl-models -n ai-llm --rm -it --restart=Never --image=curlimages/curl -- curl --fail http://assistant-api:8000/v1/models
```

## Validation status

The manifests have only been statically inspected in this review unless the
final report explicitly records a successful local tool result. They have not
been applied to or validated on a cluster by this task.

## Phase 2 prerequisites

- Supply complete, independently tested Whisper and OCR applications/images
  before creating their CPU-only Deployments and ClusterIP Services.
- Confirm the CPU-worker label or affinity policy.
- Archive or relocate obsolete manifests so operators cannot apply the wrong
  desired state.
- Capture cluster evidence for GPU scheduling, image startup, endpoints, logs,
  and representative load.
