"""Incident map & detail endpoints (drives the Leaflet Incident Map module)."""

from datetime import datetime
from typing import Optional

from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import and_, desc, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.core.rbac import Permission
from app.models.crime import Incident
from app.models.enums import RiskLevel
from app.models.user import User
from app.repositories.incident_repo import IncidentRepository
from app.schemas.incident import (
    CaseFileRead,
    HeatPoint,
    IncidentDetail,
    IncidentFilter,
    MapMarker,
)
from app.services.area_ref import area_name
from app.services.case_file_service import CATEGORIES, CaseFileService

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _filter(search, crime_type, risk_level, district, date_from, date_to, station=None) -> IncidentFilter:
    return IncidentFilter(
        search=search, crime_type=crime_type, risk_level=risk_level,
        district=district, date_from=date_from, date_to=date_to, station=station,
    )


@router.get("/map", response_model=list[MapMarker])
def map_markers(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    limit: int = Query(3000, le=8000),
    search: Optional[str] = None,
    crime_type: Optional[str] = None,
    risk_level: Optional[RiskLevel] = None,
    district: Optional[int] = None,
    station: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
):
    f = _filter(search, crime_type, risk_level, district, date_from, date_to, station)
    rows = IncidentRepository(db).map_points(f, limit=limit)
    return [
        MapMarker(
            id=r.id, crime_id=r.crime_id, primary_type=r.primary_type,
            latitude=r.latitude, longitude=r.longitude, risk_level=r.risk_level,
            risk_score=r.risk_score, occurred_at=r.occurred_at,
            area=area_name(r.community_area),
        )
        for r in rows
    ]


@router.get("/heatmap", response_model=list[HeatPoint])
def heatmap(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    limit: int = Query(5000, le=8000),
    crime_type: Optional[str] = None,
    risk_level: Optional[RiskLevel] = None,
    district: Optional[int] = None,
    station: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
):
    f = _filter(None, crime_type, risk_level, district, date_from, date_to, station)
    rows = IncidentRepository(db).map_points(f, limit=limit)
    return [
        HeatPoint(lat=r.latitude, lon=r.longitude, intensity=round(r.risk_score, 2))
        for r in rows
    ]


@router.get("/files/categories", response_model=list[str])
def file_categories(_: User = Depends(get_current_user)):
    return list(CATEGORIES)


@router.get("/{incident_id}", response_model=IncidentDetail)
def incident_detail(
    incident_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    from app.services.incident_service import IncidentService

    return IncidentService(db).get(incident_id)


@router.get("/{incident_id}/linked", response_model=list[MapMarker])
def linked_cases(
    incident_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    limit: int = Query(20, le=100),
):
    inc = db.get(Incident, incident_id)
    if not inc:
        return []
    stmt = (
        select(Incident)
        .where(
            and_(
                Incident.id != incident_id,
                Incident.primary_type == inc.primary_type,
                Incident.community_area == inc.community_area,
            )
        )
        .order_by(desc(Incident.occurred_at))
        .limit(limit)
    )
    rows = db.scalars(stmt).all()
    return [
        MapMarker(
            id=r.id, crime_id=r.crime_id, primary_type=r.primary_type,
            latitude=r.latitude or 0.0, longitude=r.longitude or 0.0,
            risk_level=r.risk_level, risk_score=r.risk_score,
            occurred_at=r.occurred_at, area=area_name(r.community_area),
        )
        for r in rows
    ]


# ── Case files (evidence attachments) ──
@router.get("/{incident_id}/files", response_model=list[CaseFileRead])
def list_files(incident_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return CaseFileService(db).list(incident_id)


@router.post("/{incident_id}/files", response_model=list[CaseFileRead], status_code=201)
async def upload_files(
    incident_id: int,
    files: list[UploadFile] = File(...),
    category: str = Form("Evidence"),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.CREATE_INCIDENT)),
):
    return await CaseFileService(db).add(incident_id, files, user, category, description)


@router.get("/{incident_id}/files/{file_id}/download")
def download_file(
    incident_id: int,
    file_id: int,
    inline: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    svc = CaseFileService(db)
    cf = svc.get(incident_id, file_id)
    path = svc.path_for(cf)
    svc.mark_downloaded(cf)
    disposition = "inline" if inline else "attachment"
    return FileResponse(
        path,
        media_type=cf.content_type or "application/octet-stream",
        headers={"Content-Disposition": f"{disposition}; filename*=UTF-8''{quote(cf.original_filename)}"},
    )


@router.delete("/{incident_id}/files/{file_id}", status_code=204)
def delete_file(
    incident_id: int,
    file_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.EDIT_INCIDENT)),
):
    CaseFileService(db).delete(incident_id, file_id)
    return Response(status_code=204)
