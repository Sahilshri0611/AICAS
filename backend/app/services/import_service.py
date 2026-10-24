"""
Bulk case import from CSV / Excel.

Accepts flexible column names (e.g. "Crime Head" / "crime_type" / "Offence"),
resolves police stations by name, code or id, derives coordinates from the
locality or station when absent, and reports per-row errors instead of
failing the whole file. Also accepts the app's own CSV/Excel export.
"""

from __future__ import annotations

import io
import re
from datetime import datetime
from typing import Any, Optional

import pandas as pd
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.crime import Incident
from app.models.enums import IncidentStatus
from app.schemas.incident import IncidentCreate, SuspectCreate
from app.services import area_ref
from app.services.incident_service import IncidentService, refresh_area_stats

log = get_logger(__name__)

MAX_ROWS = 5000

# canonical field → accepted header spellings (normalised: lowercase alnum only)
COLUMN_ALIASES: dict[str, tuple[str, ...]] = {
    "primary_type": ("crimetype", "primarytype", "crimehead", "crime", "offence", "offense", "head", "type"),
    "occurred_at": ("datetime", "occurredat", "date", "incidentdate", "dateofoffence", "dateofincident"),
    "time": ("time", "incidenttime", "timeofoffence"),
    "station": ("policestation", "station", "ps", "stationname", "stationid"),
    "locality": ("locality", "area", "neighbourhood", "neighborhood"),
    "block": ("address", "block", "placeofoccurrence", "place", "landmark"),
    "location_description": ("locationtype", "locationdescription", "location", "premises"),
    "latitude": ("latitude", "lat"),
    "longitude": ("longitude", "lon", "lng", "long"),
    "case_number": ("firno", "firnumber", "casenumber", "caseno", "fir", "crno", "crimeno"),
    "description": ("description", "sections", "section", "actsection", "details"),
    "status": ("status", "casestatus"),
    "arrest": ("arrest", "arrested", "arrestmade"),
    "domestic": ("domestic", "domesticviolence"),
    "summary": ("summary", "brieffacts", "narrative", "remarks", "incidentsummary"),
    "suspect_name": ("accusedname", "accused", "suspectname", "suspect"),
    "suspect_vehicle": ("accusedvehicle", "vehicle", "vehiclenumber", "suspectvehicle"),
}

TEMPLATE_COLUMNS = [
    "FIR No", "Crime Head", "Date", "Time", "Police Station", "Locality", "Address",
    "Location Type", "Latitude", "Longitude", "Description", "Status", "Arrest",
    "Domestic", "Accused Name", "Accused Vehicle", "Summary",
]
TEMPLATE_ROWS = [
    ["SBD/0901/2026", "VEHICLE THEFT", "2026-09-20", "21:30", "Sitabuldi", "Variety Square",
     "Near Metro Station, Variety Square", "Parking Area", "", "", "Two-wheeler theft (BNS 303(2))",
     "Open", "No", "No", "", "", "Honda Activa MH-31-EK-4521 stolen from parking."],
    ["HDK/0455/2026", "CHAIN SNATCHING", "2026-09-21", "06:45", "Hudkeshwar", "Narsala",
     "Near Hanuman Mandir, Narsala", "Morning Walk Route", "21.0905", "79.1302",
     "Gold chain snatching (BNS 304)", "Assigned", "Yes", "No", "Rohit Meshram",
     "Bajaj Pulsar MH-49-AB-7788", "Two accused on motorcycle snatched chain of 58-year-old woman."],
]


def _norm(s: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(s).lower())


def _map_columns(columns: list[str]) -> dict[str, str]:
    normed = {_norm(c): c for c in columns}
    mapping: dict[str, str] = {}
    for field, aliases in COLUMN_ALIASES.items():
        for a in aliases:
            if a in normed and normed[a] not in mapping.values():
                mapping[field] = normed[a]
                break
    return mapping


def _clean(v: Any) -> Optional[str]:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s or None


def _bool(v: Any) -> bool:
    return (_clean(v) or "").lower() in ("yes", "y", "true", "1", "t", "arrested")


def _float(v: Any) -> Optional[float]:
    s = _clean(v)
    if s is None:
        return None
    try:
        return float(s)
    except ValueError:
        raise ValueError(f"invalid number '{s}'")


def _datetime(date_v: Any, time_v: Any) -> datetime:
    if isinstance(date_v, (pd.Timestamp, datetime)) and not pd.isna(date_v):
        dt = pd.Timestamp(date_v).to_pydatetime()
    else:
        s = _clean(date_v)
        if not s:
            raise ValueError("date is required")
        # Indian convention: day first for ambiguous dd/mm/yyyy dates
        ts = pd.to_datetime(s, dayfirst=not re.match(r"^\d{4}-", s), errors="coerce")
        if pd.isna(ts):
            raise ValueError(f"unrecognised date '{s}'")
        dt = ts.to_pydatetime()
    t = _clean(time_v)
    if t:
        m = re.match(r"^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?$", t.lower())
        if not m:
            raise ValueError(f"unrecognised time '{t}'")
        h, mi = int(m.group(1)), int(m.group(2))
        if m.group(3):
            h = h % 12 + (12 if m.group(3).startswith("p") else 0)
        dt = dt.replace(hour=h, minute=mi, second=0)
    return dt.replace(tzinfo=None)


