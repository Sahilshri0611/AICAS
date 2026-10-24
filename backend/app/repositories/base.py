"""
Generic repository implementing the repository pattern over SQLAlchemy 2.0.
Concrete repositories subclass this and add domain-specific queries.
"""

from typing import Generic, List, Optional, Sequence, Type, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    model: Type[ModelT]

    def __init__(self, db: Session):
        self.db = db

    def get(self, id_: int) -> Optional[ModelT]:
        return self.db.get(self.model, id_)

    def list(self, skip: int = 0, limit: int = 100) -> Sequence[ModelT]:
        stmt = select(self.model).offset(skip).limit(limit)
        return self.db.scalars(stmt).all()

    def count(self) -> int:
        return self.db.scalar(select(func.count()).select_from(self.model)) or 0

    def add(self, obj: ModelT) -> ModelT:
        self.db.add(obj)
        self.db.flush()
        return obj

    def create(self, **kwargs) -> ModelT:
        obj = self.model(**kwargs)
        return self.add(obj)

    def update(self, obj: ModelT, **kwargs) -> ModelT:
        for k, v in kwargs.items():
            if v is not None and hasattr(obj, k):
                setattr(obj, k, v)
        self.db.flush()
        return obj

    def delete(self, obj: ModelT) -> None:
        self.db.delete(obj)
        self.db.flush()

    def commit(self) -> None:
        self.db.commit()
