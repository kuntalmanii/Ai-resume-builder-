"""Resume Analysis ORM model."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Optional job description for JD matching
    job_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Backend-controlled scores (LLM cannot set these directly)
    total_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    score_breakdown: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Detailed reports
    ats_report: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    jd_match_report: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # AI suggestions with Evidence Mode metadata
    # Each suggestion: {suggestion, evidence_source, confidence, reasoning, is_fabricated, user_decision}
    ai_suggestions: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    resume: Mapped["Resume"] = relationship("Resume", back_populates="analyses")  # type: ignore[name-defined]
    user: Mapped["User"] = relationship("User", back_populates="analyses")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<ResumeAnalysis id={self.id} score={self.total_score}>"
