"""Digital Evidence Vault & Physical Material Evidence (Muddayemal) endpoints."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_permission
from app.core.rbac import Permission
from app.models.crime import Incident
from app.models.evidence import MaterialEvidence
from app.models.fir import FIRDocument
from app.models.user import User
from app.schemas.evidence import (
    MaterialEvidenceCreate,
    MaterialEvidenceRead,
    MaterialEvidenceStatusUpdate,
)
from app.services.area_ref import area_name
from app.services.evidence.vault_service import EvidenceVaultService

router = APIRouter(prefix="/evidence", tags=["evidence"])


# ── Physical Material Evidence (Muddayemal / Seized Vehicles & Weapons) ──

@router.get("/material", response_model=list[MaterialEvidenceRead])
def list_material_evidence(
    item_type: Optional[str] = None,
    custody_status: Optional[str] = None,
    incident_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_INCIDENTS)),
):
    stmt = (
        select(MaterialEvidence, Incident.crime_id, Incident.community_area)
        .join(Incident, MaterialEvidence.incident_id == Incident.id)
        .order_by(desc(MaterialEvidence.created_at))
        .limit(limit)
    )

    if item_type and item_type != "all":
        stmt = stmt.where(MaterialEvidence.item_type == item_type)
    if custody_status and custody_status != "all":
        stmt = stmt.where(MaterialEvidence.custody_status == custody_status)
    if incident_id:
        stmt = stmt.where(MaterialEvidence.incident_id == incident_id)
    if search:
        s = f"%{search}%"
        stmt = stmt.where(
            or_(
                MaterialEvidence.item_name.ilike(s),
                MaterialEvidence.identifier.ilike(s),
                MaterialEvidence.seizure_memo_no.ilike(s),
                MaterialEvidence.description.ilike(s),
                Incident.crime_id.ilike(s),
            )
        )

    rows = db.execute(stmt).all()
    results = []
    for ev, c_id, comm_area in rows:
        d = MaterialEvidenceRead.model_validate(ev)
        d.crime_id = c_id
        d.police_station = area_name(comm_area)
        results.append(d)
    return results


@router.post("/material", response_model=MaterialEvidenceRead)
def create_material_evidence(
    payload: MaterialEvidenceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.EDIT_INCIDENT)),
):
    incident = db.get(Incident, payload.incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    ev = MaterialEvidence(
        incident_id=payload.incident_id,
        item_type=payload.item_type,
        item_name=payload.item_name,
        identifier=payload.identifier,
        description=payload.description,
        seizure_memo_no=payload.seizure_memo_no or f"PN-{datetime.utcnow().strftime('%Y%m%d')}-{ev_next_seq(db):04d}",
        custody_status=payload.custody_status,
        custody_location=payload.custody_location or f"{area_name(incident.community_area)} Malkhana",
        linked_suspect_id=payload.linked_suspect_id,
        seized_by_name=payload.seized_by_name or user.full_name,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)

    res = MaterialEvidenceRead.model_validate(ev)
    res.crime_id = incident.crime_id
    res.police_station = area_name(incident.community_area)
    return res


def ev_next_seq(db: Session) -> int:
    from sqlalchemy import func
    c = db.scalar(select(func.count(MaterialEvidence.id))) or 0
    return c + 1


@router.patch("/material/{evidence_id}/status", response_model=MaterialEvidenceRead)
def update_material_evidence_status(
    evidence_id: int,
    payload: MaterialEvidenceStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.EDIT_INCIDENT)),
):
    ev = db.get(MaterialEvidence, evidence_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Material evidence not found")

    ev.custody_status = payload.custody_status
    if payload.custody_location:
        ev.custody_location = payload.custody_location
    db.commit()
    db.refresh(ev)

    incident = db.get(Incident, ev.incident_id)
    res = MaterialEvidenceRead.model_validate(ev)
    if incident:
        res.crime_id = incident.crime_id
        res.police_station = area_name(incident.community_area)
    return res


# ── Digital Evidence Vault & FIR Storage ──

@router.get("/fir/{fir_id}/file")
def download_fir_file(
    fir_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_INCIDENTS)),
):
    svc = EvidenceVaultService(db)
    path = svc.get_file_path(fir_id)
    if not path or not path.is_file():
        raise HTTPException(status_code=404, detail="Original document file not found")

    fir = db.get(FIRDocument, fir_id)
    filename = fir.original_filename if fir else path.name

    return FileResponse(
        path=path,
        filename=filename,
        media_type=fir.content_type if fir and fir.content_type else "application/octet-stream",
    )


@router.get("/fir/{fir_id}/preview")
def preview_fir_file(
    fir_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_INCIDENTS)),
):
    svc = EvidenceVaultService(db)
    path = svc.get_file_path(fir_id)
    if not path or not path.is_file():
        raise HTTPException(status_code=404, detail="Original document file not found")

    fir = db.get(FIRDocument, fir_id)
    media_type = fir.content_type if fir and fir.content_type else "application/pdf"

    return FileResponse(
        path=path,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{fir.original_filename if fir else path.name}"'},
    )


@router.get("/fir/{fir_id}/verify")
def verify_fir_file(
    fir_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_INCIDENTS)),
):
    fir = db.get(FIRDocument, fir_id)
    if not fir:
        raise HTTPException(status_code=404, detail="FIR not found")
    if not fir.file_path or not fir.file_hash:
        return {
            "fir_id": fir_id,
            "has_file": False,
            "verified": False,
            "message": "No file stored for this record",
        }

    svc = EvidenceVaultService(db)
    try:
        is_valid = svc.verify_integrity(fir.file_path, fir.file_hash)
        return {
            "fir_id": fir_id,
            "has_file": True,
            "verified": is_valid,
            "file_size": fir.file_size,
            "file_hash": fir.file_hash,
            "message": "SHA-256 integrity verified. Document unaltered." if is_valid else "HASH MISMATCH! Document may have been modified.",
        }
    except Exception as e:
        return {
            "fir_id": fir_id,
            "has_file": True,
            "verified": False,
            "message": f"Verification error: {e}",
        }


@router.get("/fir/{fir_id}/custody")
def get_chain_of_custody(
    fir_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.VIEW_INCIDENTS)),
):
    svc = EvidenceVaultService(db)
    events = svc.chain_of_custody(fir_id)
    return {
        "fir_id": fir_id,
        "timeline": events,
    }
