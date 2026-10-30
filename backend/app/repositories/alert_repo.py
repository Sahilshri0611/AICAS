"""Alert repository."""

from datetime import datetime, timedelta
from typing import Optional, Sequence

from sqlalchemy import and_, desc, func, select

from app.models.alert import Alert, AlertNote
from app.models.enums import AlertSeverity, AlertStatus
from app.repositories.base import BaseRepository

_SEVERITY_ORDER = {
    AlertSeverity.CRITICAL: 0,
    AlertSeverity.HIGH: 1,
    AlertSeverity.MEDIUM: 2,
    AlertSeverity.LOW: 3,
}


class AlertRepository(BaseRepository[Alert]):
    model = Alert

    def query(
        self,
        status: Optional[AlertStatus] = None,
        severity: Optional[AlertSeverity] = None,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[Sequence[Alert], int]:
        conds = []
        if status:
            conds.append(Alert.status == status)
        if severity:
            conds.append(Alert.severity == severity)
        if category:
            conds.append(Alert.category == category)

        count_stmt = select(func.count(Alert.id))
        stmt = select(Alert)
        if conds:
            count_stmt = count_stmt.where(and_(*conds))
            stmt = stmt.where(and_(*conds))

        total = self.db.scalar(count_stmt) or 0
        rows = self.db.scalars(
            stmt.order_by(desc(Alert.created_at)).offset(skip).limit(limit)
        ).all()
        # Sort by severity then recency for display priority
        rows = sorted(
            rows, key=lambda a: (_SEVERITY_ORDER.get(a.severity, 9), -a.id)
        )
        return rows, total

    def add_note(self, alert: Alert, author_id: int | None, author_name: str | None, body: str) -> AlertNote:
        note = AlertNote(
            alert_id=alert.id, author_id=author_id, author_name=author_name, body=body
        )
        self.db.add(note)
        self.db.flush()
        return note

    def count_active(self) -> int:
        return self.db.scalar(
            select(func.count(Alert.id)).where(Alert.status == AlertStatus.ACTIVE)
        ) or 0

    def severity_distribution(self):
        stmt = (
            select(Alert.severity, func.count(Alert.id))
            .where(Alert.status != AlertStatus.CLOSED)
            .group_by(Alert.severity)
        )
        return self.db.execute(stmt).all()

    def daily_trend(self, days: int = 7):
        now = datetime.utcnow().date()
        date_map = {(now - timedelta(days=i)): 0 for i in range(days - 1, -1, -1)}
        since = datetime.utcnow() - timedelta(days=days)
        day = func.date(Alert.created_at)
        stmt = (
            select(day.label("d"), func.count(Alert.id))
            .where(Alert.created_at >= since)
            .group_by("d")
            .order_by("d")
        )
        for row in self.db.execute(stmt).all():
            d_val = row[0]
            if isinstance(d_val, str):
                d_val = datetime.strptime(d_val, "%Y-%m-%d").date()
            elif hasattr(d_val, "date"):
                d_val = d_val.date()
            if d_val in date_map:
                date_map[d_val] = row[1]
        return [(d, date_map[d]) for d in sorted(date_map.keys())]
