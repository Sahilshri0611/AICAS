"""
FastAPI dependencies: DB session, current authenticated user, and
role/permission guards used to protect endpoints.
"""

from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.rbac import Permission, Role, has_permission
from app.core.security import ACCESS_TOKEN, decode_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")

_CRED_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(token)
    if not payload or payload.get("type") != ACCESS_TOKEN:
        raise _CRED_EXC
    user_id = payload.get("sub")
    if user_id is None:
        raise _CRED_EXC
    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise _CRED_EXC
    return user


def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def require_roles(*roles: Role) -> Callable[[User], User]:
    """Dependency factory — allow only the given roles."""
    allowed = {r.value for r in roles}

    def _guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(sorted(allowed))}",
            )
        return user

    return _guard


def require_permission(permission: Permission) -> Callable[[User], User]:
    """Dependency factory — allow only users whose role grants `permission`."""

    def _guard(user: User = Depends(get_current_user)) -> User:
        try:
            role = Role(user.role)
        except ValueError:
            raise _CRED_EXC
        if not has_permission(role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission.value}",
            )
        return user

    return _guard
