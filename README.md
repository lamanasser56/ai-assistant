# Sovereign AI Assistant Platform

## 1. Project Overview

The Sovereign AI Assistant Platform is a self-hosted AI workspace running on Kubernetes. It combines private language-model inference, speech transcription, OCR, a backend API, a browser portal, and cluster monitoring in the `ai-llm` namespace.

![Sovereign AI Assistant Platform frontend](docs/evidence/platform/10-frontend-portal.png)

## 2. Architecture

```text
Use
  |
  v
Frontend Portal (Nginx)
  |
  v
Backend API (FastAPI)
  |------------------|------------------|
  v                  v                  v
vLLM / Qwen      Whisper STT         OCR / Tesseract
  |
  v
NVIDIA GPU

Prometheus + Grafana observe Kubernetes workload health and resource usage.
```

The application services use internal Kubernetes `ClusterIP` networking.

![Kubernetes service inventory](docs/evidence/platform/11-kubernetes-services.png)

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Orchestration | Kubernetes / k3s |
| Language model serving | vLLM with Qwen2.5-7B-Instruct-AWQ |
| GPU runtime | NVIDIA container runtime and Tesla T4 |
| Speech-to-text | Faster Whisper |
| OCR | Tesseract, Pillow, and pytesseract |
| Backend | Python, FastAPI, Uvicorn, and HTTPX |
| Frontend | React, Vite, and Nginx |
| Monitoring | kube-prometheus-stack, Prometheus, Grafana, Alertmanager, kube-state-metrics, and node-exporter |

The captured GPU evidence shows the Tesla T4 and the vLLM workload running on the GPU node.

![vLLM GPU runtime](docs/evidence/platform/06-vllm-gpu-runtime.png)

## 4. Kubernetes Deployment

The captured deployment state shows Backend, Frontend, OCR, vLLM, and Whisper available in `ai-llm`.

![Kubernetes deployments ready](docs/evidence/platform/01-deployments-ready.png)

Workload QoS is visible in the pod inventory. The vLLM pod's actual QoS class is `Burstable` because its CPU request and CPU limit are different. The Kubernetes resource values are unchanged.

![Kubernetes pod QoS](docs/evidence/platform/02-pod-qos.png)

Kubernetes self-healing was exercised by deleting both a Frontend pod and the vLLM pod. The screenshot records replacement pods becoming ready.

![Frontend and vLLM self-healing](docs/evidence/platform/03-frontend-vllm-self-healing.png)

## 5. FR1 – AI Assistant (vLLM + Qwen2.5-7B-Instruct-AWQ)

FR1 serves the `assistant` model through vLLM. The captured API response shows a successful chat completion from the deployed model.

![vLLM chat completion](docs/evidence/platform/05-vllm-chat-completion.png)

The captured SLA test records passing single-session and five-concurrent-session runs.

![vLLM single and concurrent session SLA](docs/evidence/platform/07-vllm-sla.png)

The recorded vLLM pod recovery test reached the Ready condition in 66 seconds.

![vLLM recovery time](docs/evidence/platform/04-vllm-recovery-time.png)

Detailed FR1 design and validation notes are available in [docs/phase-1-ai-assistant.md](docs/phase-1-ai-assistant.md).

## 6. FR2 – Speech-to-Text (Whisper)

FR2 accepts audio and returns a text transcription through the Whisper API. The following is the single official transcription-output screenshot selected from the evidence PDF.

![Whisper transcription output](docs/evidence/platform/08-whisper-transcription.png)

The measured Whisper SLA run completed with `PASS`, recording a processing time below the configured 30-second limit.

![Whisper SLA PASS evidence](docs/evidence/fr2/whisper-sla-pass.png)

Additional implementation and validation notes are available in [docs/phase-2-whisper.md](docs/phase-2-whisper.md).

## 7. FR3 – OCR

FR3 extracts readable text from an uploaded image. The following is the single official OCR-output screenshot selected from the evidence PDF.

![OCR extracted text output](docs/evidence/platform/09-ocr-output.png)

The OCR API response evidence includes the measured `processing_seconds` field.

![OCR processing_seconds evidence](docs/evidence/fr3/ocr-processing-seconds.png)

## 8. Monitoring (Prometheus + Grafana)

The monitoring stack provides namespace and pod-level CPU and memory visibility. The captured Grafana dashboard is filtered to the `ai-llm` namespace and shows live application workload metrics.

![Grafana monitoring for ai-llm](docs/evidence/platform/12-grafana-monitoring.png)

The runtime-validated implementation uses Grafana native alerting with a Telegram Bot notification channel. The complete alert delivery pipeline was validated in two stages:

1. Grafana successfully sent a test notification through the configured contact point.
2. A real firing alert was delivered to the Telegram Bot.

Together, these results confirm the complete end-to-end path from Grafana alert evaluation through Telegram delivery.

![Grafana native alert rule evidence](docs/evidence/monitoring/grafana-native-alert-rule.png)

![Grafana successful test notification](docs/evidence/monitoring/grafana-test-notification-success.png)

![Telegram Bot firing notification](docs/evidence/monitoring/telegram-bot-firing-notification.png)

`kubernetes/monitoring/prometheus-rules.yaml` is an unapplied reference manifest only. It is not presented as deployed or runtime-validated.

Production-style monitoring configuration and operational guidance are in [kubernetes/monitoring](kubernetes/monitoring/README.md).

## 9. Frontend Portal

The React portal provides one interface for AI Chat, Speech to Text, OCR, and service health. Nginx serves the built frontend and proxies API requests to the Backend Service. The platform overview screenshot is shown in the Project Overview; Frontend self-healing is recorded in the Kubernetes Deployment section without duplicating either image.

## 10. Repository Structure

```text
ai-assistant/
|-- backend/                  # FastAPI gateway and upstream integrations
|-- frontend/                 # React/Vite portal served by Nginx
|-- inference/                # vLLM image definition
|-- whisper/                  # Speech-to-text service
|-- ocr/                      # OCR service
|-- kubernetes/
|   |-- assistant/            # Canonical vLLM Deployment and Service
|   |-- backend/              # Backend Kubernetes resources
|   |-- frontend/             # Frontend Kubernetes resources
|   |-- whisper/              # Whisper Kubernetes resources
|   |-- ocr/                  # OCR Kubernetes resources
|   `-- monitoring/           # Helm values, alerts, dashboard, and ServiceMonito
|-- docs/
|   `-- evidence/
|       `-- platform/         # Official screenshots selected from the evidence PDF
|-- scripts/                  # Validation and SLA utilities
`-- tests/                    # API and concurrency checks
```

The images in `docs/evidence/platform/` were extracted from the supplied evidence PDF. Empty pages and duplicate terminal outputs were intentionally excluded.
