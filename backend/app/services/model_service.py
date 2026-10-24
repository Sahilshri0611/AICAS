"""ML model management service — registry + lifecycle (train/activate/archive)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.enums import ModelStatus, ModelType
from app.models.model_registry import MLModel
from app.repositories.model_repo import ModelRepository
from app.services.ml import features, pipeline

_ALGORITHM = {
    ModelType.HOTSPOT: "XGBoost",
    ModelType.VOLUME_FORECAST: "GradientBoosting",
    ModelType.RISK_FORECAST: "GradientBoosting",
}


class ModelService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ModelRepository(db)

    def list(self) -> list[MLModel]:
        return list(self.repo.list_all())

    def get(self, model_id: int) -> MLModel:
        m = self.repo.get(model_id)
        if not m:
            raise HTTPException(status_code=404, detail="Model not found")
        return m

    def train(self, model_type: ModelType, notes: str | None = None) -> MLModel:
        df = features.load_frame(self.db)
        if df.empty:
            raise HTTPException(status_code=400, detail="No incident data to train on")

        if model_type == ModelType.HOTSPOT:
            metrics = pipeline.train_hotspot(df)
        else:
            # Forecasting models: derive regression-style quality scores.
            series = features.daily_series(df)
            fc = pipeline.forecast_volume(series, horizon=7)
            back = [p for p in fc["series"] if p["actual"] is not None]
            if back:
                errs = [abs(p["predicted"] - p["actual"]) for p in back]
                mean_actual = sum(p["actual"] for p in back) / len(back) or 1
                mape = sum(errs) / len(errs) / mean_actual
                acc = round(max(0.0, 1 - mape), 4)
            else:
                acc = 0.0
            metrics = {
                "accuracy": acc, "precision": acc, "recall": acc, "f1_score": acc,
                "confusion_matrix": None, "class_labels": None,
                "feature_importances": {"lag_features": 1.0},
                "training_rows": len(series), "metrics": {"type": "regression"},
            }

        model = MLModel(
            name=f"{model_type.value} Model",
            model_type=model_type,
            version=self.repo.next_version(model_type),
            algorithm=_ALGORITHM.get(model_type, "XGBoost"),
            status=ModelStatus.ACTIVE,
            accuracy=metrics["accuracy"],
            precision=metrics["precision"],
            recall=metrics["recall"],
            f1_score=metrics["f1_score"],
            metrics=metrics.get("metrics"),
            confusion_matrix=metrics.get("confusion_matrix"),
            class_labels=metrics.get("class_labels"),
            feature_importances=metrics.get("feature_importances"),
            training_rows=metrics.get("training_rows"),
            trained_at=datetime.now(timezone.utc),
            notes=notes,
        )
        # New active model archives the previous active of same type.
        self._archive_active(model_type)
        self.repo.add(model)
        self.repo.commit()
        self.db.refresh(model)
        return model

    def _archive_active(self, model_type: ModelType) -> None:
        current = self.repo.active(model_type)
        if current:
            current.status = ModelStatus.ARCHIVED
            self.db.flush()

    def activate(self, model_id: int) -> MLModel:
        model = self.get(model_id)
        self._archive_active(ModelType(model.model_type))
        model.status = ModelStatus.ACTIVE
        self.repo.commit()
        self.db.refresh(model)
        return model

    def archive(self, model_id: int) -> MLModel:
        model = self.get(model_id)
        model.status = ModelStatus.ARCHIVED
        self.repo.commit()
        self.db.refresh(model)
        return model
