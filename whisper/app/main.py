"""CPU-only Whisper transcription API."""

from __future__ import annotations

import os
import shutil
import tempfile
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from faster_whisper import WhisperModel


MODEL_PATH = Path(os.getenv("WHISPER_MODEL_PATH", "/models/whisper-base"))
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
CPU_THREADS = int(os.getenv("WHISPER_CPU_THREADS", "2"))


class Runtime:
    model: WhisperModel | None = None


runtime = Runtime()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not MODEL_PATH.is_dir():
        raise RuntimeError(f"bundled Whisper model is missing: {MODEL_PATH}; image build must download it")
    runtime.model = WhisperModel(
        str(MODEL_PATH),
        device=DEVICE,
        compute_type=COMPUTE_TYPE,
        cpu_threads=CPU_THREADS,
        num_workers=1,
        local_files_only=True,
    )
    yield
    runtime.model = None


app = FastAPI(title="Whisper API", version="0.1.0", lifespan=lifespan)


@app.get("/health/live")
def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
def ready() -> dict[str, str]:
    if runtime.model is None:
        raise HTTPException(status_code=503, detail="model is not loaded")
    return {"status": "ready"}


@app.post("/v1/audio/transcriptions")
def transcribe(file: UploadFile = File(...)) -> dict[str, object]:
    if runtime.model is None:
        raise HTTPException(status_code=503, detail="model is not loaded")
    if not file.filename:
        raise HTTPException(status_code=400, detail="filename is required")

    started = time.perf_counter()
    suffix = Path(file.filename).suffix or ".audio"
    temporary_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temporary:
            temporary_path = temporary.name
            shutil.copyfileobj(file.file, temporary)

        segments, info = runtime.model.transcribe(temporary_path, beam_size=5)
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {
            "text": text,
            "language": info.language,
            "duration_seconds": info.duration,
            "processing_seconds": round(time.perf_counter() - started, 3),
        }
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"transcription failed: {exc}") from exc
    finally:
        if temporary_path:
            Path(temporary_path).unlink(missing_ok=True)
        file.file.close()
