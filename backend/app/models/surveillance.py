"""Surveillance domain models: CCTV cameras, ANPR detections, and vehicle hotlists."""

from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.enums import CameraStatus, CameraType, HotlistStatus


class CCTVCamera(Base, TimestampMixin):
    __tablename__ = "cctv_cameras"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    camera_id: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    station_id: Mapped[int | None] = mapped_column(ForeignKey("areas.id"), index=True)
    status: Mapped[str] = mapped_column(String(16), default=CameraStatus.ONLINE.value, index=True)
    camera_type: Mapped[str] = mapped_column(String(16), default=CameraType.FIXED.value)
    resolution: Mapped[str] = mapped_column(String(16), default="1080p")
    installed_date: Mapped[datetime | None] = mapped_column(DateTime)
    stream_url: Mapped[str | None] = mapped_column(String(512))
    last_ping: Mapped[datetime | None] = mapped_column(DateTime)

    detections: Mapped[list["ANPRDetection"]] = relationship(
        back_populates="camera", cascade="all, delete-orphan"
    )


class ANPRDetection(Base, TimestampMixin):
    __tablename__ = "anpr_detections"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    camera_id: Mapped[int] = mapped_column(
        ForeignKey("cctv_cameras.id", ondelete="CASCADE"), index=True, nullable=False
    )
    plate_number: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.95)
    vehicle_make: Mapped[str | None] = mapped_column(String(64))
    vehicle_color: Mapped[str | None] = mapped_column(String(32))
    snapshot_path: Mapped[str | None] = mapped_column(String(255))
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    is_hotlist_hit: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    matched_suspect_id: Mapped[int | None] = mapped_column(ForeignKey("suspects.id"))
    alert_generated: Mapped[bool] = mapped_column(Boolean, default=False)

    camera: Mapped["CCTVCamera"] = relationship(back_populates="detections")


class VehicleHotlist(Base, TimestampMixin):
    __tablename__ = "vehicle_hotlists"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    plate_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    reason: Mapped[str] = mapped_column(String(128), nullable=False)
    suspect_id: Mapped[int | None] = mapped_column(ForeignKey("suspects.id"))
    fir_reference: Mapped[str | None] = mapped_column(String(64))
    vehicle_description: Mapped[str | None] = mapped_column(String(255))
    added_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(16), default=HotlistStatus.ACTIVE.value, index=True)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    found_at: Mapped[datetime | None] = mapped_column(DateTime)
