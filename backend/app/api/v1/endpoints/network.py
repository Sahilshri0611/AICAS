"""Suspect / incident network analysis endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_permission
from app.core.rbac import Permission
from app.models.user import User
from app.schemas.network import NetworkGraph, PathResult, SuspectDossier
from app.services.network_service import NetworkService

router = APIRouter(prefix="/network", tags=["network"])


@router.get("/graph", response_model=NetworkGraph)
def graph(
    limit: int = Query(250, ge=20, le=1000),
    similar_mo: bool = Query(True),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.VIEW_NETWORK)),
):
    return NetworkService(db).build(limit=limit, similar_mo=similar_mo)


@router.get("/suspect/{suspect_id}/dossier", response_model=SuspectDossier)
def suspect_dossier(
    suspect_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.VIEW_NETWORK)),
):
    return NetworkService(db).dossier(suspect_id)


@router.get("/path", response_model=PathResult)
def find_path(
    source: str = Query(..., description="Node ID, e.g. S:12 or I:CR-2026-0001"),
    target: str = Query(..., description="Node ID, e.g. S:45"),
    limit: int = Query(250, ge=20, le=1000),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.VIEW_NETWORK)),
):
    return NetworkService(db).find_path(source, target, limit=limit)
