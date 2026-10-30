"""Pydantic v2 schemas for CCTV cameras, ANPR detections, and vehicle hotlists."""

from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CameraRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    camera_id: str
    name: str
    location: str
    latitude: float | None = None
    longitude: float | None = None
    station_id: int | None = None
    status: str = "online"
    camera_type: str = "Fixed"
    resolution: str = "1080p"
    installed_date: datetime | None = None
    stream_url: str | None = None
    last_ping: datetime | None = None
    created_at: datetime | None = None


class CameraCreate(BaseModel):
    camera_id: str
    name: str
    location: str
    latitude: float | None = None
    longitude: float | None = None
    station_id: int | None = None
    status: str = "online"
    camera_type: str = "Fixed"
    resolution: str = "1080p"


class ANPRDetectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    camera_id: int
    plate_number: str
    confidence: float = 0.95
    vehicle_make: str | None = None
    vehicle_color: str | None = None
    detected_at: datetime
    is_hotlist_hit: bool = False
    matched_suspect_id: int | None = None
    alert_generated: bool = False
    # joined camera info
    camera_name: str | None = None
    camera_location: str | None = None


class HotlistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    plate_number: str
    reason: str
    suspect_id: int | None = None
    fir_reference: str | None = None
    vehicle_description: str | None = None
    status: str = "active"
    added_at: datetime
    found_at: datetime | None = None
    created_at: datetime | None = None


class HotlistCreate(BaseModel):
    plate_number: str
    reason: str
    suspect_id: int | None = None
    fir_reference: str | None = None
    vehicle_description: str | None = None


class SurveillanceDashboard(BaseModel):
    total_cameras: int = 0
    online_cameras: int = 0
    offline_cameras: int = 0
    anpr_cameras: int = 0
    total_detections_today: int = 0
    hotlist_hits_today: int = 0
    recent_detections: list[ANPRDetectionRead] = []
    cameras: list[CameraRead] = []
