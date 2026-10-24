"""
Database seed script.

Populates the platform with:
  • Demo users — one per RBAC role (admin/commissioner/commander/investigator/officer)
  • Areas       — Nagpur City Police stations (30 stations across 5 zones)
  • Incidents   — a sample of the Nagpur crime dataset (from the JSON cache),
                  with linked accused persons for the suspect network
  • Alerts      — generated from high-risk incidents across all categories
  • ML model    — an initial trained hotspot model in the registry

Generate the cache first (one-off):  python -m app.scripts.generate_nagpur_data

Run:  python -m app.scripts.seed          (from the backend/ directory)
      python -m app.scripts.seed --reset  (truncate first)
"""

from __future__ import annotations

import argparse
import json
import random
from datetime import datetime, timedelta
from pathlib import Path

from geoalchemy2 import WKTElement
from sqlalchemy import text

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.core.logging import get_logger
from app.core.rbac import Role
from app.core.security import hash_password
from app.models.alert import Alert
from app.models.crime import Area, Incident, Suspect
from app.models.enums import (
    AlertCategory,
    AlertSeverity,
    IncidentStatus,
    RiskLevel,
)
from app.models.user import User
from app.services.area_ref import POLICE_STATIONS, area_name
from app.services.incident_service import refresh_area_stats

log = get_logger("seed")
RNG = random.Random(42)

DEMO_USERS = [
    ("admin@crimesense.ai", "System Administrator", Role.ADMIN, "ADM-001", "IT / Operations"),
    ("commissioner@crimesense.ai", "Arvind Deshmukh", Role.COMMISSIONER, "CP-100", "Nagpur City Police HQ, Civil Lines"),
    ("commander@crimesense.ai", "Sunita Wankhede", Role.COMMANDER, "DCP-200", "Zone 3 (Old City)"),
    ("investigator@crimesense.ai", "Rahul Meshram", Role.INVESTIGATOR, "PI-300", "Crime Branch, Nagpur"),
    ("officer@crimesense.ai", "Priya Gajbhiye", Role.OFFICER, "PSI-400", "Sitabuldi Police Station"),
]
DEFAULT_PASSWORD = "Password123!"


def _cache_path() -> Path:
    p = Path(settings.DATA_CACHE_PATH)
    if not p.is_absolute():
        p = (Path(__file__).resolve().parents[2] / p).resolve()  # relative to backend/
    return p


def _load_cache() -> list[dict]:
    path = _cache_path()
    if not path.exists():
        raise FileNotFoundError(
            f"Data cache not found at {path}. Generate it with: "
            f"python -m app.scripts.generate_nagpur_data"
        )
    log.info("Loading crime cache from %s", path)
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def reset(db) -> None:
    log.info("Resetting data tables...")
    for table in [
        "alert_notes", "alerts", "case_files", "incident_suspect", "suspects",
        "fir_documents", "incidents", "areas", "ml_models", "audit_logs",
    ]:
        db.execute(text(f'TRUNCATE TABLE {table} RESTART IDENTITY CASCADE'))
    db.commit()


def seed_users(db) -> None:
    existing = {u.email for u in db.query(User).all()}
    created = 0
    for email, name, role, badge, dept in DEMO_USERS:
        if email in existing:
            continue
        db.add(User(
            email=email, full_name=name, role=role.value,
            hashed_password=hash_password(DEFAULT_PASSWORD),
            badge_number=badge, department=dept, is_active=True,
        ))
        created += 1
    db.commit()
    log.info("Users: %d created (password for all demo users: %s)", created, DEFAULT_PASSWORD)


def seed_areas(db) -> dict[int, int]:
    """Insert police-station areas, return {station_id: area_id}."""
    mapping: dict[int, int] = {}
    for st in POLICE_STATIONS.values():
        area = Area(
            name=area_name(st.id), community_area=st.id, district=st.zone,
            centroid_lat=st.lat, centroid_lon=st.lon,
        )
        if settings.USE_POSTGIS:
            area.geom = WKTElement(f"POINT({st.lon} {st.lat})", srid=4326)
        db.add(area)
        db.flush()
        mapping[st.id] = area.id
    db.commit()
    log.info("Areas: %d police stations inserted", len(mapping))
    return mapping


