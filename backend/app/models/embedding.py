"""
Vector Embedding model for CrimeSense AI.

Stores dense semantic vector representations of incident narratives,
modus operandi, suspect profiles, and seized material evidence.
Vectors are stored as serialized NumPy float32 arrays (BYTEA) in PostgreSQL
and indexed in-memory for microsecond cosine similarity search.
"""

from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class IncidentEmbedding(Base):
    __tablename__ = "incident_embeddings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    incident_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("incidents.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    incident: Mapped["Incident"] = relationship(back_populates="vector_embedding")  # noqa: F821

    def __repr__(self) -> str:
        return f"<IncidentEmbedding incident_id={self.incident_id}>"
