"""Case file — an evidence document / photo / report attached to an incident."""

from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class CaseFile(Base, TimestampMixin):
    __tablename__ = "case_files"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incident_id: Mapped[int] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(128))
    size_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    # Server-side file name inside UPLOAD_DIR (random, never user-controlled)
    stored_name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    # Evidence | FIR Copy | Photo | Medical Report | Panchnama | Statement | Other
    category: Mapped[str] = mapped_column(String(32), default="Evidence")
    description: Mapped[str | None] = mapped_column(Text)
    uploaded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    uploaded_by_name: Mapped[str | None] = mapped_column(String(255))
    download_count: Mapped[int] = mapped_column(Integer, default=0)
