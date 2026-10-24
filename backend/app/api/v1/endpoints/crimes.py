"""Crime records endpoints — the searchable/filterable data grid + export."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.core.rbac import Permission
from app.models.enums import IncidentStatus, RiskLevel
from app.models.user import User
from app.repositories.incident_repo import IncidentRepository
from app.schemas.common import Page
from app.schemas.incident import (
    ImportResult,
    IncidentCreate,
    IncidentDetail,
    IncidentFilter,
    IncidentRead,
    IncidentUpdate,
)
from app.services import import_service
from app.services.export_service import to_csv, to_excel
from app.services.incident_service import IncidentService

router = APIRouter(prefix="/crimes", tags=["crimes"])


def _filter(
    search: Optional[str],
    crime_type: Optional[str],
    risk_level: Optional[RiskLevel],
    status: Optional[IncidentStatus],
    district: Optional[int],
    date_from: Optional[datetime],
    date_to: Optional[datetime],
    min_risk: Optional[float],
    station: Optional[int] = None,
) -> IncidentFilter:
    return IncidentFilter(
        search=search, crime_type=crime_type, risk_level=risk_level, status=status,
        district=district, date_from=date_from, date_to=date_to, min_risk=min_risk,
        station=station,
    )


@router.get("", response_model=Page[IncidentRead])
def list_crimes(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    order_by: str = Query("occurred_at"),
    search: Optional[str] = None,
    crime_type: Optional[str] = None,
    risk_level: Optional[RiskLevel] = None,
    status: Optional[IncidentStatus] = None,
    district: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    min_risk: Optional[float] = None,
    station: Optional[int] = None,
):
    f = _filter(search, crime_type, risk_level, status, district, date_from, date_to, min_risk, station)
    return IncidentService(db).list(f, page, page_size, order_by)


@router.get("/types", response_model=list[str])
def crime_types(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return IncidentService(db).crime_types()


@router.get("/export")
def export(
    fmt: str = Query("csv", pattern="^(csv|excel)$"),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.EXPORT_RECORDS)),
    search: Optional[str] = None,
    crime_type: Optional[str] = None,
    risk_level: Optional[RiskLevel] = None,
    status: Optional[IncidentStatus] = None,
    district: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    min_risk: Optional[float] = None,
    station: Optional[int] = None,
):
    f = _filter(search, crime_type, risk_level, status, district, date_from, date_to, min_risk, station)
    rows, _total = IncidentRepository(db).query(f, skip=0, limit=10000, order_by="occurred_at")
    if fmt == "excel":
        data = to_excel(rows)
        return Response(
            content=data,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=crime_records.xlsx"},
        )
    data = to_csv(rows)
    return Response(
        content=data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=crime_records.csv"},
    )


@router.get("/import/template")
def import_template(_: User = Depends(get_current_user)):
    return Response(
        content=import_service.template_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=nagpur_case_import_template.csv"},
    )


@router.post("/import", response_model=ImportResult)
async def import_cases(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.CREATE_INCIDENT)),
):
    """Bulk-create cases from a CSV / Excel file (see /crimes/import/template)."""
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Import file too large (max 10 MB)")
    return import_service.import_cases(db, content, file.filename or "upload.csv")


@router.get("/{crime_id}", response_model=IncidentRead)
def get_crime(crime_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return IncidentService(db).get_by_crime_id(crime_id)


@router.post("", response_model=IncidentDetail, status_code=201)
def create_crime(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.CREATE_INCIDENT)),
):
    return IncidentService(db).create(payload, source="manual")


@router.patch("/{incident_id}", response_model=IncidentRead)
def update_crime(
    incident_id: int,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.EDIT_INCIDENT)),
):
    return IncidentService(db).update(incident_id, payload)


@router.delete("/{incident_id}", status_code=204)
def delete_crime(
    incident_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.DELETE_INCIDENT)),
):
    IncidentService(db).delete(incident_id)
    return Response(status_code=204)
