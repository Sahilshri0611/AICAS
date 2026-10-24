"""Suspect / incident network analysis endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_permission
from app.core.rbac import Permission
from app.models.user import User
from app.schemas.network import NetworkGraph
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
