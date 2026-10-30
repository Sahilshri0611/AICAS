"""FIR (First Information Report) document + AI parse result model."""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.enums import FIRStatus


class FIRDocument(Base, TimestampMixin):
    __tablename__ = "fir_documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[FIRStatus] = mapped_column(String(24), default=FIRStatus.UPLOADED, index=True)

    # OCR output
    ocr_text: Mapped[str | None] = mapped_column(Text)
    ocr_confidence: Mapped[float | None] = mapped_column(Float)

    # LLM structured extraction (JSON blob of all extracted fields)
    extracted: Mapped[dict | None] = mapped_column(JSONB)
    # Per-field confidence scores {field: 0..1}
    field_confidence: Mapped[dict | None] = mapped_column(JSONB)
    # Fields flagged as low-confidence for human review
    flagged_fields: Mapped[list | None] = mapped_column(JSONB)

    overall_confidence: Mapped[float | None] = mapped_column(Float)
    risk_score: Mapped[float | None] = mapped_column(Float)

    # Link to the created incident (once approved)
    incident_id: Mapped[int | None] = mapped_column(ForeignKey("incidents.id"))
    uploaded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    processed_at: Mapped[datetime | None] = mapped_column(DateTime)
    error_message: Mapped[str | None] = mapped_column(Text)

    # File storage metadata
    file_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    file_size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    file_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    original_pdf_stored: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

