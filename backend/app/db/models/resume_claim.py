"""Resume Claim ORM model."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ResumeClaim(Base):
    __tablename__ = "resume_claims"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True
    )

    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    claim_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    source_section: Mapped[str] = mapped_column(String(50), nullable=False)
    source_entry_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    resume_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    claim_type: Mapped[str] = mapped_column(String(50), nullable=False, default="responsibility")
    normalized_value: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    field_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bullet_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    original_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    verification_status: Mapped[str] = mapped_column(String(50), nullable=False, default="unverified")  # unverified, verified, contradictory
    contradiction_details: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    resume: Mapped["Resume"] = relationship("Resume", back_populates="claims")  # type: ignore[name-defined]
    evidence_sources: Mapped[list["EvidenceSource"]] = relationship(  # type: ignore[name-defined]
        "EvidenceSource", back_populates="resume_claim", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ResumeClaim id={self.id} status={self.verification_status}>"
