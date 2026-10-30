"""
Digital Evidence Vault — BNSS 2023 compliant evidence management.

Provides SHA-256 cryptographic hashing for tamper-proof document integrity,
file storage for FIR originals, and chain-of-custody tracking.
"""

from __future__ import annotations

import hashlib
import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger
from app.models.fir import FIRDocument

log = get_logger(__name__)


def _upload_root() -> Path:
    root = Path(settings.UPLOAD_DIR)
    if not root.is_absolute():
        root = Path(__file__).resolve().parents[3] / root
    fir_dir = root / "firs"
    fir_dir.mkdir(parents=True, exist_ok=True)
    return fir_dir


class EvidenceVaultService:
    def __init__(self, db: Optional[Session] = None):
        self.db = db

    @staticmethod
    def compute_hash(content: bytes) -> str:
        """Compute SHA-256 hex digest for evidence integrity verification."""
        return hashlib.sha256(content).hexdigest()

    @staticmethod
    def store_fir_file(content: bytes, filename: str, fir_id: int) -> dict:
        """
        Save an FIR file to the evidence vault.

        Returns dict with path, size, and SHA-256 hash.
        """
        ext = Path(filename).suffix.lower() or ".bin"
        stored_name = f"fir_{fir_id}_{uuid.uuid4().hex[:12]}{ext}"
        fir_dir = _upload_root()
        file_path = fir_dir / stored_name

        file_path.write_bytes(content)
        file_hash = hashlib.sha256(content).hexdigest()
        file_size = len(content)

        log.info(
            "Stored FIR %d file: %s (%d bytes, SHA-256: %s...)",
            fir_id, stored_name, file_size, file_hash[:16],
        )

        return {
            "path": str(file_path),
            "size": file_size,
            "hash": file_hash,
        }

    def verify_integrity(self, file_path: str, expected_hash: str) -> bool:
        """Read file and verify SHA-256 matches the stored hash."""
        p = Path(file_path)
        if not p.is_file():
            raise HTTPException(410, "Evidence file not found on disk")
        actual = hashlib.sha256(p.read_bytes()).hexdigest()
        return actual == expected_hash

    def chain_of_custody(self, fir_id: int) -> list[dict]:
        """
        Build a chain-of-custody timeline for an FIR document.
        Derived from timestamps on the FIR record.
        """
        if not self.db:
            return []

        fir = self.db.get(FIRDocument, fir_id)
        if not fir:
            raise HTTPException(404, "FIR not found")

        events = []

        # Upload event
        if fir.created_at:
            events.append({
                "action": "Document Uploaded",
                "timestamp": fir.created_at.isoformat(),
                "actor": f"User #{fir.uploaded_by_id}" if fir.uploaded_by_id else "System",
                "detail": f"File: {fir.original_filename} ({fir.content_type})",
            })

        # File stored event
        if fir.original_pdf_stored and fir.file_hash:
            events.append({
                "action": "Evidence Secured",
                "timestamp": fir.created_at.isoformat() if fir.created_at else None,
                "actor": "System",
                "detail": f"SHA-256: {fir.file_hash}",
            })

        # OCR event
        if fir.ocr_confidence is not None:
            events.append({
                "action": "OCR Processing",
                "timestamp": fir.created_at.isoformat() if fir.created_at else None,
                "actor": "PyTesseract Engine",
                "detail": f"Confidence: {fir.ocr_confidence:.1%}",
            })

        # AI parsing event
        if fir.processed_at:
            events.append({
                "action": "AI Entity Extraction",
                "timestamp": fir.processed_at.isoformat(),
                "actor": "GROQ LLM (gpt-oss-120b)",
                "detail": f"Overall confidence: {(fir.overall_confidence or 0):.1%}, "
                          f"Flagged fields: {len(fir.flagged_fields or [])}",
            })

        # Review status
        if fir.status in ("Needs Review", "Parsed"):
            events.append({
                "action": f"Status: {fir.status}",
                "timestamp": fir.processed_at.isoformat() if fir.processed_at else None,
                "actor": "System",
                "detail": "Awaiting officer review" if fir.status == "Needs Review" else "Ready for approval",
            })

        # Approved event
        if fir.incident_id:
            events.append({
                "action": "Approved & Incident Created",
                "timestamp": fir.processed_at.isoformat() if fir.processed_at else None,
                "actor": f"User #{fir.uploaded_by_id}" if fir.uploaded_by_id else "Officer",
                "detail": f"Linked to Incident #{fir.incident_id}",
            })

        return events

    def get_file_path(self, fir_id: int) -> Path | None:
        """Get the stored file path for an FIR document."""
        if not self.db:
            return None
        fir = self.db.get(FIRDocument, fir_id)
        if not fir or not fir.file_path:
            return None
        p = Path(fir.file_path)
        return p if p.is_file() else None
