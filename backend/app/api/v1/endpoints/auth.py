"""Authentication & user-management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.core.rbac import Permission, permission_matrix
from app.core.security import REFRESH_TOKEN, decode_token
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    Token,
    TokenRefresh,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    svc = AuthService(db)
    user = svc.authenticate(payload.email, payload.password)
    return AuthResponse(user=UserRead.model_validate(user), tokens=svc.issue_tokens(user))


@router.post("/token", response_model=Token, include_in_schema=False)
def login_oauth(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 password flow (used by Swagger 'Authorize')."""
    svc = AuthService(db)
    user = svc.authenticate(form.username, form.password)
    return svc.issue_tokens(user)


@router.post("/refresh", response_model=Token)
def refresh(payload: TokenRefresh, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != REFRESH_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    svc = AuthService(db)
    user = svc.get_by_refresh(int(data["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return svc.issue_tokens(user)


@router.get("/me", response_model=UserRead)
def me(current: User = Depends(get_current_user)):
    return current


@router.get("/permissions")
def permissions():
    """RBAC matrix — roles → granted permissions (for the Settings screen)."""
    return permission_matrix()


# ── User administration ──
@router.get("/users", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
):
    return AuthService(db).users.list_all()


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
):
    return AuthService(db).create_user(payload)


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
):
    return AuthService(db).update_user(user_id, payload)
