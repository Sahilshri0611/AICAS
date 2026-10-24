"""
Case files — evidence documents, photos, medical reports, panchnamas etc.
attached to an incident. Bytes live on disk under UPLOAD_DIR with random
server-side names; metadata lives in `case_files`.
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger
from app.models.case_file import CaseFile
from app.models.crime import Incident
from app.models.user import User

log = get_logger(__name__)

CATEGORIES = (
    "Evidence", "FIR Copy", "Photo", "Video", "Audio", "Medical Report",
    "Panchnama", "Statement", "Chargesheet", "Other",
)

ALLOWED_EXTENSIONS = {
    ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff",
    ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt", ".rtf", ".odt",
    ".mp4", ".mov", ".avi", ".mkv", ".mp3", ".wav", ".m4a", ".ogg", ".zip",
}


def upload_root() -> Path:
    root = Path(settings.UPLOAD_DIR)
    if not root.is_absolute():
        root = Path(__file__).resolve().parents[2] / root   # backend/<UPLOAD_DIR>
    root.mkdir(parents=True, exist_ok=True)
    return root


class CaseFileService:
    def __init__(self, db: Session):
        self.db = db

    def _incident(self, incident_id: int) -> Incident:
        inc = self.db.get(Incident, incident_id)
        if not inc:
            raise HTTPException(status_code=404, detail="Incident not found")
        return inc

    def list(self, incident_id: int) -> list[CaseFile]:
        self._incident(incident_id)
        return list(self.db.scalars(
            select(CaseFile).where(CaseFile.incident_id == incident_id).order_by(CaseFile.created_at.desc())
        ).all())

    def get(self, incident_id: int, file_id: int) -> CaseFile:
        cf = self.db.get(CaseFile, file_id)
        if not cf or cf.incident_id != incident_id:
            raise HTTPException(status_code=404, detail="File not found")
        return cf

    async def add(
        self,
        incident_id: int,
        files: list[UploadFile],
        user: User,
        category: str = "Evidence",
        description: str | None = None,
    ) -> list[CaseFile]:
        self._incident(incident_id)
        if not files:
            raise HTTPException(status_code=422, detail="No files provided")
        if category not in CATEGORIES:
            category = "Other"
        max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
        root = upload_root()

        # Validate everything before writing anything
        payloads: list[tuple[UploadFile, bytes, str]] = []
        for f in files:
            name = os.path.basename(f.filename or "file")
            ext = Path(name).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(status_code=415, detail=f"'{name}': file type {ext or '(none)'} is not allowed")
            content = await f.read()
            if not content:
                raise HTTPException(status_code=422, detail=f"'{name}' is empty")
            if len(content) > max_bytes:
                raise HTTPException(status_code=413, detail=f"'{name}' exceeds {settings.MAX_UPLOAD_MB} MB")
            payloads.append((f, content, ext))

        created: list[CaseFile] = []
        written: list[Path] = []
        try:
            for f, content, ext in payloads:
                stored = f"{uuid.uuid4().hex}{ext}"
                path = root / stored
                path.write_bytes(content)
                written.append(path)
                cf = CaseFile(
                    incident_id=incident_id,
                    original_filename=os.path.basename(f.filename or "file")[:255],
                    content_type=(f.content_type or "application/octet-stream")[:128],
                    size_bytes=len(content),
                    stored_name=stored,
                    category=category,
                    description=description,
                    uploaded_by_id=user.id,
                    uploaded_by_name=user.full_name,
                )
                self.db.add(cf)
                created.append(cf)
            self.db.commit()
        except Exception:
            self.db.rollback()
            for p in written:
                p.unlink(missing_ok=True)
            raise
        for cf in created:
            self.db.refresh(cf)
        log.info("Attached %d file(s) to incident %s", len(created), incident_id)
        return created

    def path_for(self, cf: CaseFile) -> Path:
        path = upload_root() / cf.stored_name
        if not path.is_file():
            raise HTTPException(status_code=410, detail="Stored file is missing on the server")
        return path

    def mark_downloaded(self, cf: CaseFile) -> None:
        cf.download_count = (cf.download_count or 0) + 1
        self.db.commit()

    def delete(self, incident_id: int, file_id: int) -> None:
        cf = self.get(incident_id, file_id)
        (upload_root() / cf.stored_name).unlink(missing_ok=True)
        self.db.delete(cf)
        self.db.commit()

    def remove_stored_files(self, incident: Incident) -> None:
        """Delete bytes on disk for an incident about to be deleted (rows cascade)."""
        for cf in incident.files:
            (upload_root() / cf.stored_name).unlink(missing_ok=True)
