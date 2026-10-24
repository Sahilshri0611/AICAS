"""Dashboard, analytics, hotspot & prediction schemas."""

from typing import List, Optional

from pydantic import BaseModel


# ── Dashboard ──
class KpiCard(BaseModel):
    key: str
    label: str
    value: float
    unit: Optional[str] = None
    delta: Optional[float] = None          # % change vs previous period
    trend: Optional[str] = None            # "up" | "down" | "flat"


class CategoryCount(BaseModel):
    category: str
    count: int


class TrendPoint(BaseModel):
    label: str
    value: float


class RiskBucket(BaseModel):
    level: str
    count: int


class TopArea(BaseModel):
    area: str
    incident_count: int
    risk_score: float
    rank: int


class RecentIncident(BaseModel):
    crime_id: str
    primary_type: str
    area: Optional[str]
    risk_level: str
    occurred_at: str


class PatrolRecommendation(BaseModel):
    area: str
    priority: str
    reason: str
    suggested_units: int


class DashboardOverview(BaseModel):
    kpis: List[KpiCard]
    crimes_by_category: List[CategoryCount]
    crime_trend: List[TrendPoint]
    weekly_trend: List[TrendPoint]
    risk_distribution: List[RiskBucket]
    alert_severity_distribution: List[RiskBucket]
    top_areas: List[TopArea]
    recent_incidents: List[RecentIncident]
    emerging_hotspots: List[TopArea]
    patrol_recommendations: List[PatrolRecommendation]


# ── Hotspots ──
class HotspotArea(BaseModel):
    area: str
    community_area: Optional[int]
    district: Optional[int]
    latitude: Optional[float]
    longitude: Optional[float]
    incident_count: int
    hotspot_score: float
    risk_index: float
    rank: int
    predicted_next: Optional[float] = None   # predicted incidents next period
    change_pct: Optional[float] = None        # vs historical


class HotspotResponse(BaseModel):
    generated_at: str
    top_areas: List[HotspotArea]
    heat_points: List[dict]


# ── Predictive analytics ──
class ForecastPoint(BaseModel):
    label: str
    predicted: float
    lower: float
    upper: float
    actual: Optional[float] = None


class VolumeForecast(BaseModel):
    horizon: str
    series: List[ForecastPoint]


class TimeHeatCell(BaseModel):
    day: str
    hour: int
    value: float


class PredictionMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float


class AreaRiskForecast(BaseModel):
    area: str
    current_risk: float
    predicted_risk: float
    confidence: float


class PredictiveAnalytics(BaseModel):
    metrics: PredictionMetrics
    volume_forecast: VolumeForecast
    weekly_forecast: List[ForecastPoint]
    time_heatmap: List[TimeHeatCell]
    high_risk_areas: List[AreaRiskForecast]
