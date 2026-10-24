"""Alert management service."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.enums import AlertStatus
from app.models.user import User
from app.repositories.alert_repo import AlertRepository
from app.schemas.common import build_page


class AlertService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AlertRepository(db)

    def list(self, status=None, severity=None, category=None, page=1, page_size=25) -> dict:
        skip = (page - 1) * page_size
        rows, total = self.repo.query(status, severity, category, skip, page_size)
        return build_page(list(rows), total, page, page_size)

    def get(self, alert_id: int) -> Alert:
        alert = self.repo.get(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        return alert

    def acknowledge(self, alert_id: int, user: User) -> Alert:
        alert = self.get(alert_id)
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_by_id = user.id
        alert.acknowledged_at = datetime.now(timezone.utc)
        self.repo.commit()
        self.db.refresh(alert)
        return alert

    def assign(self, alert_id: int, assignee_id: int) -> Alert:
        alert = self.get(alert_id)
        alert.assigned_to_id = assignee_id
        alert.status = AlertStatus.ASSIGNED
        self.repo.commit()
        self.db.refresh(alert)
        return alert

    def close(self, alert_id: int) -> Alert:
        alert = self.get(alert_id)
        alert.status = AlertStatus.CLOSED
        alert.closed_at = datetime.now(timezone.utc)
        self.repo.commit()
        self.db.refresh(alert)
        return alert

    def add_note(self, alert_id: int, body: str, user: Optional[User]) -> Alert:
        alert = self.get(alert_id)
        self.repo.add_note(
            alert,
            author_id=user.id if user else None,
            author_name=user.full_name if user else None,
            body=body,
        )
        self.repo.commit()
        self.db.refresh(alert)
        return alert

    def dashboard(self) -> dict:
        severity = [{"level": s, "count": n} for s, n in self.repo.severity_distribution()]
        trend = [{"label": str(d), "value": float(n)} for d, n in self.repo.daily_trend(7)]
        return {
            "active_count": self.repo.count_active(),
            "severity_distribution": severity,
            "trend": trend,
        }
