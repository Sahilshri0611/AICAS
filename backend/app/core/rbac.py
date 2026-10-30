"""
Role-Based Access Control.

Defines the role hierarchy and the permission matrix. Roles are ordered by
authority level; a higher level implicitly inherits the permissions of all
lower levels, plus any explicitly granted to it.
"""

from enum import Enum
from typing import Dict, Set


class Role(str, Enum):
    ADMIN = "admin"
    COMMISSIONER = "commissioner"
    COMMANDER = "commander"
    INVESTIGATOR = "investigator"
    OFFICER = "officer"


# Higher number = more authority
ROLE_LEVEL: Dict[Role, int] = {
    Role.OFFICER: 1,
    Role.INVESTIGATOR: 2,
    Role.COMMANDER: 3,
    Role.COMMISSIONER: 4,
    Role.ADMIN: 5,
}


class Permission(str, Enum):
    # Records / incidents
    VIEW_INCIDENTS = "view_incidents"
    CREATE_INCIDENT = "create_incident"
    EDIT_INCIDENT = "edit_incident"
    DELETE_INCIDENT = "delete_incident"
    EXPORT_RECORDS = "export_records"
    # FIR
    PARSE_FIR = "parse_fir"
    # Alerts
    VIEW_ALERTS = "view_alerts"
    MANAGE_ALERTS = "manage_alerts"      # acknowledge / assign / close / note
    # Analytics & models
    VIEW_ANALYTICS = "view_analytics"
    MANAGE_MODELS = "manage_models"      # retrain / activate / archive
    # Network
    VIEW_NETWORK = "view_network"
    # Admin
    MANAGE_USERS = "manage_users"
    VIEW_AUDIT = "view_audit"


# Permissions granted directly to each role (inherited downward via level).
_ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.OFFICER: {
        Permission.VIEW_INCIDENTS,
        Permission.CREATE_INCIDENT,
        Permission.PARSE_FIR,
        Permission.VIEW_ALERTS,
        Permission.VIEW_NETWORK,
        Permission.VIEW_ANALYTICS,
    },
    Role.INVESTIGATOR: {
        Permission.EDIT_INCIDENT,
        Permission.EXPORT_RECORDS,
        Permission.VIEW_NETWORK,
        Permission.VIEW_ANALYTICS,
        Permission.MANAGE_ALERTS,
    },
    Role.COMMANDER: {
        Permission.DELETE_INCIDENT,
    },
    Role.COMMISSIONER: {
        Permission.VIEW_AUDIT,
    },
    Role.ADMIN: {
        Permission.MANAGE_MODELS,
        Permission.MANAGE_USERS,
        Permission.VIEW_AUDIT,
    },
}


def permissions_for(role: Role) -> Set[Permission]:
    """Resolve the full permission set for a role, inheriting all lower roles."""
    level = ROLE_LEVEL[role]
    perms: Set[Permission] = set()
    for r, lvl in ROLE_LEVEL.items():
        if lvl <= level:
            perms |= _ROLE_PERMISSIONS.get(r, set())
    return perms


def has_permission(role: Role, permission: Permission) -> bool:
    return permission in permissions_for(role)


# Serializable matrix for the frontend / settings screen.
def permission_matrix() -> Dict[str, list[str]]:
    return {role.value: sorted(p.value for p in permissions_for(role)) for role in Role}
