"""ML model registry — version tracking, metrics, and lifecycle state."""

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.enums import ModelStatus, ModelType


class MLModel(Base, TimestampMixin):
    __tablename__ = "ml_models"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    model_type: Mapped[ModelType] = mapped_column(String(48), index=True, nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    algorithm: Mapped[str] = mapped_column(String(64), default="XGBoost")
    status: Mapped[ModelStatus] = mapped_column(String(16), default=ModelStatus.TRAINING, index=True)

    accuracy: Mapped[float | None] = mapped_column(Float)
    precision: Mapped[float | None] = mapped_column(Float)
    recall: Mapped[float | None] = mapped_column(Float)
    f1_score: Mapped[float | None] = mapped_column(Float)

    # Per-class metrics, confusion matrix, feature importances, class labels
    metrics: Mapped[dict | None] = mapped_column(JSONB)
    confusion_matrix: Mapped[list | None] = mapped_column(JSONB)
    class_labels: Mapped[list | None] = mapped_column(JSONB)
    feature_importances: Mapped[dict | None] = mapped_column(JSONB)

    training_rows: Mapped[int | None] = mapped_column(Integer)
    trained_at: Mapped[datetime | None] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(Text)
