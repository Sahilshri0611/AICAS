"""
OCR service — extracts text from uploaded FIR images/PDFs using PyTesseract.

Requires the Tesseract binary to be installed and reachable (via PATH or
TESSERACT_CMD). PDFs are rasterized with pdf2image (poppler).
"""

from __future__ import annotations

import io
from typing import Tuple

from fastapi import HTTPException

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)

_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png"}
_PDF_TYPES = {"application/pdf"}


def _ensure_tesseract():
    try:
        import pytesseract  # noqa
    except ImportError:  # pragma: no cover
        raise HTTPException(500, "pytesseract not installed on the server")
    import pytesseract

    if settings.TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
    try:
        pytesseract.get_tesseract_version()
    except Exception:
        raise HTTPException(
            status_code=503,
            detail=(
                "Tesseract OCR is not available. Install it and set TESSERACT_CMD "
                "in the backend .env (see README)."
            ),
        )
    return pytesseract


def extract_text(content: bytes, content_type: str, filename: str) -> Tuple[str, float]:
    """
    Return (extracted_text, mean_confidence 0..1).
    Raises HTTPException(503) if OCR tooling is unavailable.
    """
    pytesseract = _ensure_tesseract()
    from PIL import Image

    images = []
    ctype = (content_type or "").lower()

    if ctype in _PDF_TYPES or filename.lower().endswith(".pdf"):
        try:
            from pdf2image import convert_from_bytes

            kwargs = {}
            if settings.POPPLER_PATH:
                kwargs["poppler_path"] = settings.POPPLER_PATH
            images = convert_from_bytes(content, dpi=200, **kwargs)
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"PDF rasterization failed (poppler required): {e}",
            )
    elif ctype in _IMAGE_TYPES or filename.lower().endswith((".jpg", ".jpeg", ".png")):
        images = [Image.open(io.BytesIO(content))]
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}")

    texts: list[str] = []
    confidences: list[float] = []
    for img in images:
        texts.append(pytesseract.image_to_string(img))
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        page_conf = [int(c) for c in data.get("conf", []) if str(c).lstrip("-").isdigit() and int(c) >= 0]
        if page_conf:
            confidences.append(sum(page_conf) / len(page_conf))

    full_text = "\n".join(texts).strip()
    mean_conf = (sum(confidences) / len(confidences) / 100.0) if confidences else 0.0
    if not full_text:
        raise HTTPException(status_code=422, detail="OCR produced no readable text")
    return full_text, round(mean_conf, 3)
