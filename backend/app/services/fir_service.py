"""
FIR AI-parsing pipeline orchestrator.

    Upload → OCR → Text Extraction → LLM Parsing → Entity Extraction
           → Structured Crime Record (Crime ID, Risk Score, Confidences)

Persists a FIRDocument at each stage and, on approval, materializes an Incident.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.crime import Incident, Suspect
from app.models.enums import FIRStatus, IncidentStatus
from app.models.fir import FIRDocument
from app.repositories.fir_repo import FIRRepository
from app.services import area_ref, llm_service, ocr_service
from app.services.crime_catalog import normalize_crime_type
from app.services.incident_service import IncidentService, refresh_area_stats
from app.services.risk import compute_risk_score, risk_level_for

log = get_logger(__name__)

CONFIDENCE_THRESHOLD = 0.60


class FIRService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = FIRRepository(db)
        self.incidents = IncidentService(db)

    # ── Core parse (from raw text) ──
    def _analyze_text(self, fir: FIRDocument, text: str) -> FIRDocument:
        fir.status = FIRStatus.PARSING
        self.repo.commit()

        result = llm_service.parse_fir_text(text)
        extracted = result["extracted"]
        confidence = result["field_confidence"]

        flagged = [k for k, v in confidence.items() if v < CONFIDENCE_THRESHOLD]
        present = [v for v in confidence.values() if v > 0]
        overall = round(sum(present) / len(present), 3) if present else 0.0

        crime_type = normalize_crime_type(extracted.get("crime_type"))
        extracted["crime_type"] = crime_type
        risk = compute_risk_score(crime_type)

        fir.extracted = extracted
        fir.field_confidence = confidence
        fir.flagged_fields = flagged
        fir.overall_confidence = overall
        fir.risk_score = risk
        fir.status = FIRStatus.NEEDS_REVIEW if flagged else FIRStatus.PARSED
        fir.processed_at = datetime.now(timezone.utc)
        self.repo.commit()
        self.db.refresh(fir)
        return fir

    def parse_upload(
        self, content: bytes, filename: str, content_type: str, user_id: Optional[int]
    ) -> FIRDocument:
        fir = FIRDocument(
            original_filename=filename,
            content_type=content_type,
            status=FIRStatus.OCR_RUNNING,
            uploaded_by_id=user_id,
        )
        self.repo.add(fir)
        self.repo.commit()

        try:
            text, ocr_conf = ocr_service.extract_text(content, content_type, filename)
            fir.ocr_text = text
            fir.ocr_confidence = ocr_conf
            self.repo.commit()
            return self._analyze_text(fir, text)
        except HTTPException as e:
            fir.status = FIRStatus.FAILED
            fir.error_message = str(e.detail)
            self.repo.commit()
            raise

    def parse_text(self, text: str, filename: str, user_id: Optional[int]) -> FIRDocument:
        fir = FIRDocument(
            original_filename=filename,
            content_type="text/plain",
            status=FIRStatus.PARSING,
            ocr_text=text,
            ocr_confidence=1.0,
            uploaded_by_id=user_id,
        )
        self.repo.add(fir)
        self.repo.commit()
        try:
            return self._analyze_text(fir, text)
        except HTTPException as e:
            fir.status = FIRStatus.FAILED
            fir.error_message = str(e.detail)
            self.repo.commit()
            raise

    # ── Read ──
    def get(self, fir_id: int) -> FIRDocument:
        fir = self.repo.get(fir_id)
        if not fir:
            raise HTTPException(status_code=404, detail="FIR not found")
        return fir

    def recent(self, limit: int = 50):
        return self.repo.recent(limit)

    def preview_crime_id(self) -> str:
        return self.incidents._next_crime_id()

    # ── Approve → create incident ──
    def approve(self, fir_id: int, overrides: dict[str, Any] | None, user_id: Optional[int]) -> FIRDocument:
        fir = self.get(fir_id)
        if fir.incident_id:
            raise HTTPException(status_code=400, detail="FIR already converted to an incident")
        data = dict(fir.extracted or {})
        if overrides:
            data.update({k: v for k, v in overrides.items() if v is not None})

        occurred = self._parse_datetime(data.get("date"), data.get("time"))
        crime_type = normalize_crime_type(data.get("crime_type"))
        risk = compute_risk_score(crime_type, occurred)

        # Place the case on the Nagpur map: station from the FIR header, else from
        # the place of occurrence; coordinates from the matched locality/station.
        station = area_ref.find_station(data.get("police_station"))
        station_id, lat, lon = self.incidents.resolve_location(
            station.id if station else None, None, None, data.get("location"), data.get("location"),
        )
        sections = data.get("sections")
        station_code = area_ref.POLICE_STATIONS[station_id].code if station_id else None
        fir_no = data.get("fir_number")
        if fir_no and station_code and not str(fir_no).upper().startswith(station_code):
            fir_no = f"{station_code}/{fir_no}"

        incident = Incident(
            crime_id=self.incidents._next_crime_id(),
            case_number=(str(fir_no)[:64] if fir_no else None),
            primary_type=crime_type,
            description=(f"{sections}" if sections else None),
            location_description=data.get("location"),
            block=data.get("location"),
            latitude=lat,
            longitude=lon,
            community_area=station_id,
            district=area_ref.zone_for_station(station_id),
            area_id=self.incidents._area_id(station_id),
            occurred_at=occurred,
            hour=occurred.hour,
            day_of_week=occurred.strftime("%A"),
            month=occurred.month,
            year=occurred.year,
            risk_score=risk,
            risk_level=risk_level_for(risk),
            status=IncidentStatus.OPEN,
            source="fir",
            fir_id=fir.id,
            summary=data.get("incident_summary"),
        )

        # Suspect extraction
        suspect_text = data.get("suspect_details")
        if suspect_text and suspect_text.lower() not in ("null", "none", "unknown"):
            incident.suspects.append(
                Suspect(
                    name=suspect_text[:120],
                    description=suspect_text,
                    vehicle=data.get("vehicle_information"),
                )
            )

        self.db.add(incident)
        self.db.flush()
        fir.incident_id = incident.id
        fir.status = FIRStatus.APPROVED
        self.repo.commit()
        refresh_area_stats(self.db, [station_id])
        self.db.refresh(fir)
        return fir

    @staticmethod
    def _parse_datetime(date_str: Any, time_str: Any) -> datetime:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if not date_str:
            return now
        candidates = [
            f"{date_str} {time_str}" if time_str else str(date_str),
            str(date_str),
        ]
        formats = [  # Indian FIRs are day-first
            "%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d",
            "%d/%m/%Y %H:%M", "%d/%m/%Y", "%d-%m-%Y %H:%M", "%d-%m-%Y",
            "%d.%m.%Y %H:%M", "%d.%m.%Y",
        ]
        for c in candidates:
            for fmt in formats:
                try:
                    return datetime.strptime(c.strip(), fmt)
                except (ValueError, AttributeError):
                    continue
        return now