def _int(v) -> int | None:
    try:
        return int(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


def seed_incidents(db, records: list[dict], area_map: dict[int, int]) -> None:
    sample_size = min(settings.SEED_SAMPLE_SIZE, len(records))
    sample = RNG.sample(records, sample_size)
    log.info("Incidents: inserting %d of %d cached records...", sample_size, len(records))

    suspects: dict[str, Suspect] = {}   # accused key -> Suspect (dedup repeat offenders)
    batch: list[Incident] = []
    inserted = 0
    for r in sample:
        try:
            occurred = datetime.strptime(str(r["Date"])[:19], "%Y-%m-%d %H:%M:%S")
        except (ValueError, KeyError):
            continue
        lat, lon = r.get("Latitude"), r.get("Longitude")
        station = _int(r.get("StationId"))
        risk_level = r.get("RiskLevel", "Low")
        if risk_level not in RiskLevel._value2member_map_:
            risk_level = "Low"
        status = r.get("Status")
        if status not in IncidentStatus._value2member_map_:
            status = RNG.choice([IncidentStatus.OPEN, IncidentStatus.UNDER_REVIEW,
                                 IncidentStatus.ASSIGNED, IncidentStatus.CLOSED])

        inc = Incident(
            crime_id=r.get("CrimeID") or f"CS-{inserted+1:05d}",
            case_number=r.get("FIRNo"),
            primary_type=r.get("PrimaryType", "OTHER OFFENCE"),
            description=r.get("Description"),
            location_description=r.get("LocationType"),
            block=r.get("Address") or r.get("Locality"),
            latitude=lat, longitude=lon,
            area_id=area_map.get(station) if station else None,
            community_area=station,
            district=_int(r.get("Zone")),
            beat=_int(r.get("Beat")),
            occurred_at=occurred,
            hour=r.get("Hour", occurred.hour),
            day_of_week=r.get("DayOfWeek", occurred.strftime("%A")),
            month=r.get("Month", occurred.month),
            year=r.get("Year", occurred.year),
            risk_score=float(r.get("RiskScore", 0.3)),
            risk_level=risk_level,
            status=status,
            arrest=bool(r.get("Arrest", False)),
            domestic=bool(r.get("Domestic", False)),
            summary=r.get("Summary"),
            source="seed",
        )
        for s in r.get("Suspects") or []:
            key = s.get("key") or s.get("name")
            if key not in suspects:
                suspects[key] = Suspect(
                    name=s["name"], alias=s.get("alias"), gender=s.get("gender"),
                    age=s.get("age"), vehicle=s.get("vehicle"),
                    description=f"Accused ref {key}" + (f", alias {s['alias']}" if s.get("alias") else ""),
                )
            inc.suspects.append(suspects[key])
        if settings.USE_POSTGIS and lat and lon:
            inc.geom = WKTElement(f"POINT({lon} {lat})", srid=4326)
        batch.append(inc)
        inserted += 1
        if len(batch) >= 1000:
            db.add_all(batch)
            db.commit()
            batch = []
            log.info("  ... %d inserted", inserted)
    if batch:
        db.add_all(batch)
        db.commit()

    refresh_area_stats(db)
    log.info("Incidents: %d inserted, %d accused persons linked; station aggregates refreshed",
             inserted, len(suspects))


def seed_alerts(db) -> None:
    high_risk = (
        db.query(Incident)
        .filter(Incident.risk_score >= 0.75)
        .order_by(Incident.occurred_at.desc())
        .limit(40)
        .all()
    )
    categories = list(AlertCategory)
    now = datetime.utcnow()
    count = 0
    for i, inc in enumerate(high_risk[:18]):
        cat = categories[i % len(categories)]
        sev = (
            AlertSeverity.CRITICAL if inc.risk_score >= 0.9
            else AlertSeverity.HIGH if inc.risk_score >= 0.8
            else AlertSeverity.MEDIUM
        )
        area = area_name(inc.community_area)
        db.add(Alert(
            title=f"{cat.value} — {area}",
            category=cat, severity=sev,
            message=f"{inc.primary_type} incident ({inc.crime_id}) flagged in {area}. "
                    f"Risk score {inc.risk_score:.2f}.",
            recommended_action="Dispatch nearest patrol unit and review linked incidents.",
            area_name=area, latitude=inc.latitude, longitude=inc.longitude,
            related_incident_id=inc.id,
            created_at=now - timedelta(hours=RNG.randint(0, 120)),
        ))
        count += 1
    db.commit()
    log.info("Alerts: %d generated", count)


def seed_model(db) -> None:
    from app.models.enums import ModelType
    from app.services.model_service import ModelService

    try:
        model = ModelService(db).train(ModelType.HOTSPOT, notes="Initial seed training run")
        log.info("ML model: trained %s %s (accuracy=%.3f)", model.name, model.version, model.accuracy or 0)
    except Exception as e:  # pragma: no cover
        log.warning("ML model training skipped: %s", e)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="truncate tables before seeding")
    args = parser.parse_args()

    records = _load_cache()
    db = SessionLocal()
    try:
        if args.reset:
            reset(db)
        seed_users(db)
        if db.query(Incident).count() > 0 and not args.reset:
            log.info("Incidents already present — skipping (use --reset to reseed).")
        else:
            area_map = seed_areas(db)
            seed_incidents(db, records, area_map)
            seed_alerts(db)
            seed_model(db)
        log.info("[OK] Seeding complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
