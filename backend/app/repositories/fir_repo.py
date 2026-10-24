"""FIR document repository."""

from typing import Sequence

from sqlalchemy import desc, select

from app.models.fir import FIRDocument
from app.repositories.base import BaseRepository


class FIRRepository(BaseRepository[FIRDocument]):
    model = FIRDocument

    def recent(self, limit: int = 50) -> Sequence[FIRDocument]:
        return self.db.scalars(
            select(FIRDocument).order_by(desc(FIRDocument.created_at)).limit(limit)
        ).all()
