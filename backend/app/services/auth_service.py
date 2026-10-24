"""Authentication & user-management service."""

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.auth import Token, UserCreate, UserUpdate


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)

    def authenticate(self, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account disabled")
        return user

    def issue_tokens(self, user: User) -> Token:
        return Token(
            access_token=create_access_token(user.id, user.role, {"email": user.email}),
            refresh_token=create_refresh_token(user.id),
        )

    def create_user(self, data: UserCreate) -> User:
        if self.users.get_by_email(data.email):
            raise HTTPException(status_code=400, detail="Email already registered")
        user = self.users.create(
            email=data.email,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
            role=data.role.value,
            badge_number=data.badge_number,
            department=data.department,
        )
        self.users.commit()
        return user

    def update_user(self, user_id: int, data: UserUpdate) -> User:
        user = self.users.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        payload = data.model_dump(exclude_unset=True)
        if "password" in payload and payload["password"]:
            user.hashed_password = hash_password(payload.pop("password"))
        if "role" in payload and payload["role"] is not None:
            user.role = payload.pop("role").value
        for k, v in payload.items():
            setattr(user, k, v)
        self.users.commit()
        return user

    def get_by_refresh(self, user_id: int) -> Optional[User]:
        return self.users.get(user_id)
