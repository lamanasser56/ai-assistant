# Sovereign AI monitoring

This directory overlays the existing `monitoring` kube-prometheus-stack release. The platform flow is Frontend (Nginx) -> Backend (FastAPI) -> vLLM, Whisper, and OCR in `ai-llm`. Prometheus, Grafana, Alertmanager, and the Operator use required node affinity excluding nodes labelled `nvidia.com/gpu.present`; node-exporter remains a DaemonSet on every node.

## Inspection findings

The Kubernetes API at `34.72.33.119:6443` timed out during this inspection, so live Services, Deployments, release values, chart version, targets, and DCGM installation could not be verified. Re-run the commands below before deployment. Repository manifests define `backend-api:8000/http`, `frontend:80/http`, `whisper-api:8000/http`, `ocr-api:8000/http`, and `assistant-api:8000/http`.

Only the vLLM ServiceMonitor is valid from repository evidence. The image derives from `vllm/vllm-openai:v0.6.3`, whose OpenAI server exposes Prometheus metrics at `/metrics`; its Service has the matching vLLM labels and named `http` port. Backend, Whisper, and OCR are FastAPI applications with no Prometheus dependency or metrics route. Frontend is plain Nginx with no exporter or `stub_status`. Their CPU, memory, readiness, and restart behavior remains visible through kubelet/cAdvisor and kube-state-metrics. No broken ServiceMonitors are supplied for those four services. Backend request/error panels are also omitted.

GPU panels and a DCGM deployment are intentionally omitted because live installation could not be verified and an exporter must not risk the working GPU workload. If GPU telemetry is required, install NVIDIA's dcgm-exporter chart only after confirming the node label, configure affinity/node selection for `nvidia.com/gpu.present`, do not request `nvidia.com/gpu`, and enable its ServiceMonitor with label `release: monitoring`. Verify the DaemonSet lands only on GPU-labelled nodes before adding `DCGM_FI_DEV_GPU_UTIL` or memory panels.

The validated runtime alerting implementation used Grafana native alerting. Evidence shows the Grafana alert-rule evaluation group and a successful contact-point test notification. `prometheus-rules.yaml` is an unapplied reference manifest only; it has not been deployed or runtime-validated.

## Prerequisites and preflight

```bash
kubectl config current-context
kubectl get services,deployments -n ai-llm -o wide
kubectl get services,deployments -n monitoring -o wide
kubectl get nodes -L nvidia.com/gpu.present
kubectl get servicemonitors,prometheusrules -A
helm get values monitoring -n monitoring -a
helm get metadata monitoring -n monitoring
```

Confirm the live `assistant-api` labels and `http` port match `servicemonitors/vllm-servicemonitor.yaml`, and test `/metrics` from inside the cluster before applying it.

## Install or upgrade

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --values kubernetes/monitoring/values.yaml
kubectl apply -f kubernetes/monitoring/servicemonitors/vllm-servicemonitor.yaml
kubectl apply -f kubernetes/monitoring/dashboards/sovereign-ai-dashboard-configmap.yaml
```

These are deployment commands for an operator to run later; this change set was not applied.

## Access and verification

```bash
kubectl -n monitoring get pods
kubectl -n monitoring get servicemonitor vllm -o yaml
kubectl -n monitoring port-forward svc/monitoring-grafana 3000:80
kubectl -n monitoring port-forward svc/monitoring-kube-prometheus-prometheus 9090:9090
kubectl -n monitoring get secret monitoring-grafana -o jsonpath='{.data.admin-password}' | base64 -d; echo
kubectl -n monitoring get prometheus -o yaml
```

In Prometheus, inspect **Status -> Targets** and query `up{namespace="ai-llm"}`. In Grafana, open **Sovereign AI Assistant Platform**. The dashboard intentionally has no backend or GPU panels because those metrics were not proven.

## Telegram

Follow `telegram/README.md` to create `grafana-telegram` locally without writing credentials to Git. In Grafana Alerting, create or update the Telegram contact point, send a test notification, then route warning and critical alerts to it. Code provisioning must wait until the installed chart/Grafana version is known; copying an unverified provisioning schema into values could silently break alert delivery.

The successful test-notification evidence validates Grafana's native contact-point test. It does not validate deployment of the reference PrometheusRule manifest.

## Validation

```bash
helm template monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --values kubernetes/monitoring/values.yaml > /tmp/monitoring-rendered.yaml
kubectl apply --dry-run=client --validate=false -f kubernetes/monitoring/prometheus-rules.yaml
kubectl apply --dry-run=client --validate=false -f kubernetes/monitoring/servicemonitors/vllm-servicemonitor.yaml
kubectl apply --dry-run=client --validate=false -f kubernetes/monitoring/dashboards/sovereign-ai-dashboard-configmap.yaml
```

The PrometheusRule command above is syntax validation only. Do not interpret it as an installation or runtime-validation command.

## Troubleshooting

- `context deadline exceeded`: verify the current context, API address, VPN/firewall, and control-plane availability before retrying.
- Monitoring pod on GPU node: check `kubectl get node NODE -o jsonpath='{.metadata.labels.nvidia\.com/gpu\.present}'`. The label must exist on every GPU node; inspect rendered affinity and pod scheduling events.
- Target down: compare ServiceMonitor selectors with live Service labels, confirm the endpoint uses the named Service port (not a numeric container port), inspect Endpoints, and curl `/metrics` from a temporary in-cluster client.
- Broken port-forward after pod recreation: stop the old process and rerun the Service-based port-forward command above.
- Missing dashboard: verify the Grafana sidecar is enabled and the ConfigMap has `grafana_dashboard: "1"` in `monitoring`.

## Uninstall

This is destructive and is not run by this work:

```bash
helm uninstall monitoring -n monitoring
```

Prometheus Operator CRDs may remain by chart design. Review them separately; never delete CRDs without assessing all dependent resources.
