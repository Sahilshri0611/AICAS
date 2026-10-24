"""
Core crime-domain models: Incident (the central crime record), Area
(geographic aggregation unit used for hotspots/analytics), and Suspect.

Nagpur mapping (see services/area_ref.py): `community_area` holds the police
station id and `district` holds the police zone number.

Geography is stored with PostGIS: every incident and area carries a
`geom` Point(4326) column alongside plain lat/lon floats for convenience.
"""

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Column,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.enums import IncidentStatus, RiskLevel

# ── Many-to-many: incident <-> suspect ──
incident_suspect = Table(
    "incident_suspect",
    Base.metadata,
    Column("incident_id", ForeignKey("incidents.id", ondelete="CASCADE"), primary_key=True),
    Column("suspect_id", ForeignKey("suspects.id", ondelete="CASCADE"), primary_key=True),
)


class Area(Base, TimestampMixin):
    """A police-station jurisdiction (Nagpur City Police) used for hotspot analytics."""

    __tablename__ = "areas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    community_area: Mapped[int | None] = mapped_column(Integer, index=True)  # police station id
    district: Mapped[int | None] = mapped_column(Integer, index=True)        # police zone
    centroid_lat: Mapped[float | None] = mapped_column(Float)
    centroid_lon: Mapped[float | None] = mapped_column(Float)
    if settings.USE_POSTGIS:
        geom = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=True)

    # Denormalized analytics fields (refreshed by services)
    incident_count: Mapped[int] = mapped_column(Integer, default=0)
    hotspot_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_index: Mapped[float] = mapped_column(Float, default=0.0)

    incidents: Mapped[list["Incident"]] = relationship(back_populates="area")


class Suspect(Base, TimestampMixin):
    __tablename__ = "suspects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    alias: Mapped[str | None] = mapped_column(String(255))
    gender: Mapped[str | None] = mapped_column(String(16))
    age: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    vehicle: Mapped[str | None] = mapped_column(String(255), index=True)

    incidents: Mapped[list["Incident"]] = relationship(
        secondary=incident_suspect, back_populates="suspects"
    )


class Incident(Base, TimestampMixin):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    crime_id: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    case_number: Mapped[str | None] = mapped_column(String(64), index=True)

    primary_type: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    location_description: Mapped[str | None] = mapped_column(String(255))
    block: Mapped[str | None] = mapped_column(String(255))

    latitude: Mapped[float | None] = mapped_column(Float, index=True)
    longitude: Mapped[float | None] = mapped_column(Float, index=True)
    if settings.USE_POSTGIS:
        geom = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=True)

    area_id: Mapped[int | None] = mapped_column(ForeignKey("areas.id"), index=True)
    community_area: Mapped[int | None] = mapped_column(Integer, index=True)  # police station id
    district: Mapped[int | None] = mapped_column(Integer, index=True)        # police zone
    ward: Mapped[int | None] = mapped_column(Integer)
    beat: Mapped[int | None] = mapped_column(Integer)

    occurred_at: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    hour: Mapped[int | None] = mapped_column(Integer, index=True)
    day_of_week: Mapped[str | None] = mapped_column(String(16), index=True)
    month: Mapped[int | None] = mapped_column(Integer, index=True)
    year: Mapped[int | None] = mapped_column(Integer, index=True)

    risk_score: Mapped[float] = mapped_column(Float, default=0.0, index=True)
    risk_level: Mapped[RiskLevel] = mapped_column(String(16), default=RiskLevel.LOW, index=True)
    status: Mapped[IncidentStatus] = mapped_column(
        String(24), default=IncidentStatus.OPEN, index=True
    )

    arrest: Mapped[bool] = mapped_column(Boolean, default=False)
    domestic: Mapped[bool] = mapped_column(Boolean, default=False)

    # Provenance
    source: Mapped[str] = mapped_column(String(16), default="seed")  # seed|fir|manual
    # use_alter breaks the mutual incidents<->fir_documents FK cycle at create_all time
    fir_id: Mapped[int | None] = mapped_column(
        ForeignKey("fir_documents.id", use_alter=True, name="fk_incidents_fir_id"), index=True
    )
    assigned_to_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    summary: Mapped[str | None] = mapped_column(Text)

    # Relationships
    area: Mapped["Area"] = relationship(back_populates="incidents")
    suspects: Mapped[list["Suspect"]] = relationship(
        secondary=incident_suspect, back_populates="incidents"
    )

    __table_args__ = (
        Index("ix_incidents_type_date", "primary_type", "occurred_at"),
        Index("ix_incidents_geo", "latitude", "longitude"),
    )

    files: Mapped[list["CaseFile"]] = relationship(  # noqa: F821
        "CaseFile", cascade="all, delete-orphan", passive_deletes=True,
        order_by="CaseFile.created_at",
    )

    @property
    def police_station(self) -> str | None:
        from app.services.area_ref import area_name
        return area_name(self.community_area) if self.community_area else None

    @property
    def zone_name(self) -> str | None:
        from app.services.area_ref import zone_name
        return zone_name(self.district)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Incident {self.crime_id} {self.primary_type}>"
