"""Shared domain enumerations used across models and schemas."""

from enum import Enum


class RiskLevel(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class IncidentStatus(str, Enum):
    OPEN = "Open"
    UNDER_REVIEW = "Under Review"
    ASSIGNED = "Assigned"
    CLOSED = "Closed"
    ARCHIVED = "Archived"


class AlertCategory(str, Enum):
    CRIME_SPIKE = "Crime Spike"
    HIGH_RISK_INCIDENT = "High Risk Incident"
    REPEAT_OFFENDER = "Repeat Offender"
    EMERGING_HOTSPOT = "Emerging Hotspot"
    SYSTEM_ALERT = "System Alert"


class AlertSeverity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class AlertStatus(str, Enum):
    ACTIVE = "Active"
    ACKNOWLEDGED = "Acknowledged"
    ASSIGNED = "Assigned"
    CLOSED = "Closed"


class FIRStatus(str, Enum):
    UPLOADED = "Uploaded"
    OCR_RUNNING = "OCR Running"
    PARSING = "Parsing"
    PARSED = "Parsed"
    NEEDS_REVIEW = "Needs Review"
    APPROVED = "Approved"
    FAILED = "Failed"


class ModelStatus(str, Enum):
    TRAINING = "Training"
    ACTIVE = "Active"
    ARCHIVED = "Archived"
    FAILED = "Failed"


class ModelType(str, Enum):
    HOTSPOT = "Hotspot Prediction"
    VOLUME_FORECAST = "Crime Volume Forecast"
    RISK_FORECAST = "Area Risk Forecast"


class NodeType(str, Enum):
    SUSPECT = "Suspect"
    INCIDENT = "Incident"
    LOCATION = "Location"


class EdgeType(str, Enum):
    SAME_SUSPECT = "Same Suspect"
    SAME_VEHICLE = "Same Vehicle"
    SAME_LOCATION = "Same Location"
    SIMILAR_MO = "Similar MO"


class CameraStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"


class CameraType(str, Enum):
    PTZ = "PTZ"
    FIXED = "Fixed"
    ANPR = "ANPR"


class HotlistStatus(str, Enum):
    ACTIVE = "active"
    FOUND = "found"
    REMOVED = "removed"


class PatrolShift(str, Enum):
    DAY = "day"
    NIGHT = "night"
    EVENING = "evening"


class PatrolPriority(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class PatrolStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PatrolLogStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABORTED = "aborted"

