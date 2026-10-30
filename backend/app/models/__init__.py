"""
Model package. Importing everything here ensures all mappers are registered
on Base.metadata (required for Alembic autogenerate and relationship resolution).
"""

from app.models.alert import Alert, AlertNote
from app.models.audit import AuditLog
from app.models.case_file import CaseFile
from app.models.crime import Area, Incident, Suspect, incident_suspect
from app.models.embedding import IncidentEmbedding
from app.models.evidence import MaterialEvidence
from app.models.fir import FIRDocument
from app.models.model_registry import MLModel
from app.models.patrol import PatrolLog, PatrolRoute
from app.models.surveillance import ANPRDetection, CCTVCamera, VehicleHotlist
from app.models.user import User

__all__ = [
    "User",
    "Incident",
    "Area",
    "Suspect",
    "incident_suspect",
    "FIRDocument",
    "Alert",
    "AlertNote",
    "MLModel",
    "AuditLog",
    "CaseFile",
    "MaterialEvidence",
    "IncidentEmbedding",
    "CCTVCamera",
    "ANPRDetection",
    "VehicleHotlist",
    "PatrolRoute",
    "PatrolLog",
]
