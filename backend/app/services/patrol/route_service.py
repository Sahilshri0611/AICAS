"""
Smart Beat Patrol route generation service.

Translates XGBoost hotspot predictions into actionable patrol routes for
Nagpur City Police beat constables and PCR vans. Generates optimized waypoint
sequences per police station / shift.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.crime import Incident
from app.models.patrol import PatrolRoute
from app.services.area_ref import POLICE_STATIONS, ZONES, area_centroid, area_name

log = get_logger(__name__)


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Approximate distance in km between two points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class PatrolRouteService:
    def __init__(self, db: Session):
        self.db = db

    def list_routes(
        self,
        station_id: Optional[int] = None,
        shift: Optional[str] = None,
        status: str = "active",
    ) -> list[PatrolRoute]:
        stmt = select(PatrolRoute).order_by(desc(PatrolRoute.created_at))
        if station_id:
            stmt = stmt.where(PatrolRoute.station_id == station_id)
        if shift and shift != "all":
            stmt = stmt.where(PatrolRoute.shift == shift)
        if status != "all":
            stmt = stmt.where(PatrolRoute.status == status)
        return list(self.db.scalars(stmt).all())

    def get_route(self, route_id: int) -> PatrolRoute:
        route = self.db.get(PatrolRoute, route_id)
        if not route:
            raise HTTPException(404, "Patrol route not found")
        return route

    def generate_routes(
        self, station_ids: Optional[list[int]] = None
    ) -> list[PatrolRoute]:
        """Auto-generate patrol routes from hotspot data for each station."""
        target_stations = station_ids or list(POLICE_STATIONS.keys())
        created: list[PatrolRoute] = []

        # Get incident counts per station for risk scoring
        station_risk = {}
        rows = self.db.execute(
            select(
                Incident.community_area,
                func.count(Incident.id).label("cnt"),
                func.avg(Incident.risk_score).label("avg_risk"),
            )
            .group_by(Incident.community_area)
        ).all()
        for ca, cnt, avg_r in rows:
            if ca is not None:
                station_risk[ca] = {"count": cnt, "avg_risk": float(avg_r or 0)}

        for sid in target_stations:
            stn = POLICE_STATIONS.get(sid)
            if not stn:
                continue

            # Build waypoints from station localities
            waypoints = []
            locs = list(stn.localities)
            risk_info = station_risk.get(sid, {"count": 0, "avg_risk": 0.3})

            for i, loc in enumerate(locs[:8]):
                waypoints.append({
                    "name": loc.name,
                    "latitude": loc.lat,
                    "longitude": loc.lon,
                    "risk_score": round(min(1.0, risk_info["avg_risk"] + (0.1 * (len(locs) - i) / max(1, len(locs)))), 2),
                    "order": i + 1,
                })

            if not waypoints:
                # Add station centroid itself as fallback waypoint
                waypoints.append({
                    "name": f"{stn.name} Chowki",
                    "latitude": stn.lat,
                    "longitude": stn.lon,
                    "risk_score": round(risk_info["avg_risk"], 2),
                    "order": 1,
                })

            # Calculate total distance
            total_km = 0.0
            for j in range(len(waypoints) - 1):
                total_km += _haversine(
                    waypoints[j]["latitude"], waypoints[j]["longitude"],
                    waypoints[j + 1]["latitude"], waypoints[j + 1]["longitude"],
                )
            if len(waypoints) > 1:
                total_km += _haversine(
                    waypoints[-1]["latitude"], waypoints[-1]["longitude"],
                    waypoints[0]["latitude"], waypoints[0]["longitude"],
                )

            # Priority from risk
            avg_risk = risk_info["avg_risk"]
            priority = (
                "Critical" if avg_risk >= 0.7
                else "High" if avg_risk >= 0.5
                else "Medium" if avg_risk >= 0.3
                else "Low"
            )

            shift = "night" if avg_risk >= 0.5 else "day"

            route = PatrolRoute(
                name=f"{stn.name} Beat Patrol",
                station_id=sid,
                zone=stn.zone,
                shift=shift,
                waypoints=waypoints,
                total_distance_km=round(total_km, 2),
                estimated_duration_min=max(30, int(total_km * 12 + len(waypoints) * 8)),
                priority=priority,
                status="active",
                notes=f"Auto-generated from hotspot data. {risk_info['count']} incidents in jurisdiction.",
            )
            self.db.add(route)
            created.append(route)

        if created:
            self.db.commit()
            for r in created:
                self.db.refresh(r)
            log.info("Generated %d patrol routes", len(created))

        return created

    def briefing(self, route_id: int) -> dict:
        """Build a patrol briefing packet for a route."""
        route = self.get_route(route_id)
        station_name = area_name(route.station_id) if route.station_id else "Unknown"

        stn = POLICE_STATIONS.get(route.station_id) if route.station_id else None
        zone_name = ZONES.get(stn.zone, f"Zone {route.zone}") if stn else f"Zone {route.zone or '—'}"

        # High risk areas from waypoints
        high_risk = []
        for wp in (route.waypoints or []):
            if wp.get("risk_score", 0) >= 0.4:
                high_risk.append({
                    "area": wp["name"],
                    "risk_score": wp["risk_score"],
                    "recent_count": 0,
                })

        # Recent incidents near this station
        recent = self.db.scalars(
            select(Incident)
            .where(Incident.community_area == route.station_id)
            .order_by(desc(Incident.occurred_at))
            .limit(10)
        ).all()
        recent_list = [
            {
                "crime_id": inc.crime_id,
                "type": inc.primary_type,
                "date": inc.occurred_at.strftime("%Y-%m-%d") if inc.occurred_at else "—",
                "location": inc.location_description or area_name(inc.community_area),
            }
            for inc in recent
        ]

        suggested = max(2, min(8, len(high_risk) + 1))

        return {
            "route": route,
            "station_name": station_name,
            "zone_name": zone_name,
            "high_risk_areas": high_risk,
            "recent_incidents": recent_list,
            "suggested_strength": suggested,
        }

    def update_route(self, route_id: int, **kwargs) -> PatrolRoute:
        route = self.get_route(route_id)
        for k, v in kwargs.items():
            if v is not None and hasattr(route, k):
                setattr(route, k, v)
        self.db.commit()
        self.db.refresh(route)
        return route
