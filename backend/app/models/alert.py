"""Alert + alert note models."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.enums import AlertCategory, AlertSeverity, AlertStatus


class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[AlertCategory] = mapped_column(String(32), index=True, nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(String(16), index=True, nullable=False)
    status: Mapped[AlertStatus] = mapped_column(String(16), default=AlertStatus.ACTIVE, index=True)

    message: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_action: Mapped[str | None] = mapped_column(Text)

    area_name: Mapped[str | None] = mapped_column(String(128), index=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)

    related_incident_id: Mapped[int | None] = mapped_column(ForeignKey("incidents.id"))
    assigned_to_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    acknowledged_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime)

    notes: Mapped[list["AlertNote"]] = relationship(
        back_populates="alert", cascade="all, delete-orphan", order_by="AlertNote.created_at"
    )


class AlertNote(Base, TimestampMixin):
    __tablename__ = "alert_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    author_name: Mapped[str | None] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text, nullable=False)

    alert: Mapped["Alert"] = relationship(back_populates="notes")
