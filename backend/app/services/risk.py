"""
Risk scoring domain logic.

Maps a crime head + contextual signals (time of day, domestic flag) to a
0..1 risk score and a discrete RiskLevel. Shared by seeding, the FIR pipeline,
bulk import and manual record creation so scoring stays consistent everywhere.
"""

from datetime import datetime
from typing import Optional

from app.models.enums import RiskLevel
from app.services.crime_catalog import CRIME_HEADS, normalize_crime_type

CRIME_SEVERITY: dict[str, float] = {name: h.severity for name, h in CRIME_HEADS.items()}

_RISK_BANDS = [
    (0.75, RiskLevel.CRITICAL),
    (0.50, RiskLevel.HIGH),
    (0.25, RiskLevel.MEDIUM),
    (0.0, RiskLevel.LOW),
]


def base_severity(crime_type: str) -> float:
    return CRIME_SEVERITY.get(normalize_crime_type(crime_type), 0.30)


def compute_risk_score(
    crime_type: str,
    occurred_at: Optional[datetime] = None,
    domestic: bool = False,
    hour: Optional[int] = None,
) -> float:
    score = base_severity(crime_type)
    if hour is None and occurred_at is not None:
        hour = occurred_at.hour
    if hour is not None and (hour >= 22 or hour <= 5):
        score = min(score + 0.05, 1.0)
    if domestic:
        score = min(score + 0.03, 1.0)
    return round(score, 2)


def risk_level_for(score: float) -> RiskLevel:
    for threshold, level in _RISK_BANDS:
        if score >= threshold:
            return level
    return RiskLevel.LOW
