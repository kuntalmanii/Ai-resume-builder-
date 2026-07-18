"""Evidence Source ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.ai_suggestion import AISuggestion
    from app.db.models.resume_claim import ResumeClaim


class EvidenceSource(Base):
    __tablename__ = "evidence_sources"
    __table_args__ = (
        CheckConstraint(
            "(ai_suggestion_id IS NULL) <> (resume_claim_id IS NULL)",
            name="check_evidence_parent_exclusive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ai_suggestion_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_suggestions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    resume_claim_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resume_claims.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    label: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # resume_content, career_profile_user_confirmed, etc.

    source_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_section: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_entry_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_field: Mapped[str | None] = mapped_column(String(50), nullable=True)

    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_strength: Mapped[str] = mapped_column(
        String(50), nullable=False, default="contextual"
    )  # direct, corroborating, contextual, insufficient
    support_kind: Mapped[str] = mapped_column(
        String(50), nullable=False, default="relevance_context"
    )  # factual_support, relevance_context
    verification_status: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # unverified, user_confirmed, source_verified
    contradiction_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relationships
    ai_suggestion: Mapped[AISuggestion] = relationship(
        "AISuggestion", back_populates="evidence_sources"
    )
    resume_claim: Mapped[ResumeClaim] = relationship(
        "ResumeClaim", back_populates="evidence_sources"
    )

    # Compatibility Properties
    @property
    def verified(self) -> bool:
        return (
            self.verification_status in ["user_confirmed", "source_verified"]
            or self.evidence_strength == "direct"
        )

    @verified.setter
    def verified(self, value: bool) -> None:
        self.verification_status = "user_confirmed" if value else "unverified"

    @property
    def evidence_excerpt(self) -> str | None:
        return self.excerpt

    @evidence_excerpt.setter
    def evidence_excerpt(self, value: str | None) -> None:
        self.excerpt = value

    @property
    def source_reference(self) -> str | None:
        return self.source_id

    @source_reference.setter
    def source_reference(self, value: str | None) -> None:
        self.source_id = value

    def __repr__(self) -> str:
        return f"<EvidenceSource id={self.id} type={self.source_type} kind={self.support_kind}>"
