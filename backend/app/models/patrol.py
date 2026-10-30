"""Patrol domain models: Patrol routes, waypoints, and patrol logs."""

from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.enums import PatrolPriority, PatrolShift, PatrolStatus, PatrolLogStatus


class PatrolRoute(Base, TimestampMixin):
    __tablename__ = "patrol_routes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    station_id: Mapped[int | None] = mapped_column(ForeignKey("areas.id"), index=True)
    zone: Mapped[int | None] = mapped_column(Integer, index=True)
    shift: Mapped[str] = mapped_column(String(16), default=PatrolShift.NIGHT.value)
    waypoints: Mapped[list | None] = mapped_column(JSONB)  # list of {name, latitude, longitude, risk_score, order}
    total_distance_km: Mapped[float | None] = mapped_column(Float)
    estimated_duration_min: Mapped[int | None] = mapped_column(Integer)
    priority: Mapped[str] = mapped_column(String(16), default=PatrolPriority.MEDIUM.value)
    status: Mapped[str] = mapped_column(String(16), default=PatrolStatus.ACTIVE.value, index=True)
    generated_from_model_id: Mapped[int | None] = mapped_column(ForeignKey("ml_models.id"))
    assigned_officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    notes: Mapped[str | None] = mapped_column(Text)

    logs: Mapped[list["PatrolLog"]] = relationship(
        back_populates="route", cascade="all, delete-orphan"
    )


class PatrolLog(Base, TimestampMixin):
    __tablename__ = "patrol_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    route_id: Mapped[int] = mapped_column(
        ForeignKey("patrol_routes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    waypoints_visited: Mapped[int] = mapped_column(Integer, default=0)
    incidents_reported: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default=PatrolLogStatus.PENDING.value)

    route: Mapped["PatrolRoute"] = relationship(back_populates="logs")
