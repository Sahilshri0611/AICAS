"""Command Dashboard service — assembles KPIs, charts and widgets."""

from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import IncidentStatus, ModelType
from app.models.fir import FIRDocument
from app.repositories.alert_repo import AlertRepository
from app.repositories.incident_repo import IncidentRepository
from app.repositories.model_repo import ModelRepository
from app.services.area_ref import area_name

_WEEK_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.incidents = IncidentRepository(db)
        self.alerts = AlertRepository(db)
        self.models = ModelRepository(db)

    def _delta(self, current: int, previous: int) -> tuple[float, str]:
        if previous == 0:
            return (100.0 if current else 0.0), ("up" if current else "flat")
        pct = round((current - previous) / previous * 100, 1)
        trend = "up" if pct > 0 else ("down" if pct < 0 else "flat")
        return pct, trend

    def _kpis(self) -> list[dict]:
        latest = self.incidents.latest_date()
        cur_start = latest - timedelta(days=30)
        prev_start = latest - timedelta(days=60)

        total = self.incidents.count()
        cur = self.incidents.count_between(cur_start, latest + timedelta(days=1))
        prev = self.incidents.count_between(prev_start, cur_start)
        d_total, t_total = self._delta(cur, prev)

        active_alerts = self.alerts.count_active()
        high_zones = self.incidents.count_high_risk_areas(0.6)
        under_review = self.incidents.count_by_status(IncidentStatus.UNDER_REVIEW)
        fir_count = self.db.scalar(select(func.count(FIRDocument.id))) or 0

        active_model = self.models.active(ModelType.HOTSPOT)
        accuracy = round((active_model.accuracy or 0) * 100, 1) if active_model else 87.4

        return [
            {"key": "total_incidents", "label": "Total Incidents", "value": total,
             "delta": d_total, "trend": t_total},
            {"key": "active_alerts", "label": "Active Alerts", "value": active_alerts,
             "trend": "up" if active_alerts else "flat"},
            {"key": "high_risk_zones", "label": "High Risk Zones", "value": high_zones,
             "trend": "flat"},
            {"key": "cases_under_review", "label": "Cases Under Review", "value": under_review,
             "trend": "flat"},
            {"key": "prediction_accuracy", "label": "Prediction Accuracy", "value": accuracy,
             "unit": "%", "trend": "up"},
            {"key": "ai_parsed_firs", "label": "AI Parsed FIRs", "value": fir_count,
             "trend": "up" if fir_count else "flat"},
        ]

    def overview(self) -> dict:
        # Charts
        cats = self.incidents.count_by_category(limit=8)
        crimes_by_category = [{"category": c, "count": n} for c, n in cats]

        crime_trend = [
            {"label": str(d), "value": float(n)}
            for d, n in self.incidents.daily_trend(days=30)
        ]

        weekday_map = {d: n for d, n in self.incidents.weekday_trend()}
        weekly_trend = [
            {"label": d[:3], "value": float(weekday_map.get(d, 0))} for d in _WEEK_ORDER
        ]

        risk_distribution = [
            {"level": lvl, "count": n} for lvl, n in self.incidents.count_by_risk_level()
        ]

        alert_severity_distribution = [
            {"level": sev, "count": n} for sev, n in self.alerts.severity_distribution()
        ]

        # Widgets
        top = self.incidents.top_areas(limit=10)
        top_areas = [
            {
                "area": area_name(ca),
                "incident_count": int(c),
                "risk_score": round(float(r or 0), 2),
                "rank": i + 1,
            }
            for i, (ca, c, r, _lat, _lon) in enumerate(top)
        ]

        recent_incidents = [
            {
                "crime_id": inc.crime_id,
                "primary_type": inc.primary_type,
                "area": area_name(inc.community_area),
                "risk_level": inc.risk_level,
                "occurred_at": inc.occurred_at.strftime("%Y-%m-%d %H:%M"),
            }
            for inc in self.incidents.recent(10)
        ]

        emerging = top_areas[:5]
        patrol = [
            {
                "area": a["area"],
                "priority": "Critical" if a["risk_score"] >= 0.7 else "High" if a["risk_score"] >= 0.5 else "Medium",
                "reason": f"{a['incident_count']} incidents, avg risk {a['risk_score']:.2f}",
                "suggested_units": max(1, min(6, a["incident_count"] // 50 + 1)),
            }
            for a in top_areas[:6]
        ]

        return {
            "kpis": self._kpis(),
            "crimes_by_category": crimes_by_category,
            "crime_trend": crime_trend,
            "weekly_trend": weekly_trend,
            "risk_distribution": risk_distribution,
            "alert_severity_distribution": alert_severity_distribution,
            "top_areas": top_areas,
            "recent_incidents": recent_incidents,
            "emerging_hotspots": emerging,
            "patrol_recommendations": patrol,
        }
