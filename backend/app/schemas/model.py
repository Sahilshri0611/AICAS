"""ML model registry schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import ModelStatus, ModelType


class ModelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    name: str
    model_type: ModelType
    version: str
    algorithm: str
    status: ModelStatus
    accuracy: Optional[float]
    precision: Optional[float]
    recall: Optional[float]
    f1_score: Optional[float]
    metrics: Optional[Dict[str, Any]]
    confusion_matrix: Optional[List[List[float]]]
    class_labels: Optional[List[str]]
    feature_importances: Optional[Dict[str, float]]
    training_rows: Optional[int]
    trained_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime


class ModelTrainRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_type: ModelType = ModelType.HOTSPOT
    notes: Optional[str] = None


class ModelActionResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    message: str
    model: ModelRead
