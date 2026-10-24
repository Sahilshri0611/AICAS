"""Analytics endpoints — dashboard, hotspot intelligence & predictive analytics."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.analytics import (
    DashboardOverview,
    HotspotResponse,
    PredictiveAnalytics,
)
from app.services.analytics_service import AnalyticsService
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=DashboardOverview)
def dashboard(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return DashboardService(db).overview()


@router.get("/hotspots", response_model=HotspotResponse)
def hotspots(
    top: int = Query(10, ge=3, le=25),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return AnalyticsService(db).hotspots(top=top)


@router.get("/predictive", response_model=PredictiveAnalytics)
def predictive(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return AnalyticsService(db).predictive()
