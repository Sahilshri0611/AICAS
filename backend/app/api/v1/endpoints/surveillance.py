"""Surveillance (CCTV & ANPR) endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_permission
from app.core.rbac import Permission
from app.models.user import User
from app.schemas.surveillance import (
    CameraRead,
    HotlistCreate,
    HotlistRead,
    SurveillanceDashboard,
)
from app.services.surveillance.anpr_service import ANPRService
from app.services.surveillance.camera_service import CameraService

router = APIRouter(prefix="/surveillance", tags=["surveillance"])


class StatusUpdate(BaseModel):
    status: str


@router.get("/dashboard", response_model=SurveillanceDashboard)
def dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_INCIDENTS)),
):
    cam_svc = CameraService(db)
    anpr_svc = ANPRService(db)
    cam_dash = cam_svc.dashboard()
    det_stats = anpr_svc.detection_stats()
    recent_dets = anpr_svc.list_detections(limit=15)

    return {
        **cam_dash,
        **det_stats,
        "recent_detections": recent_dets,
    }


@router.get("/cameras", response_model=list[CameraRead])
def list_cameras(
    status: Optional[str] = None,
    camera_type: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_INCIDENTS)),
):
    return CameraService(db).list_cameras(status=status, camera_type=camera_type)


@router.get("/cameras/{camera_id}", response_model=CameraRead)
def get_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_INCIDENTS)),
):
    cam = CameraService(db).get_camera(camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return cam


@router.patch("/cameras/{camera_id}/status", response_model=CameraRead)
def update_camera_status(
    camera_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.MANAGE_ALERTS)),
):
    return CameraService(db).update_status(camera_id, payload.status)


@router.get("/anpr/detections")
def list_detections(
    limit: int = 50,
    hotlist_only: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_INCIDENTS)),
):
    return ANPRService(db).list_detections(limit=limit, hotlist_only=hotlist_only)


@router.get("/anpr/hotlist", response_model=list[HotlistRead])
def list_hotlist(
    status: str = "active",
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_INCIDENTS)),
):
    return ANPRService(db).list_hotlist(status=status)


@router.post("/anpr/hotlist", response_model=HotlistRead)
def add_to_hotlist(
    payload: HotlistCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.MANAGE_ALERTS)),
):
    return ANPRService(db).add_to_hotlist(
        plate=payload.plate_number,
        reason=payload.reason,
        suspect_id=payload.suspect_id,
        fir_ref=payload.fir_reference,
        vehicle_desc=payload.vehicle_description,
        user_id=user.id,
    )


@router.delete("/anpr/hotlist/{hotlist_id}", response_model=HotlistRead)
def remove_from_hotlist(
    hotlist_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.MANAGE_ALERTS)),
):
    return ANPRService(db).remove_from_hotlist(hotlist_id)


@router.get("/anpr/alerts")
def get_anpr_alerts(
    limit: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_INCIDENTS)),
):
    return ANPRService(db).recent_alerts(limit=limit)
