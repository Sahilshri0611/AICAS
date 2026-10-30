"""FIR parsing schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import FIRStatus


class ExtractedEntities(BaseModel):
    """Structured fields the LLM extracts from FIR text."""

    crime_type: Optional[str] = None
    location: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    suspect_details: Optional[str] = None
    victim_details: Optional[str] = None
    vehicle_information: Optional[str] = None
    weapon_information: Optional[str] = None
    incident_summary: Optional[str] = None


class FIRRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    content_type: Optional[str]
    status: FIRStatus
    ocr_text: Optional[str]
    ocr_confidence: Optional[float]
    extracted: Optional[Dict[str, Any]]
    field_confidence: Optional[Dict[str, float]]
    flagged_fields: Optional[List[str]]
    overall_confidence: Optional[float]
    risk_score: Optional[float]
    incident_id: Optional[int]
    error_message: Optional[str]
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    file_hash: Optional[str] = None
    original_pdf_stored: bool = False
    created_at: datetime
    processed_at: Optional[datetime]


class FIRParseResult(BaseModel):
    """Full result returned right after upload + parse."""

    fir: FIRRead
    generated_crime_id: Optional[str] = None


class FIRTextParseRequest(BaseModel):
    """Parse raw text directly (no file / OCR step)."""

    text: str
    filename: str = "manual-entry.txt"


class FIRApprove(BaseModel):
    """Override extracted fields before committing to an incident."""

    overrides: Optional[Dict[str, Any]] = None
