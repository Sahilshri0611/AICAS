"""Pydantic v2 schemas for patrol routes, waypoints, and briefings."""

from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class WaypointSchema(BaseModel):
    name: str
    latitude: float
    longitude: float
    risk_score: float = 0.0
    order: int = 0


class PatrolRouteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    station_id: int | None = None
    zone: int | None = None
    shift: str = "night"
    waypoints: list[WaypointSchema] = []
    total_distance_km: float | None = None
    estimated_duration_min: int | None = None
    priority: str = "Medium"
    status: str = "active"
    assigned_officer_id: int | None = None
    notes: str | None = None
    created_at: datetime | None = None


class PatrolRouteCreate(BaseModel):
    name: str
    station_id: int | None = None
    zone: int | None = None
    shift: str = "night"
    waypoints: list[WaypointSchema] = []
    priority: str = "Medium"


class PatrolLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    route_id: int
    officer_id: int | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    waypoints_visited: int = 0
    incidents_reported: int = 0
    notes: str | None = None
    status: str = "pending"


class PatrolBriefing(BaseModel):
    route: PatrolRouteRead
    station_name: str = ""
    zone_name: str = ""
    high_risk_areas: list[dict] = []
    recent_incidents: list[dict] = []
    suggested_strength: int = 2
