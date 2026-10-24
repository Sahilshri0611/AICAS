"""ML model registry repository."""

from typing import Optional, Sequence

from sqlalchemy import desc, select

from app.models.enums import ModelStatus, ModelType
from app.models.model_registry import MLModel
from app.repositories.base import BaseRepository


class ModelRepository(BaseRepository[MLModel]):
    model = MLModel

    def list_all(self) -> Sequence[MLModel]:
        return self.db.scalars(
            select(MLModel).order_by(desc(MLModel.created_at))
        ).all()

    def active(self, model_type: ModelType) -> Optional[MLModel]:
        return self.db.scalar(
            select(MLModel).where(
                MLModel.model_type == model_type,
                MLModel.status == ModelStatus.ACTIVE,
            )
        )

    def by_type(self, model_type: ModelType) -> Sequence[MLModel]:
        return self.db.scalars(
            select(MLModel)
            .where(MLModel.model_type == model_type)
            .order_by(desc(MLModel.created_at))
        ).all()

    def next_version(self, model_type: ModelType) -> str:
        existing = self.by_type(model_type)
        return f"v{len(existing) + 1}.0"
