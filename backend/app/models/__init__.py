"""
Model package. Importing everything here ensures all mappers are registered
on Base.metadata (required for Alembic autogenerate and relationship resolution).
"""

from app.models.alert import Alert, AlertNote
from app.models.audit import AuditLog
from app.models.case_file import CaseFile
from app.models.crime import Area, Incident, Suspect, incident_suspect
from app.models.fir import FIRDocument
from app.models.model_registry import MLModel
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
]
