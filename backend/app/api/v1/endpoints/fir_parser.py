"""FIR OCR & AI parsing endpoints."""

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_permission
from app.core.rbac import Permission
from app.models.user import User
from app.schemas.fir import FIRApprove, FIRParseResult, FIRRead, FIRTextParseRequest
from app.services.fir_service import FIRService

router = APIRouter(prefix="/fir-parser", tags=["fir-parser"])

_MAX_BYTES = 15 * 1024 * 1024  # 15 MB


@router.get("/queue", response_model=list[FIRRead])
def queue(db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.PARSE_FIR))):
    return FIRService(db).recent(50)


@router.get("/next-id")
def next_crime_id(db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.PARSE_FIR))):
    return {"crime_id": FIRService(db).preview_crime_id()}


@router.post("/upload", response_model=FIRParseResult)
async def upload_fir(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.PARSE_FIR)),
):
    content = await file.read()
    if len(content) > _MAX_BYTES:
        from fastapi import HTTPException

        raise HTTPException(status_code=413, detail="File too large (max 15 MB)")
    svc = FIRService(db)
    fir = svc.parse_upload(content, file.filename, file.content_type or "", user.id)
    return FIRParseResult(fir=FIRRead.model_validate(fir), generated_crime_id=svc.preview_crime_id())


@router.post("/parse-text", response_model=FIRParseResult)
def parse_text(
    payload: FIRTextParseRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.PARSE_FIR)),
):
    svc = FIRService(db)
    fir = svc.parse_text(payload.text, payload.filename, user.id)
    return FIRParseResult(fir=FIRRead.model_validate(fir), generated_crime_id=svc.preview_crime_id())


@router.get("/{fir_id}", response_model=FIRRead)
def get_fir(fir_id: int, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.PARSE_FIR))):
    return FIRService(db).get(fir_id)


@router.post("/{fir_id}/approve", response_model=FIRRead)
def approve_fir(
    fir_id: int,
    payload: FIRApprove,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.PARSE_FIR)),
):
    return FIRService(db).approve(fir_id, payload.overrides, user.id)
