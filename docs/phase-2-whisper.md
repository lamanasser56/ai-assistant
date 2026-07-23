# Phase 2 — CPU Whisper Service

## Scope

Phase 2 adds only a CPU-only speech-to-text service. Phase 1 vLLM manifests and
runtime configuration remain unchanged. Backend, Frontend, OCR, Ingress, TLS,
authentication, and monitoring integration are deferred.

## Architecture

```text
Internal Kubernetes Network
└── whisper-api (ClusterIP:8000)
      └── Whisper Deployment (1 replica)
            └── faster-whisper base / CPU / int8
                  └── CPU worker selected by GPU-label exclusion
```

The Deployment requests 1 CPU and 1 GiB memory, and is limited to 2 CPU and 3
GiB memory. It requests no GPU resource. Required node affinity excludes nodes
with `nvidia.com/gpu.present`; verify CPU node labels before deployment.

## API

- `GET /health/live`: process health.
- `GET /health/ready`: model-loaded readiness.
- `POST /v1/audio/transcriptions`: multipart upload field `file`, returning JSON
  with transcript, language, duration, and processing time.

The ClusterIP is internal. Port-forward is for testing only:

```bash
kubectl port-forward -n ai-llm svc/whisper-api 8000:8000
WHISPER_BASE_URL=http://127.0.0.1:8000 ./tests/test-whisper.sh
WHISPER_BASE_URL=http://127.0.0.1:8000 \
  python3 scripts/fr2_sla_test.py path/to/60-second-audio.wav
```

## Runtime and image

The service uses `faster-whisper`, with the `base` model bundled at
`/models/whisper-base`, `device=cpu`, and `compute_type=int8`. The Dockerfile
downloads the model during image build. Runtime validates this directory and loads
it with `local_files_only=True`; it never downloads from Hugging Face. A missing
directory causes a clear startup error. The container runs one Uvicorn worker. The
initial image name is
`lamai7/whisper-api:0.1.0`; publish or load it on CPU workers before applying
the Deployment.

## Validation

The acceptance target is a non-empty transcript for a 60-second audio file in
under 30 seconds. This is a runtime benchmark, not a claim until measured on
the target CPU worker. Run client-side checks before any cluster apply:

```bash
kubectl apply --dry-run=client -f kubernetes/whisper/configmap.yaml
kubectl apply --dry-run=client -f kubernetes/whisper/deployment.yaml
kubectl apply --dry-run=client -f kubernetes/whisper/service.yaml
```
