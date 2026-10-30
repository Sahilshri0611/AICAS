"""Patrol route and briefing endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_permission
from app.core.rbac import Permission
from app.models.user import User
from app.schemas.patrol import PatrolBriefing, PatrolRouteRead
from app.services.patrol.route_service import PatrolRouteService

router = APIRouter(prefix="/patrol", tags=["patrol"])


class GenerateRequest(BaseModel):
    station_ids: Optional[list[int]] = None


class RouteUpdate(BaseModel):
    name: Optional[str] = None
    shift: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_officer_id: Optional[int] = None


@router.get("/routes", response_model=list[PatrolRouteRead])
def list_routes(
    station_id: Optional[int] = None,
    shift: Optional[str] = None,
    status: str = "active",
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_INCIDENTS)),
):
    return PatrolRouteService(db).list_routes(station_id=station_id, shift=shift, status=status)


@router.get("/routes/{route_id}", response_model=PatrolRouteRead)
def get_route(
    route_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_INCIDENTS)),
):
    return PatrolRouteService(db).get_route(route_id)


@router.post("/routes/generate", response_model=list[PatrolRouteRead])
def generate_routes(
    payload: Optional[GenerateRequest] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.MANAGE_MODELS)),
):
    station_ids = payload.station_ids if payload else None
    return PatrolRouteService(db).generate_routes(station_ids=station_ids)


@router.get("/briefing/{route_id}", response_model=PatrolBriefing)
def get_briefing(
    route_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_ANALYTICS)),
):
    return PatrolRouteService(db).briefing(route_id)


@router.patch("/routes/{route_id}", response_model=PatrolRouteRead)
def update_route(
    route_id: int,
    payload: RouteUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.MANAGE_MODELS)),
):
    return PatrolRouteService(db).update_route(route_id, **payload.model_dump(exclude_unset=True))
