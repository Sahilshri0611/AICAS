"""
Predictive analytics & hotspot intelligence service.

Bridges the ML pipeline and the API: loads the incident frame once, runs the
forecasters/rankers, and pulls stored metrics from the active model registry.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.enums import ModelType
from app.repositories.model_repo import ModelRepository
from app.services.ml import features, pipeline


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.models = ModelRepository(db)

    def _frame(self):
        return features.load_frame(self.db)

    def hotspots(self, top: int = 10) -> dict:
        df = self._frame()
        ranking = pipeline.hotspot_ranking(df, top=top)
        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "top_areas": ranking["top_areas"],
            "heat_points": ranking["heat_points"],
        }

    def _metrics(self) -> dict:
        active = self.models.active(ModelType.HOTSPOT)
        if active and active.accuracy is not None:
            return {
                "accuracy": active.accuracy,
                "precision": active.precision or 0.0,
                "recall": active.recall or 0.0,
                "f1_score": active.f1_score or 0.0,
            }
        # No trained model yet — train ephemerally so the screen isn't empty.
        df = self._frame()
        m = pipeline.train_hotspot(df)
        return {
            "accuracy": m["accuracy"],
            "precision": m["precision"],
            "recall": m["recall"],
            "f1_score": m["f1_score"],
        }

    def predictive(self) -> dict:
        df = self._frame()
        series = features.daily_series(df) if not df.empty else None

        volume = pipeline.forecast_volume(series, horizon=14) if series is not None else {"horizon": "14d", "series": []}
        weekly = pipeline.weekly_forecast(series) if series is not None else []
        heat = pipeline.time_heatmap(df)
        high_risk = pipeline.area_risk_forecast(df, top=10)

        return {
            "metrics": self._metrics(),
            "volume_forecast": volume,
            "weekly_forecast": weekly,
            "time_heatmap": heat,
            "high_risk_areas": high_risk,
        }
