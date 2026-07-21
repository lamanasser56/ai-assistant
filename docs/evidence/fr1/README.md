# FR1 Phase 1 Evidence Matrix

## Selected primary evidence

| File | Command/test shown | Exact observed values | Requirement proven |
|---|---|---|---|
| [02-health-endpoint-http-200.png](02-health-endpoint-http-200.png) | `curl -i http://localhost:8000/health` after Pod replacement | `HTTP/1.1 200 OK` | Health and restored service |
| [03-models-and-chat-completion.png](03-models-and-chat-completion.png) | `GET /v1/models` and `POST /v1/chat/completions` | model `assistant`, max length 4096, generated response | OpenAI-compatible APIs |
| [04-single-and-five-session-sla.png](04-single-and-five-session-sla.png) | `python3 scripts/fr1_sla_test.py` | single: 1.86 s, 300 tokens, 33.37 tok/s; concurrent TTFT 0.93–1.30 s; minimum 28.00 tok/s; ALL PASS | FR1 single and five-session SLA |
| [05-gpu-capacity-and-memory.png](05-gpu-capacity-and-memory.png) | `nvidia-smi`, device plugin, node Allocatable | Tesla T4; 11,443/15,360 MiB; GPU 1; CPU 4; memory 16,164,180 Ki | GPU capacity, scheduling, usage |
| [06-self-healing-recovery.png](06-self-healing-recovery.png) | Pod deletion then `kubectl get pods -w` | replacement reached `1/1` at age 44 s | Recovery under 120 s |
| [07-image-cache-evidence.png](07-image-cache-evidence.png) | Pod event inspection | image already present on machine | Cached-image restart support |
| [08-resources-qos-and-clusterip.png](08-resources-qos-and-clusterip.png) | Pod description and `kubectl get svc` | requests 2 CPU/10Gi/1 GPU; limits 4 CPU/14Gi/1 GPU; Burstable; ClusterIP:8000 | Resources, QoS, probes, labels, internal service |

No selected screenshot contains credentials, tokens, kubeconfig content, private keys, or Kubernetes Secret values.

## Selected source mapping

- Original ending `001635.png` → `03-models-and-chat-completion.png`
- Original ending `003729.png` → `05-gpu-capacity-and-memory.png`
- Original ending `020014.png` → `04-single-and-five-session-sla.png`
- Original ending `020435.png` → `06-self-healing-recovery.png`
- Original ending `020741.png` → `02-health-endpoint-http-200.png`
- Original ending `020939.png` → `07-image-cache-evidence.png`
- Original ending `021049.png` → `08-resources-qos-and-clusterip.png`

## Excluded duplicate evidence

- Original ending `000652.png`: older 66-second recovery run; replaced by the later 44-second primary evidence.
- Original ending `001136.png`: older GPU output; replaced by the clearer screenshot that also shows device-plugin and allocatable capacity.
- Original ending `003218.png`: contains unrelated failed diagnostic commands; clearer selected evidence exists.
- Original ending `011000.png`: older SLA run where one concurrent TTFT is 11.14 seconds; replaced by the stronger run.
- Original ending `012232.png`: VS Code directory view; no runtime requirement demonstrated.
- Original ending `014743.png`: duplicate of the older SLA run.

## Static evidence

Canonical desired state is in:

- `kubernetes/namespace.yaml`
- `kubernetes/assistant/deployment.yaml`
- `kubernetes/assistant/service.yaml`
