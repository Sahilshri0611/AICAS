"""Incident (crime record) service — business logic over the repository."""

from __future__ import annotations

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.crime import Area, Incident, Suspect
from app.repositories.incident_repo import IncidentRepository
from app.schemas.common import build_page
from app.schemas.incident import (
    IncidentCreate,
    IncidentFilter,
    IncidentUpdate,
)
from app.services import area_ref
from app.services.crime_catalog import normalize_crime_type
from app.services.risk import compute_risk_score, risk_level_for


class IncidentService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = IncidentRepository(db)

    # ── ID generation ──
    def _next_crime_id(self) -> str:
        return f"CS-{self.repo.max_crime_seq() + 1:05d}"

    # ── Geography resolution ──
    def _area_id(self, station_id: Optional[int]) -> Optional[int]:
        if station_id is None:
            return None
        return self.db.scalar(select(Area.id).where(Area.community_area == station_id))

    def resolve_location(
        self,
        station_id: Optional[int],
        latitude: Optional[float],
        longitude: Optional[float],
        locality: Optional[str] = None,
        address: Optional[str] = None,
    ) -> tuple[Optional[int], Optional[float], Optional[float]]:
        """Fill whichever of station / coordinates is missing.

        Priority: explicit coords → locality match → station centroid; and the
        station is inferred from coords or locality text when not given.
        """
        if station_id is not None and station_id not in area_ref.POLICE_STATIONS:
            raise HTTPException(status_code=422, detail=f"Unknown police station id {station_id}")
        if (latitude is None) != (longitude is None):
            raise HTTPException(status_code=422, detail="Provide both latitude and longitude, or neither")
        if latitude is not None and not area_ref.in_city(latitude, longitude):
            raise HTTPException(
                status_code=422,
                detail=f"Coordinates ({latitude}, {longitude}) are outside the {area_ref.CITY_NAME} city limits",
            )

        match = area_ref.find_locality(locality) or area_ref.find_locality(address)
        if latitude is None:
            if match and (station_id is None or match[0].id == station_id):
                latitude, longitude = match[1].lat, match[1].lon
            elif station_id is not None:
                latitude, longitude = area_ref.area_centroid(station_id)  # type: ignore[misc]
        if station_id is None:
            if match:
                station_id = match[0].id
            elif latitude is not None:
                station_id = area_ref.nearest_station(latitude, longitude).id  # type: ignore[arg-type]
        return station_id, latitude, longitude

    # ── CRUD ──
    def build(self, data: IncidentCreate, source: str = "manual", crime_id: Optional[str] = None) -> Incident:
        """Construct (but don't commit) an Incident from a create payload."""
        station_id, lat, lon = self.resolve_location(
            data.community_area, data.latitude, data.longitude, data.locality, data.block
        )
        crime_type = normalize_crime_type(data.primary_type)
        score = compute_risk_score(crime_type, data.occurred_at, data.domestic)
        incident = Incident(
            crime_id=crime_id or self._next_crime_id(),
            case_number=(data.case_number or None),
            primary_type=crime_type,
            description=data.description,
            location_description=data.location_description,
            block=data.block or data.locality,
            latitude=lat,
            longitude=lon,
            area_id=self._area_id(station_id),
            community_area=station_id,
            district=area_ref.zone_for_station(station_id) if station_id else data.district,
            ward=data.ward,
            beat=data.beat,
            occurred_at=data.occurred_at,
            hour=data.occurred_at.hour,
            day_of_week=data.occurred_at.strftime("%A"),
            month=data.occurred_at.month,
            year=data.occurred_at.year,
            risk_score=score,
            risk_level=risk_level_for(score),
            status=data.status,
            arrest=data.arrest,
            domestic=data.domestic,
            summary=data.summary,
            source=source,
        )
        if settings.USE_POSTGIS and lat is not None and lon is not None:
            incident.geom = f"SRID=4326;POINT({lon} {lat})"
        for s in data.suspects:
            incident.suspects.append(Suspect(**s.model_dump()))
        return incident

    def create(self, data: IncidentCreate, source: str = "manual") -> Incident:
        incident = self.build(data, source)
        self.repo.add(incident)
        self.repo.commit()
        refresh_area_stats(self.db, [incident.community_area])
        self.db.refresh(incident)
        return incident

    def get(self, incident_id: int) -> Incident:
        inc = self.repo.get(incident_id)
        if not inc:
            raise HTTPException(status_code=404, detail="Incident not found")
        return inc

    def get_by_crime_id(self, crime_id: str) -> Incident:
        inc = self.repo.get_by_crime_id(crime_id)
        if not inc:
            raise HTTPException(status_code=404, detail="Incident not found")
        return inc

    def update(self, incident_id: int, data: IncidentUpdate) -> Incident:
        inc = self.get(incident_id)
        payload = data.model_dump(exclude_unset=True)
        if payload.get("primary_type"):
            payload["primary_type"] = normalize_crime_type(payload["primary_type"])
        for k, v in payload.items():
            setattr(inc, k, v)
        if "risk_score" in payload and payload["risk_score"] is not None:
            inc.risk_level = risk_level_for(payload["risk_score"])
        elif "primary_type" in payload:
            inc.risk_score = compute_risk_score(inc.primary_type, inc.occurred_at, inc.domestic)
            inc.risk_level = risk_level_for(inc.risk_score)
        self.repo.commit()
        self.db.refresh(inc)
        return inc

    def delete(self, incident_id: int) -> None:
        from app.services.case_file_service import CaseFileService

        inc = self.get(incident_id)
        station = inc.community_area
        CaseFileService(self.db).remove_stored_files(inc)
        self.repo.delete(inc)
        self.repo.commit()
        refresh_area_stats(self.db, [station])

    # ── Listing ──
    def list(
        self,
        f: IncidentFilter,
        page: int = 1,
        page_size: int = 25,
        order_by: str = "occurred_at",
    ) -> dict:
        skip = (page - 1) * page_size
        rows, total = self.repo.query(f, skip, page_size, order_by)
        return build_page(list(rows), total, page, page_size)

    def crime_types(self) -> list[str]:
        return self.repo.crime_types()


def refresh_area_stats(db: Session, station_ids: Optional[list[Optional[int]]] = None) -> None:
    """Recompute the denormalised per-station aggregates on `areas`.

    Pass station ids to limit the update; the hotspot score is always relative
    to the busiest station, so it's normalised against the global max.
    """
    ids = [s for s in (station_ids or []) if s is not None]
    if station_ids is not None and not ids:
        return
    max_c = db.scalar(text(
        "SELECT COALESCE(MAX(c), 0) FROM "
        "(SELECT COUNT(*) c FROM incidents WHERE community_area IS NOT NULL GROUP BY community_area) m"
    )) or 0
    scope = "AND a.community_area = ANY(:ids)" if ids else ""
    db.execute(
        text(f"""
            UPDATE areas a SET
                incident_count = COALESCE(sub.c, 0),
                hotspot_score  = CASE WHEN :max_c > 0
                                      THEN LEAST(1.0, COALESCE(sub.c, 0)::float / :max_c) ELSE 0 END,
                risk_index     = COALESCE(sub.r, 0)
            FROM areas a2
            LEFT JOIN (
                SELECT community_area, COUNT(*) c, AVG(risk_score) r
                FROM incidents GROUP BY community_area
            ) sub ON sub.community_area = a2.community_area
            WHERE a.id = a2.id {scope}
        """),
        {"max_c": max_c, "ids": ids},
    )
    db.commit()
