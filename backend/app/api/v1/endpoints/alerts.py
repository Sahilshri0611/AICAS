"""Alert management endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.core.rbac import Permission
from app.models.enums import AlertSeverity, AlertStatus
from app.models.user import User
from app.schemas.alert import (
    AlertAssign,
    AlertCreate,
    AlertNoteCreate,
    AlertRead,
)
from app.schemas.common import Page
from app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=Page[AlertRead])
def list_alerts(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    status: Optional[AlertStatus] = None,
    severity: Optional[AlertSeverity] = None,
    category: Optional[str] = None,
):
    return AlertService(db).list(status, severity, category, page, page_size)


@router.get("/dashboard")
def alert_dashboard(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return AlertService(db).dashboard()


@router.post("", response_model=AlertRead, status_code=201)
def create_alert(
    payload: AlertCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_ALERTS)),
):
    svc = AlertService(db)
    alert = svc.repo.create(**payload.model_dump())
    svc.repo.commit()
    svc.db.refresh(alert)
    return alert


@router.get("/{alert_id}", response_model=AlertRead)
def get_alert(alert_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return AlertService(db).get(alert_id)


@router.post("/{alert_id}/acknowledge", response_model=AlertRead)
def acknowledge(
    alert_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.MANAGE_ALERTS)),
):
    return AlertService(db).acknowledge(alert_id, user)


@router.post("/{alert_id}/assign", response_model=AlertRead)
def assign(
    alert_id: int,
    payload: AlertAssign,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_ALERTS)),
):
    return AlertService(db).assign(alert_id, payload.assigned_to_id)


@router.post("/{alert_id}/close", response_model=AlertRead)
def close(
    alert_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_ALERTS)),
):
    return AlertService(db).close(alert_id)


@router.post("/{alert_id}/notes", response_model=AlertRead)
def add_note(
    alert_id: int,
    payload: AlertNoteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.MANAGE_ALERTS)),
):
    return AlertService(db).add_note(alert_id, payload.body, user)
