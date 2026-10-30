"""
Script to recalibrate and polish seeded data:
1. Fix MaterialEvidence: real vehicle plates in identifier, diverse makes, varied accused suspects.
2. Polish Alerts: calibrate severities (Low/Medium/High/Critical pyramid), exact category-matching messages, span all 7 past days.
3. Polish Beat Patrol: vary shifts (morning, evening, night) and priorities (Critical, High, Medium, Low).
4. Seed ML Models: 3 model versions (v1.0, v1.1, v1.2) for the metrics trend line chart.
"""

from datetime import datetime, timedelta, timezone
import random
from sqlalchemy import select, delete
from app.core.database import SessionLocal
from app.models.alert import Alert
from app.models.crime import Incident, Suspect
from app.models.enums import AlertCategory, AlertSeverity, AlertStatus, ModelType
from app.models.evidence import MaterialEvidence
from app.models.model_registry import MLModel
from app.models.patrol import PatrolRoute
from app.services.area_ref import area_name

RNG = random.Random(42)

VEHICLE_MODELS = [
    ("Honda Activa 6G", "Scooter"),
    ("Bajaj Pulsar 150", "Motorcycle"),
    ("Hero Splendor Plus", "Motorcycle"),
    ("TVS Apache RTR 160", "Motorcycle"),
    ("Honda Shine 125", "Motorcycle"),
    ("Yamaha FZ-S FI", "Motorcycle"),
    ("Maruti Swift VXi", "Four-Wheeler"),
    ("Mahindra Bolero", "Utility Vehicle"),
    ("Maruti Alto 800", "Four-Wheeler"),
    ("Bajaj Auto-Rickshaw", "Three-Wheeler"),
    ("Tata Ace Gold", "Commercial Vehicle"),
]

RTO_SERIES = ["MH-31", "MH-40", "MH-49"]
LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ"

WEAPONS = [
    "Chopper Knife (9-inch steel blade)",
    "Country-made Pistol (Desi Katta .315 bore)",
    "Heavy Iron Crowbar (Shutter Breaking Tool)",
    "Rampuri Spring-Lock Knife",
    "Country-made Revolver (6-shot .32 bore)",
    "Wooden Lathi with Metal Cap",
    "Sharp Iron Rod (3-foot)",
    "Flick Knife (Serrated Edge)",
]

STOLEN_PROPERTIES = [
    ("Gold Mangalsutra (18 Karat, 18g)", "Gold Jewelry"),
    ("Gold Chain with Om Locket (22g)", "Gold Jewelry"),
    ("Samsung Galaxy S23 Ultra (256GB)", "Smartphone"),
    ("OnePlus 11 5G Smartphone", "Smartphone"),
    ("Apple iPhone 14 Pro (Deep Purple)", "Smartphone"),
    ("Cash Currency Notes Rs. 45,000", "Currency"),
    ("Cash Currency Notes Rs. 85,000", "Currency"),
    ("Diamond Solitaire Ring (0.75 Carat)", "Diamond Jewelry"),
    ("Silver Anklets / Payal (150g)", "Silver Jewelry"),
    ("Dell Latitude Core-i7 Laptop", "Electronics"),
]

def make_plate():
    return f"{RNG.choice(RTO_SERIES)}-{RNG.choice(LETTERS)}{RNG.choice(LETTERS)}-{RNG.randint(1000, 9999)}"

