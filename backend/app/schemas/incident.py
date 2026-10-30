"""Incident / crime-record schemas."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import IncidentStatus, RiskLevel


class SuspectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    alias: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    description: Optional[str] = None
    vehicle: Optional[str] = None


class SuspectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    alias: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=0, le=120)
    description: Optional[str] = None
    vehicle: Optional[str] = None


class CaseFileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int
    original_filename: str
    content_type: Optional[str] = None
    size_bytes: int
    category: str
    description: Optional[str] = None
    uploaded_by_name: Optional[str] = None
    created_at: datetime


class IncidentBase(BaseModel):
    primary_type: str
    description: Optional[str] = None
    location_description: Optional[str] = None
    block: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    community_area: Optional[int] = None
    district: Optional[int] = None
    ward: Optional[int] = None
    beat: Optional[int] = None
    occurred_at: datetime
    arrest: bool = False
    domestic: bool = False
    summary: Optional[str] = None


class IncidentCreate(IncidentBase):
    """New case. `community_area` = police station id; zone, area and (if
    omitted) coordinates are derived from the station/locality."""

    case_number: Optional[str] = None
    status: IncidentStatus = IncidentStatus.OPEN
    locality: Optional[str] = None
    suspects: List[SuspectCreate] = []


class IncidentUpdate(BaseModel):
    primary_type: Optional[str] = None
    description: Optional[str] = None
    location_description: Optional[str] = None
    block: Optional[str] = None
    case_number: Optional[str] = None
    arrest: Optional[bool] = None
    status: Optional[IncidentStatus] = None
    assigned_to_id: Optional[int] = None
    risk_score: Optional[float] = None
    summary: Optional[str] = None


class IncidentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    crime_id: str
    case_number: Optional[str]
    primary_type: str
    description: Optional[str]
    location_description: Optional[str]
    block: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    area_id: Optional[int]
    community_area: Optional[int]
    district: Optional[int]
    ward: Optional[int]
    beat: Optional[int]
    occurred_at: datetime
    hour: Optional[int]
    day_of_week: Optional[str]
    risk_score: float
    risk_level: RiskLevel
    status: IncidentStatus
    arrest: bool
    domestic: bool
    source: str
    fir_id: Optional[int]
    assigned_to_id: Optional[int]
    summary: Optional[str]
    police_station: Optional[str] = None
    zone_name: Optional[str] = None


from app.schemas.evidence import MaterialEvidenceRead

class IncidentDetail(IncidentRead):
    suspects: List[SuspectRead] = []
    files: List[CaseFileRead] = []
    material_evidences: List[MaterialEvidenceRead] = []


class ImportRowError(BaseModel):
    row: int
    error: str


class ImportResult(BaseModel):
    total_rows: int
    created: int
    skipped: int
    errors: List[ImportRowError] = []
    crime_ids: List[str] = []


class IncidentFilter(BaseModel):
    search: Optional[str] = None
    crime_type: Optional[str] = None
    risk_level: Optional[RiskLevel] = None
    status: Optional[IncidentStatus] = None
    district: Optional[int] = None
    station: Optional[int] = None
    area: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_risk: Optional[float] = None


# ── Map / geo payloads ──
class MapMarker(BaseModel):
    id: int
    crime_id: str
    primary_type: str
    latitude: float
    longitude: float
    risk_level: RiskLevel
    risk_score: float
    occurred_at: datetime
    area: Optional[str] = None


class HeatPoint(BaseModel):
    lat: float
    lon: float
    intensity: float
