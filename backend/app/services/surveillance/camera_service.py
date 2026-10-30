"""
CCTV Camera management service.

Handles camera CRUD, status monitoring, and dashboard aggregation for the
Nagpur City Police CCTV surveillance network.
"""

from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.surveillance import CCTVCamera

log = get_logger(__name__)


class CameraService:
    def __init__(self, db: Session):
        self.db = db

    def list_cameras(
        self, status: Optional[str] = None, camera_type: Optional[str] = None
    ) -> list[CCTVCamera]:
        stmt = select(CCTVCamera).order_by(CCTVCamera.camera_id)
        if status and status != "all":
            stmt = stmt.where(CCTVCamera.status == status)
        if camera_type and camera_type != "all":
            stmt = stmt.where(CCTVCamera.camera_type == camera_type)
        return list(self.db.scalars(stmt).all())

    def get_camera(self, camera_id: int) -> CCTVCamera | None:
        return self.db.get(CCTVCamera, camera_id)

    def update_status(self, camera_id: int, status: str) -> CCTVCamera:
        cam = self.db.get(CCTVCamera, camera_id)
        if not cam:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Camera not found")
        cam.status = status
        cam.last_ping = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(cam)
        return cam

    def dashboard(self) -> dict:
        cameras = self.list_cameras()
        total = len(cameras)
        online = sum(1 for c in cameras if c.status == "online")
        offline = sum(1 for c in cameras if c.status == "offline")
        anpr = sum(1 for c in cameras if c.camera_type == "ANPR")

        return {
            "total_cameras": total,
            "online_cameras": online,
            "offline_cameras": offline,
            "anpr_cameras": anpr,
            "cameras": cameras,
        }
