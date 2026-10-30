"""Incident repository — querying, filtering, pagination and aggregations."""

from datetime import datetime, timedelta
from typing import Optional, Sequence

from sqlalchemy import Integer, Select, and_, asc, cast, desc, func, or_, select

from app.models.crime import Area, Incident
from app.models.enums import IncidentStatus, RiskLevel
from app.repositories.base import BaseRepository
from app.schemas.incident import IncidentFilter


class IncidentRepository(BaseRepository[Incident]):
    model = Incident

    # ── Filtering ──
    def _apply_filters(self, stmt: Select, f: IncidentFilter) -> Select:
        conds = []
        if f.search:
            like = f"%{f.search}%"
            conds.append(
                or_(
                    Incident.crime_id.ilike(like),
                    Incident.case_number.ilike(like),
                    Incident.primary_type.ilike(like),
                    Incident.block.ilike(like),
                    Incident.location_description.ilike(like),
                    Incident.description.ilike(like),
                )
            )
        if f.crime_type:
            conds.append(Incident.primary_type == f.crime_type)
        if f.risk_level:
            conds.append(Incident.risk_level == f.risk_level)
        if f.status:
            conds.append(Incident.status == f.status)
        if f.district is not None:
            conds.append(Incident.district == f.district)
        if f.station is not None:
            conds.append(Incident.community_area == f.station)
        if f.date_from:
            conds.append(Incident.occurred_at >= f.date_from)
        if f.date_to:
            conds.append(Incident.occurred_at <= f.date_to)
        if f.min_risk is not None:
            conds.append(Incident.risk_score >= f.min_risk)
        if conds:
            stmt = stmt.where(and_(*conds))
        return stmt

    def query(
        self, f: IncidentFilter, skip: int, limit: int, order_by: str = "occurred_at"
    ) -> tuple[Sequence[Incident], int]:
        base = self._apply_filters(select(Incident), f)
        total = self.db.scalar(
            self._apply_filters(select(func.count(Incident.id)), f)
        ) or 0

        is_asc = order_by.startswith("+") or order_by.endswith("_asc")
        clean_col = order_by.lstrip("+-").removesuffix("_asc").removesuffix("_desc")
        order_col = {
            "occurred_at": Incident.occurred_at,
            "risk_score": Incident.risk_score,
            "primary_type": Incident.primary_type,
            "crime_id": Incident.crime_id,
            "police_station": Incident.police_station,
        }.get(clean_col, Incident.occurred_at)

        sorter = asc(order_col) if is_asc else desc(order_col)
        stmt = base.order_by(sorter).offset(skip).limit(limit)
        rows = self.db.scalars(stmt).all()
        return rows, total

    def get_by_crime_id(self, crime_id: str) -> Optional[Incident]:
        return self.db.scalar(select(Incident).where(Incident.crime_id == crime_id))

    def max_crime_seq(self) -> int:
        """Highest numeric suffix of existing CS-xxxxx ids (for id generation).

        Uses the numeric max rather than the last-inserted row: seeded data is
        inserted in random order, so the newest row isn't the highest id.
        """
        seq = self.db.scalar(
            select(func.max(cast(func.substr(Incident.crime_id, 4), Integer)))
            .where(Incident.crime_id.op("~")(r"^CS-[0-9]+$"))
        )
        return int(seq or 0)

    # ── Aggregations for dashboards / analytics ──
    def crime_types(self) -> list[str]:
        rows = self.db.scalars(
            select(Incident.primary_type).distinct().order_by(Incident.primary_type)
        ).all()
        return list(rows)

    def count_by_category(self, limit: int = 10, since: Optional[datetime] = None):
        stmt = select(Incident.primary_type, func.count(Incident.id).label("c"))
        if since:
            stmt = stmt.where(Incident.occurred_at >= since)
        stmt = stmt.group_by(Incident.primary_type).order_by(desc("c")).limit(limit)
        return self.db.execute(stmt).all()

    def count_by_risk_level(self):
        stmt = select(Incident.risk_level, func.count(Incident.id)).group_by(
            Incident.risk_level
        )
        return self.db.execute(stmt).all()

    def daily_trend(self, days: int = 30):
        since = self._max_date() - timedelta(days=days)
        day = func.date(Incident.occurred_at)
        stmt = (
            select(day.label("d"), func.count(Incident.id).label("c"))
            .where(Incident.occurred_at >= since)
            .group_by("d")
            .order_by("d")
        )
        return self.db.execute(stmt).all()

    def weekday_trend(self):
        stmt = select(Incident.day_of_week, func.count(Incident.id)).group_by(
            Incident.day_of_week
        )
        return self.db.execute(stmt).all()

    def hourly_by_weekday(self):
        stmt = select(
            Incident.day_of_week, Incident.hour, func.count(Incident.id)
        ).group_by(Incident.day_of_week, Incident.hour)
        return self.db.execute(stmt).all()

    def top_areas(self, limit: int = 10):
        stmt = (
            select(
                Incident.community_area,
                func.count(Incident.id).label("c"),
                func.avg(Incident.risk_score).label("r"),
                func.avg(Incident.latitude),
                func.avg(Incident.longitude),
            )
            .where(Incident.community_area.isnot(None))
            .group_by(Incident.community_area)
            .order_by(desc("c"))
            .limit(limit)
        )
        return self.db.execute(stmt).all()

    def recent(self, limit: int = 10) -> Sequence[Incident]:
        return self.db.scalars(
            select(Incident).order_by(desc(Incident.occurred_at)).limit(limit)
        ).all()

    def map_points(self, f: IncidentFilter, limit: int = 3000) -> Sequence[Incident]:
        stmt = self._apply_filters(
            select(Incident).where(
                Incident.latitude.isnot(None), Incident.longitude.isnot(None)
            ),
            f,
        ).order_by(desc(Incident.occurred_at)).limit(limit)
        return self.db.scalars(stmt).all()

    def all_for_ml(self, limit: int = 50000):
        stmt = select(
            Incident.primary_type,
            Incident.community_area,
            Incident.district,
            Incident.latitude,
            Incident.longitude,
            Incident.hour,
            Incident.day_of_week,
            Incident.month,
            Incident.occurred_at,
            Incident.risk_score,
            Incident.arrest,
            Incident.domestic,
        ).limit(limit)
        return self.db.execute(stmt).all()

    def _max_date(self) -> datetime:
        return self.db.scalar(select(func.max(Incident.occurred_at))) or datetime.utcnow()

    def count_since(self, since: datetime) -> int:
        return self.db.scalar(
            select(func.count(Incident.id)).where(Incident.occurred_at >= since)
        ) or 0

    def count_between(self, start: datetime, end: datetime) -> int:
        return self.db.scalar(
            select(func.count(Incident.id)).where(
                Incident.occurred_at >= start, Incident.occurred_at < end
            )
        ) or 0

    def count_by_status(self, status: IncidentStatus) -> int:
        return self.db.scalar(
            select(func.count(Incident.id)).where(Incident.status == status)
        ) or 0

    def count_high_risk_areas(self, threshold: float = 0.6) -> int:
        """Stations whose hotspot score (60% relative volume + 40% avg risk —
        same formula as the Hotspot Intelligence ranking) meets `threshold`."""
        rows = self.db.execute(
            select(func.count(Incident.id), func.avg(Incident.risk_score))
            .where(Incident.community_area.isnot(None))
            .group_by(Incident.community_area)
        ).all()
        if not rows:
            return 0
        max_c = max(c for c, _ in rows) or 1
        return sum(1 for c, r in rows if (c / max_c) * 0.6 + float(r or 0) * 0.4 >= threshold)

    def latest_date(self) -> datetime:
        return self._max_date()
