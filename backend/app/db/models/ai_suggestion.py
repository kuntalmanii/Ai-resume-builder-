"""AI Suggestion ORM model."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Float, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AISuggestion(Base):
    __tablename__ = "ai_suggestions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    analysis_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resume_analyses.id", ondelete="SET NULL"), nullable=True, index=True
    )
    job_description_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("job_descriptions.id", ondelete="SET NULL"), nullable=True, index=True
    )

    suggestion_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., keyword_add, phrasing, rewrite
    section_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., experience, summary
    section_entry_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # References nested JSONB items

    original_content: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_content: Mapped[str] = mapped_column(Text, nullable=False)
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    verification_status: Mapped[str] = mapped_column(String(50), nullable=False, default="unverified")  # verified, partially_verified, unverified
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")  # pending, accepted, rejected, edited

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    resume: Mapped["Resume"] = relationship("Resume", back_populates="ai_suggestions")  # type: ignore[name-defined]
    analysis: Mapped["ResumeAnalysis"] = relationship("ResumeAnalysis", back_populates="ai_suggestions")  # type: ignore[name-defined]
    job_description: Mapped["JobDescription"] = relationship("JobDescription", back_populates="ai_suggestions")  # type: ignore[name-defined]
    evidence_sources: Mapped[list["EvidenceSource"]] = relationship(  # type: ignore[name-defined]
        "EvidenceSource", back_populates="ai_suggestion", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<AISuggestion id={self.id} confidence={self.confidence} status={self.status}>"
