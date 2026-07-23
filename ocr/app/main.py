"""CPU-only OCR API using Tesseract."""

from __future__ import annotations

import io
import time

import pytesseract
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError


app = FastAPI(title="OCR API", version="0.1.0")


@app.get("/health/live")
def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
def ready() -> dict[str, str]:
    try:
        pytesseract.get_tesseract_version()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Tesseract is unavailable: {exc}") from exc
    return {"status": "ready"}


@app.post("/v1/ocr")
async def extract_text(file: UploadFile = File(...)) -> dict[str, object]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="filename is required")

    started = time.perf_counter()

    try:
        payload = await file.read()
        image = Image.open(io.BytesIO(payload))
        image.load()

        text = pytesseract.image_to_string(
            image,
            lang="eng",
            config="--oem 1 --psm 6",
        ).strip()

        if not text:
            raise HTTPException(status_code=422, detail="no text detected")

        return {
            "text": text,
            "processing_seconds": round(time.perf_counter() - started, 3),
        }

    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=422, detail="invalid image file") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"OCR failed: {exc}") from exc
    finally:
        await file.close()