def _status(v: Any) -> IncidentStatus:
    s = (_clean(v) or "").lower()
    for st in IncidentStatus:
        if st.value.lower() == s:
            return st
    if s in ("pending", "under investigation", "investigation"):
        return IncidentStatus.UNDER_REVIEW
    if s in ("disposed", "chargesheeted", "chargesheet filed", "solved", "detected"):
        return IncidentStatus.CLOSED
    return IncidentStatus.OPEN


def read_table(content: bytes, filename: str) -> pd.DataFrame:
    name = (filename or "").lower()
    try:
        if name.endswith((".xlsx", ".xlsm", ".xls")):
            df = pd.read_excel(io.BytesIO(content), dtype=object)
        elif name.endswith((".csv", ".txt")):
            try:
                df = pd.read_csv(io.BytesIO(content), dtype=object, encoding="utf-8-sig")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(content), dtype=object, encoding="latin-1")
        else:
            raise HTTPException(status_code=415, detail="Upload a .csv or .xlsx file")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read file: {e}")
    df = df.dropna(how="all")
    if df.empty:
        raise HTTPException(status_code=422, detail="The file has no data rows")
    if len(df) > MAX_ROWS:
        raise HTTPException(status_code=413, detail=f"Too many rows ({len(df)}); max {MAX_ROWS} per file")
    return df


def import_cases(db: Session, content: bytes, filename: str, source: str = "import") -> dict:
    df = read_table(content, filename)
    cols = _map_columns(list(df.columns))
    missing = [f for f in ("primary_type", "occurred_at") if f not in cols]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required column(s): {', '.join(missing)}. "
                   f"Found: {', '.join(map(str, df.columns))}. Download the template for the expected format.",
        )

    svc = IncidentService(db)
    existing_cases = set(db.scalars(select(Incident.case_number).where(Incident.case_number.isnot(None))).all())
    next_seq = svc.repo.max_crime_seq() + 1

    created: list[Incident] = []
    errors: list[dict] = []
    skipped = 0

    def g(row, field):
        return row.get(cols[field]) if field in cols else None

    for i, (_, row) in enumerate(df.iterrows(), start=2):   # row 1 = header
        try:
            case_no = _clean(g(row, "case_number"))
            if case_no and case_no in existing_cases:
                skipped += 1
                errors.append({"row": i, "error": f"duplicate FIR/case number {case_no} — skipped"})
                continue

            station_raw = _clean(g(row, "station"))
            station_id = None
            if station_raw:
                if station_raw.isdigit():
                    station_id = int(station_raw)
                else:
                    st = area_ref.find_station(station_raw)
                    if not st:
                        raise ValueError(f"unknown police station '{station_raw}'")
                    station_id = st.id

            suspect_name = _clean(g(row, "suspect_name"))
            payload = IncidentCreate(
                primary_type=_clean(g(row, "primary_type")) or "",
                occurred_at=_datetime(g(row, "occurred_at"), g(row, "time")),
                community_area=station_id,
                locality=_clean(g(row, "locality")),
                block=_clean(g(row, "block")),
                location_description=_clean(g(row, "location_description")),
                latitude=_float(g(row, "latitude")),
                longitude=_float(g(row, "longitude")),
                case_number=case_no,
                description=_clean(g(row, "description")),
                status=_status(g(row, "status")),
                arrest=_bool(g(row, "arrest")),
                domestic=_bool(g(row, "domestic")),
                summary=_clean(g(row, "summary")),
                suspects=[SuspectCreate(name=suspect_name, vehicle=_clean(g(row, "suspect_vehicle")))]
                if suspect_name else [],
            )
            if not payload.primary_type:
                raise ValueError("crime head is required")
            inc = svc.build(payload, source=source, crime_id=f"CS-{next_seq:05d}")
            if inc.community_area is None:
                raise ValueError("could not determine police station — give a station, locality or coordinates")
            db.add(inc)
            next_seq += 1
            created.append(inc)
            if case_no:
                existing_cases.add(case_no)
        except HTTPException as e:
            errors.append({"row": i, "error": str(e.detail)})
        except ValidationError as e:
            errors.append({"row": i, "error": "; ".join(err["msg"] for err in e.errors())})
        except ValueError as e:
            errors.append({"row": i, "error": str(e)})

    db.commit()
    if created:
        refresh_area_stats(db)
    log.info("Imported %d cases from %s (%d errors)", len(created), filename, len(errors))
    return {
        "total_rows": len(df),
        "created": len(created),
        "skipped": skipped,
        "errors": errors[:200],
        "crime_ids": [c.crime_id for c in created[:500]],
    }


def template_csv() -> bytes:
    buf = io.StringIO()
    pd.DataFrame(TEMPLATE_ROWS, columns=TEMPLATE_COLUMNS).to_csv(buf, index=False)
    return buf.getvalue().encode("utf-8-sig")
