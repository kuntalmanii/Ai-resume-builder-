"""Job Match Result ORM model."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType


class JobMatchResult(Base):
    __tablename__ = "job_match_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_description_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    overall_match_percentage: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    exact_match_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    semantic_match_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    skills_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    experience_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Detailed matches & gaps stored as JSONB list entries
    exact_keyword_matches: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)
    semantic_matches: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)
    missing_keywords: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)
    skill_gaps: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)
    experience_gaps: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)
    hidden_experiences: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    resume: Mapped["Resume"] = relationship("Resume", back_populates="match_results")  # type: ignore[name-defined]
    job_description: Mapped["JobDescription"] = relationship("JobDescription", back_populates="match_results")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<JobMatchResult id={self.id} match={self.overall_match_percentage}%>"
