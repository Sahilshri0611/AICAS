"""Physical and material evidence models (Muddayemal / Property Seizure Register)."""

from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class MaterialEvidence(Base, TimestampMixin):
    """
    Physical / material evidence (Muddayemal) seized under BNSS Sec 105 / CrPC Sec 102.
    Tracks vehicles, weapons, stolen property, electronics, and cash in Malkhana custody.
    """
    __tablename__ = "material_evidences"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incident_id: Mapped[int] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # Vehicle | Weapon | Stolen Property | Electronic Device | Cash | Narcotics | Other
    item_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Registration plate (e.g. MH-31-AB-1234), IMEI, or weapon markings
    identifier: Mapped[str | None] = mapped_column(String(128), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    # Seizure Memo / Panchnama reference number
    seizure_memo_no: Mapped[str | None] = mapped_column(String(64), index=True)
    seized_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)
    # In Malkhana | Seized at PS Yard | Sent to FSL | Released on Supurdari | Produced in Court
    custody_status: Mapped[str] = mapped_column(String(32), default="In Malkhana", index=True)
    custody_location: Mapped[str | None] = mapped_column(String(255))
    linked_suspect_id: Mapped[int | None] = mapped_column(ForeignKey("suspects.id"))
    seized_by_name: Mapped[str | None] = mapped_column(String(255))

    incident: Mapped["Incident"] = relationship(back_populates="material_evidences")
