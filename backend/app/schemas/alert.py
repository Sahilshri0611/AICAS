"""Alert schemas."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import AlertCategory, AlertSeverity, AlertStatus


class AlertNoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author_name: Optional[str]
    body: str
    created_at: datetime


class AlertNoteCreate(BaseModel):
    body: str


class AlertBase(BaseModel):
    title: str
    category: AlertCategory
    severity: AlertSeverity
    message: str
    recommended_action: Optional[str] = None
    area_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    related_incident_id: Optional[int] = None


class AlertCreate(AlertBase):
    pass


class AlertRead(AlertBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: AlertStatus
    assigned_to_id: Optional[int]
    acknowledged_by_id: Optional[int]
    acknowledged_at: Optional[datetime]
    closed_at: Optional[datetime]
    created_at: datetime
    notes: List[AlertNoteRead] = []


class AlertAssign(BaseModel):
    assigned_to_id: int
