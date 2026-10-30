"""
ANPR (Automatic Number Plate Recognition) service.

Handles plate detections, hotlist management, and hotlist-hit alerting for
the Nagpur City Police surveillance system.
"""

from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_, desc, func, select
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.surveillance import ANPRDetection, CCTVCamera, VehicleHotlist

log = get_logger(__name__)


class ANPRService:
    def __init__(self, db: Session):
        self.db = db

    # ── Detections ──

    def list_detections(
        self, limit: int = 50, hotlist_only: bool = False
    ) -> list[dict]:
        stmt = (
            select(
                ANPRDetection,
                CCTVCamera.name.label("camera_name"),
                CCTVCamera.location.label("camera_location"),
            )
            .join(CCTVCamera, ANPRDetection.camera_id == CCTVCamera.id)
            .order_by(desc(ANPRDetection.detected_at))
            .limit(limit)
        )
        if hotlist_only:
            stmt = stmt.where(ANPRDetection.is_hotlist_hit.is_(True))

        rows = self.db.execute(stmt).all()
        result = []
        for det, cam_name, cam_loc in rows:
            d = {
                "id": det.id,
                "camera_id": det.camera_id,
                "plate_number": det.plate_number,
                "confidence": det.confidence,
                "vehicle_make": det.vehicle_make,
                "vehicle_color": det.vehicle_color,
                "detected_at": det.detected_at.isoformat() if det.detected_at else None,
                "is_hotlist_hit": det.is_hotlist_hit,
                "matched_suspect_id": det.matched_suspect_id,
                "alert_generated": det.alert_generated,
                "camera_name": cam_name,
                "camera_location": cam_loc,
            }
            result.append(d)
        return result

    # ── Hotlist ──

    def list_hotlist(self, status: str = "active") -> list[VehicleHotlist]:
        stmt = select(VehicleHotlist).order_by(desc(VehicleHotlist.added_at))
        if status != "all":
            stmt = stmt.where(VehicleHotlist.status == status)
        return list(self.db.scalars(stmt).all())

    def add_to_hotlist(
        self,
        plate: str,
        reason: str,
        suspect_id: Optional[int] = None,
        fir_ref: Optional[str] = None,
        vehicle_desc: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> VehicleHotlist:
        existing = self.db.scalar(
            select(VehicleHotlist).where(
                VehicleHotlist.plate_number == plate,
                VehicleHotlist.status == "active",
            )
        )
        if existing:
            raise HTTPException(400, f"Vehicle {plate} is already on the active hotlist")

        entry = VehicleHotlist(
            plate_number=plate.upper().strip(),
            reason=reason,
            suspect_id=suspect_id,
            fir_reference=fir_ref,
            vehicle_description=vehicle_desc,
            added_by_id=user_id,
            added_at=datetime.now(timezone.utc),
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        log.info("Added %s to hotlist: %s", plate, reason)
        return entry

    def remove_from_hotlist(self, hotlist_id: int) -> VehicleHotlist:
        entry = self.db.get(VehicleHotlist, hotlist_id)
        if not entry:
            raise HTTPException(404, "Hotlist entry not found")
        entry.status = "removed"
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def check_plate(self, plate: str) -> dict:
        entry = self.db.scalar(
            select(VehicleHotlist).where(
                VehicleHotlist.plate_number == plate.upper().strip(),
                VehicleHotlist.status == "active",
            )
        )
        return {
            "plate": plate,
            "is_hotlisted": entry is not None,
            "entry": entry,
        }

    # ── Stats ──

    def detection_stats(self) -> dict:
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        total_today = self.db.scalar(
            select(func.count(ANPRDetection.id)).where(ANPRDetection.detected_at >= today)
        ) or 0
        hits_today = self.db.scalar(
            select(func.count(ANPRDetection.id)).where(
                and_(ANPRDetection.detected_at >= today, ANPRDetection.is_hotlist_hit.is_(True))
            )
        ) or 0
        return {
            "total_detections_today": total_today,
            "hotlist_hits_today": hits_today,
        }

    def recent_alerts(self, limit: int = 20) -> list[dict]:
        return self.list_detections(limit=limit, hotlist_only=True)
