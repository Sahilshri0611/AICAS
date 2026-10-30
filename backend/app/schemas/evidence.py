"""Pydantic schemas for physical and material evidence (Muddayemal / Property Seizure Register)."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class MaterialEvidenceCreate(BaseModel):
    incident_id: int
    item_type: str  # Vehicle, Weapon, Stolen Property, Electronic Device, Cash, Narcotics, Other
    item_name: str
    identifier: Optional[str] = None  # Plate number, IMEI, serial number
    description: Optional[str] = None
    seizure_memo_no: Optional[str] = None  # Panchnama Memo reference
    custody_status: str = "In Malkhana"  # In Malkhana, Seized at PS Yard, Sent to FSL, Released on Supurdari
    custody_location: Optional[str] = None
    linked_suspect_id: Optional[int] = None
    seized_by_name: Optional[str] = None


class MaterialEvidenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int
    item_type: str
    item_name: str
    identifier: Optional[str] = None
    description: Optional[str] = None
    seizure_memo_no: Optional[str] = None
    seized_at: Optional[datetime] = None
    custody_status: str
    custody_location: Optional[str] = None
    linked_suspect_id: Optional[int] = None
    seized_by_name: Optional[str] = None
    created_at: Optional[datetime] = None

    # Joined fields
    crime_id: Optional[str] = None
    police_station: Optional[str] = None


class MaterialEvidenceStatusUpdate(BaseModel):
    custody_status: str
    custody_location: Optional[str] = None