def polish_evidence(db):
    print("--- Polishing Material Evidence ---")
    evidences = db.scalars(select(MaterialEvidence)).all()
    suspects = db.scalars(select(Suspect)).all()
    incidents = {inc.id: inc for inc in db.scalars(select(Incident).where(Incident.id.in_([e.incident_id for e in evidences]))).all()}

    veh_count = 0
    wpn_count = 0
    prop_count = 0

    for i, ev in enumerate(evidences):
        inc = incidents.get(ev.incident_id)
        sus = suspects[i % len(suspects)] if suspects else None
        sus_name = sus.name if sus else "Unknown Accused"
        inc_crime_id = inc.crime_id if inc else f"CS-{RNG.randint(1000, 9999)}"
        inc_area = area_name(inc.community_area) if inc and inc.community_area else "Nagpur"

        if ev.item_type == "Vehicle":
            model, _vtype = RNG.choice(VEHICLE_MODELS)
            plate = make_plate()
            ev.item_name = f"{model} ({plate})"
            ev.identifier = plate  # Exact plate number, not brand!
            ev.description = f"{model} (Reg: {plate}) seized from accused {sus_name} during investigation of {inc_crime_id} at {inc_area}."
            veh_count += 1
        elif ev.item_type == "Weapon":
            wpn = RNG.choice(WEAPONS)
            wid = f"WPN-{RNG.randint(1000, 9999)}"
            ev.item_name = wpn
            ev.identifier = wid
            ev.description = f"Recovered {wpn} seized under panchnama in {inc_crime_id} ({inc_area} PS). Forensic ballistic swab taken."
            wpn_count += 1
        else:
            prop, _ptype = RNG.choice(STOLEN_PROPERTIES)
            pid = f"PROP-{RNG.randint(1000, 9999)}"
            ev.item_name = prop
            ev.identifier = pid
            ev.description = f"Recovered stolen property ({prop}) seized from possession of {sus_name} in connection with {inc_crime_id}."
            prop_count += 1

    db.commit()
    print(f"Updated {len(evidences)} evidences: {veh_count} vehicles, {wpn_count} weapons, {prop_count} stolen properties.")

def polish_alerts(db):
    print("--- Polishing Alerts ---")
    db.execute(delete(Alert))
    db.commit()

    incidents = db.scalars(select(Incident).order_by(Incident.occurred_at.desc()).limit(100)).all()
    suspects = db.scalars(select(Suspect).limit(50)).all()

    now = datetime.now(timezone.utc)
    alerts = []

    # Distribution over past 7 days (day 6 ago to today)
    # Day -6 (4), Day -5 (5), Day -4 (4), Day -3 (6), Day -2 (5), Day -1 (5), Day 0 (3) = 32 alerts
    day_counts = [4, 5, 4, 6, 5, 5, 3]

    # Severities: Critical (3), High (7), Medium (14), Low (8)
    severities = (
        [AlertSeverity.CRITICAL] * 3
        + [AlertSeverity.HIGH] * 7
        + [AlertSeverity.MEDIUM] * 14
        + [AlertSeverity.LOW] * 8
    )
    RNG.shuffle(severities)

    alert_idx = 0
    for day_offset_idx, count in enumerate(day_counts):
        day_ago = 6 - day_offset_idx  # 6, 5, 4, 3, 2, 1, 0
        for _ in range(count):
            sev = severities[alert_idx % len(severities)]
            inc = incidents[alert_idx % len(incidents)]
            sus = suspects[alert_idx % len(suspects)]
            area = area_name(inc.community_area) or "Nagpur City"
            locality = inc.block or "Market Road"

            created_time = now - timedelta(days=day_ago, hours=RNG.randint(1, 20), minutes=RNG.randint(0, 59))

            cat_choices = [
                AlertCategory.REPEAT_OFFENDER,
                AlertCategory.EMERGING_HOTSPOT,
                AlertCategory.CRIME_SPIKE,
                AlertCategory.HIGH_RISK_INCIDENT,
                AlertCategory.SYSTEM_ALERT,
            ]
            cat = cat_choices[alert_idx % len(cat_choices)]

            if cat == AlertCategory.REPEAT_OFFENDER:
                title = f"Repeat Offender Flag — {area}"
                message = f"Habitual accused {sus.name} (alias '{sus.alias or 'Babu'}') linked to fresh {inc.primary_type} case ({inc.crime_id}) in {area}. Subject has {RNG.randint(2, 6)} prior cases."
                action = f"Issue non-bailable surveillance warrant; alert beat constables in {area} sector."
            elif cat == AlertCategory.EMERGING_HOTSPOT:
                title = f"Emerging Hotspot Alert — {area}"
                cluster_count = RNG.randint(3, 7)
                message = f"Spatial cluster of {cluster_count} {inc.primary_type} incidents reported within 600m radius of {locality} over past 72 hours."
                action = f"Deploy extra PCR van and initiate static nakabandi checks at major chowks."
            elif cat == AlertCategory.CRIME_SPIKE:
                surge = RNG.randint(45, 120)
                title = f"Crime Volume Spike — Zone {inc.district or 1}"
                message = f"{inc.primary_type} volume increased by {surge}% above rolling baseline across {area} jurisdiction during evening hours."
                action = f"Review beat patrol rosters and coordinate with Assistant Commissioner of Police."
            elif cat == AlertCategory.HIGH_RISK_INCIDENT:
                title = f"High-Severity Incident — {area}"
                message = f"High-risk incident {inc.crime_id} ({inc.primary_type}) recorded in {area}. Weapons and physical injury reported at scene."
                action = f"Immediate Senior Inspector spot visit; secure material exhibits and verify CCTV feeds."
            else:
                title = f"Operational Patrol Alert — {area}"
                message = f"Night beat patrol coverage deficit identified in {area} Beat #{inc.beat or 12} during 02:00-05:00 shift."
                action = f"Reroute PCR Eagle van to cover unmonitored commercial perimeter."

            status = AlertStatus.ACTIVE
            if day_ago >= 4:
                status = RNG.choice([AlertStatus.ACKNOWLEDGED, AlertStatus.CLOSED])
            elif day_ago >= 2:
                status = RNG.choice([AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED])

            a = Alert(
                title=title,
                category=cat,
                severity=sev,
                status=status,
                message=message,
                recommended_action=action,
                area_name=area,
                latitude=inc.latitude,
                longitude=inc.longitude,
                related_incident_id=inc.id,
                created_at=created_time,
            )
            alerts.append(a)
            alert_idx += 1

    db.add_all(alerts)
    db.commit()
    print(f"Created {len(alerts)} polished alerts across all 7 days with calibrated severities.")

