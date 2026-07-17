# AI Assistant — vLLM Foundation

Minimal Kubernetes foundation for serving `Qwen/Qwen2.5-7B-Instruct-AWQ` through
the OpenAI-compatible vLLM API on a single NVIDIA Tesla T4 GPU.

## Components

- Namespace: `ai-llm`
- vLLM: `vllm/vllm-openai:v0.6.3`
- Served model name: `assistant`
- Persistent Hugging Face model cache
- Internal-only `ClusterIP` service

No application gateway, speech, OCR, portal, monitoring, or CI components are
included yet.

## Prerequisites

- A working k3s cluster
- NVIDIA drivers and the NVIDIA container runtime/device plugin configured
- One schedulable Tesla T4 GPU exposed as `nvidia.com/gpu`
- The k3s `local-path` StorageClass, or an equivalent default StorageClass
- `kubectl` access when you are ready to deploy

Before deployment, list the cluster StorageClasses:

```bash
kubectl get storageclass
```

Verify that one StorageClass is marked as the default. The Phase 1 PVC does not
set `storageClassName`, so Kubernetes relies on the cluster default for dynamic
volume provisioning.

If the Hugging Face model requires authentication in your environment, add a
Kubernetes Secret separately and expose `HF_TOKEN` to the container. Do not
commit tokens to this repository.

## Files

```text
.
├── README.md
├── docs/
│   └── capacity-math.md
├── kubernetes/
│   ├── namespace.yaml
│   └── vllm.yaml
└── tests/
    ├── test-chat.sh
    └── test-concurrency.py
```

## Deployment sequence

These commands are documentation only; they have not been run by this project:

```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/vllm.yaml
kubectl -n ai-llm rollout status deployment/vllm
```

The service is internal to the cluster at:

```text
http://vllm.ai-llm.svc.cluster.local:8000
```

For testing from an administrator workstation, establish port forwarding in a
separate terminal:

```bash
kubectl -n ai-llm port-forward service/vllm 8000:8000
```

Then run:

```bash
VLLM_BASE_URL=http://127.0.0.1:8000 ./tests/test-chat.sh
VLLM_BASE_URL=http://127.0.0.1:8000 python3 tests/test-concurrency.py
```

The concurrency test defaults to four simultaneous requests, matching
`--max-num-seqs 4`.

