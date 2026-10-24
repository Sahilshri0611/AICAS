"""ML model management endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.core.rbac import Permission
from app.models.user import User
from app.schemas.model import (
    ModelActionResult,
    ModelRead,
    ModelTrainRequest,
)
from app.services.model_service import ModelService

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=list[ModelRead])
def list_models(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return ModelService(db).list()


@router.get("/{model_id}", response_model=ModelRead)
def get_model(model_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return ModelService(db).get(model_id)


@router.post("/retrain", response_model=ModelActionResult)
def retrain(
    payload: ModelTrainRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_MODELS)),
):
    model = ModelService(db).train(payload.model_type, payload.notes)
    return ModelActionResult(message=f"Trained {model.name} {model.version}", model=model)


@router.post("/{model_id}/activate", response_model=ModelActionResult)
def activate(
    model_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_MODELS)),
):
    model = ModelService(db).activate(model_id)
    return ModelActionResult(message=f"Activated {model.name} {model.version}", model=model)


@router.post("/{model_id}/archive", response_model=ModelActionResult)
def archive(
    model_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_MODELS)),
):
    model = ModelService(db).archive(model_id)
    return ModelActionResult(message=f"Archived {model.name} {model.version}", model=model)
