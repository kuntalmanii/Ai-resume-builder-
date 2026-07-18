"""Evidence Audit ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.resume import Resume


class EvidenceAudit(Base):
    __tablename__ = "evidence_audits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resume_version: Mapped[int] = mapped_column(Integer, nullable=False)
    credibility_version: Mapped[str] = mapped_column(String(50), nullable=False)
    evidence_state_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)

    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_score: Mapped[float] = mapped_column(Float, nullable=False)
    raw_applicable_max: Mapped[float] = mapped_column(Float, nullable=False)

    claim_support_score: Mapped[float] = mapped_column(Float, nullable=False)
    internal_consistency_score: Mapped[float] = mapped_column(Float, nullable=False)
    career_profile_score: Mapped[float] = mapped_column(Float, nullable=False)
    high_risk_support_score: Mapped[float] = mapped_column(Float, nullable=False)
    transparency_score: Mapped[float] = mapped_column(Float, nullable=False)

    claim_count: Mapped[int] = mapped_column(Integer, nullable=False)
    contradiction_count: Mapped[int] = mapped_column(Integer, nullable=False)
    unsupported_count: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="completed"
    )  # completed, stale, failed
    ai_fallback_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    resume: Mapped[Resume] = relationship("Resume", back_populates="audits")

    def __repr__(self) -> str:
        return f"<EvidenceAudit id={self.id} score={self.overall_score} status={self.status}>"
