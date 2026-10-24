"""User repository."""

from typing import Optional

from sqlalchemy import select

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.scalar(select(User).where(User.email == email))

    def list_all(self) -> list[User]:
        return list(self.db.scalars(select(User).order_by(User.id)).all())
