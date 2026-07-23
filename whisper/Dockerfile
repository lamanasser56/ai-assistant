FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    WHISPER_MODEL_PATH=/models/whisper-base \
    WHISPER_DEVICE=cpu \
    WHISPER_COMPUTE_TYPE=int8 \
    WHISPER_CPU_THREADS=2

RUN apt-get update \
    && apt-get install --no-install-recommends -y libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 appuser

WORKDIR /app

COPY whisper/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

ARG WHISPER_MODEL_PATH=/models/whisper-base

RUN mkdir -p "${WHISPER_MODEL_PATH}" \
    && python -c "from faster_whisper.utils import download_model; download_model('base', output_dir='${WHISPER_MODEL_PATH}')"

COPY whisper/app ./app

USER 10001:10001

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]