def polish_patrol(db):
    print("--- Polishing Patrol Routes ---")
    routes = db.scalars(select(PatrolRoute)).all()
    shifts = ["morning", "evening", "night"]
    priorities = ["Critical", "High", "Medium", "Low"]

    for i, r in enumerate(routes):
        # Evenly distribute shifts: 0->morning, 1->evening, 2->night
        r.shift = shifts[i % len(shifts)]
        # Distribute priorities: Critical (10%), High (40%), Medium (35%), Low (15%)
        if i % 10 == 0:
            r.priority = "Critical"
        elif i % 10 in (1, 2, 3, 4):
            r.priority = "High"
        elif i % 10 in (5, 6, 7):
            r.priority = "Medium"
        else:
            r.priority = "Low"

    db.commit()
    print(f"Updated {len(routes)} patrol routes with varied shifts and priorities.")

def polish_models(db):
    print("--- Polishing Model Registry ---")
    existing = db.scalars(select(MLModel)).all()
    existing_map = {(m.model_type, m.version): m for m in existing}

    versions = [
        # Hotspot Prediction (XGBoost Classifier)
        {
            "name": "Hotspot Prediction Model",
            "model_type": ModelType.HOTSPOT,
            "version": "v1.0",
            "algorithm": "XGBoost",
            "status": "Archived",
            "accuracy": 0.762,
            "precision": 0.694,
            "recall": 0.531,
            "f1_score": 0.602,
            "training_rows": 5200,
            "metrics": {"n_estimators": 100, "max_depth": 3, "learning_rate": 0.1},
            "confusion_matrix": [[780, 110], [145, 165]],
            "class_labels": ["Normal", "Hotspot"],
            "feature_importances": {"community_area": 0.35, "weekday": 0.18, "hour_bucket": 0.22, "avg_risk": 0.15, "night_ratio": 0.06, "weekend": 0.04},
            "trained_at": datetime.now(timezone.utc) - timedelta(days=28),
        },
        {
            "name": "Hotspot Prediction Model",
            "model_type": ModelType.HOTSPOT,
            "version": "v1.1",
            "algorithm": "XGBoost",
            "status": "Archived",
            "accuracy": 0.778,
            "precision": 0.710,
            "recall": 0.565,
            "f1_score": 0.629,
            "training_rows": 6800,
            "metrics": {"n_estimators": 150, "max_depth": 4, "learning_rate": 0.12},
            "confusion_matrix": [[805, 95], [132, 168]],
            "class_labels": ["Normal", "Hotspot"],
            "feature_importances": {"community_area": 0.38, "hour_bucket": 0.24, "weekday": 0.16, "avg_risk": 0.12, "night_ratio": 0.06, "weekend": 0.04},
            "trained_at": datetime.now(timezone.utc) - timedelta(days=14),
        },
        {
            "name": "Hotspot Prediction Model",
            "model_type": ModelType.HOTSPOT,
            "version": "v1.2",
            "algorithm": "XGBoost",
            "status": "Active",
            "accuracy": 0.7864,
            "precision": 0.723,
            "recall": 0.580,
            "f1_score": 0.643,
            "training_rows": 8000,
            "metrics": {"n_estimators": 180, "max_depth": 4, "learning_rate": 0.12, "subsample": 0.9},
            "confusion_matrix": [[825, 85], [126, 164]],
            "class_labels": ["Normal", "Hotspot"],
            "feature_importances": {"community_area": 0.40, "hour_bucket": 0.23, "avg_risk": 0.16, "weekday": 0.12, "night_ratio": 0.05, "weekend": 0.04},
            "trained_at": datetime.now(timezone.utc) - timedelta(days=2),
        },
        # Crime Volume Forecast (Gradient Boosting Regressor)
        {
            "name": "Crime Volume Forecast Model",
            "model_type": ModelType.VOLUME_FORECAST,
            "version": "v1.0",
            "algorithm": "GradientBoosting",
            "status": "Archived",
            "accuracy": 0.812,
            "precision": 0.795,
            "recall": 0.820,
            "f1_score": 0.807,
            "training_rows": 5200,
            "metrics": {"n_estimators": 120, "max_depth": 3, "learning_rate": 0.05, "mape": 0.188},
            "confusion_matrix": None,
            "class_labels": None,
            "feature_importances": {"lag_7_days": 0.44, "lag_14_days": 0.26, "weekday_pattern": 0.15, "moving_avg_30d": 0.10, "holiday_flag": 0.05},
            "trained_at": datetime.now(timezone.utc) - timedelta(days=26),
        },
        {
            "name": "Crime Volume Forecast Model",
            "model_type": ModelType.VOLUME_FORECAST,
            "version": "v1.1",
            "algorithm": "GradientBoosting",
            "status": "Archived",
            "accuracy": 0.829,
            "precision": 0.812,
            "recall": 0.835,
            "f1_score": 0.823,
            "training_rows": 6800,
            "metrics": {"n_estimators": 160, "max_depth": 3, "learning_rate": 0.05, "mape": 0.171},
            "confusion_matrix": None,
            "class_labels": None,
            "feature_importances": {"lag_7_days": 0.42, "lag_14_days": 0.27, "weekday_pattern": 0.15, "moving_avg_30d": 0.11, "holiday_flag": 0.05},
            "trained_at": datetime.now(timezone.utc) - timedelta(days=12),
        },
        {
            "name": "Crime Volume Forecast Model",
            "model_type": ModelType.VOLUME_FORECAST,
            "version": "v1.2",
            "algorithm": "GradientBoosting",
            "status": "Active",
            "accuracy": 0.846,
            "precision": 0.838,
            "recall": 0.852,
            "f1_score": 0.845,
            "training_rows": 8000,
            "metrics": {"n_estimators": 200, "max_depth": 3, "learning_rate": 0.05, "mape": 0.154},
            "confusion_matrix": None,
            "class_labels": None,
            "feature_importances": {"lag_7_days": 0.40, "lag_14_days": 0.28, "weekday_pattern": 0.15, "moving_avg_30d": 0.12, "holiday_flag": 0.05},
            "trained_at": datetime.now(timezone.utc) - timedelta(days=2),
        },
        # Area Risk Forecast (Random Forest / Multi-Output Regressor)
        {
            "name": "Area Risk Forecast Model",
            "model_type": ModelType.RISK_FORECAST,
            "version": "v1.0",
            "algorithm": "RandomForest",
            "status": "Archived",
            "accuracy": 0.795,
            "precision": 0.760,
            "recall": 0.772,
            "f1_score": 0.766,
            "training_rows": 5200,
            "metrics": {"n_estimators": 100, "max_depth": 4, "r2_score": 0.72},
            "confusion_matrix": None,
            "class_labels": None,
            "feature_importances": {"station_historical_velocity": 0.38, "recent_30d_severity": 0.28, "violent_crime_ratio": 0.18, "night_patrol_density": 0.10, "commercial_density": 0.06},
            "trained_at": datetime.now(timezone.utc) - timedelta(days=25),
        },
        {
            "name": "Area Risk Forecast Model",
            "model_type": ModelType.RISK_FORECAST,
            "version": "v1.1",
            "algorithm": "RandomForest",
            "status": "Archived",
            "accuracy": 0.810,
            "precision": 0.782,
            "recall": 0.790,
            "f1_score": 0.786,
            "training_rows": 6800,
            "metrics": {"n_estimators": 140, "max_depth": 4, "r2_score": 0.74},
            "confusion_matrix": None,
            "class_labels": None,
            "feature_importances": {"station_historical_velocity": 0.36, "recent_30d_severity": 0.30, "violent_crime_ratio": 0.17, "night_patrol_density": 0.11, "commercial_density": 0.06},
            "trained_at": datetime.now(timezone.utc) - timedelta(days=11),
        },
        {
            "name": "Area Risk Forecast Model",
            "model_type": ModelType.RISK_FORECAST,
            "version": "v1.2",
            "algorithm": "RandomForest",
            "status": "Active",
            "accuracy": 0.824,
            "precision": 0.805,
            "recall": 0.814,
            "f1_score": 0.809,
            "training_rows": 8000,
            "metrics": {"n_estimators": 180, "max_depth": 4, "r2_score": 0.76},
            "confusion_matrix": None,
            "class_labels": None,
            "feature_importances": {"station_historical_velocity": 0.35, "recent_30d_severity": 0.30, "violent_crime_ratio": 0.18, "night_patrol_density": 0.11, "commercial_density": 0.06},
            "trained_at": datetime.now(timezone.utc) - timedelta(days=1),
        },
    ]

    for v in versions:
        key = (v["model_type"], v["version"])
        if key in existing_map:
            m = existing_map[key]
            m.name = v["name"]
            m.algorithm = v.get("algorithm", "XGBoost")
            m.status = v["status"]
            m.accuracy = v["accuracy"]
            m.precision = v["precision"]
            m.recall = v["recall"]
            m.f1_score = v["f1_score"]
            m.metrics = v["metrics"]
            m.confusion_matrix = v["confusion_matrix"]
            m.class_labels = v["class_labels"]
            m.feature_importances = v["feature_importances"]
            m.trained_at = v["trained_at"]
        else:
            db.add(MLModel(**v))

    db.commit()
    print("Model registry seeded with all 3 model types (Hotspot, Volume, Risk) and 3 versions each.")

def main():
    db = SessionLocal()
    try:
        polish_evidence(db)
        polish_alerts(db)
        polish_patrol(db)
        polish_models(db)
        print("ALL SEED DATA POLISHED SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    main()
