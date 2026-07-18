"""Job Match Result ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType

if TYPE_CHECKING:
    from app.db.models.job_description import JobDescription
    from app.db.models.resume import Resume


class JobMatchResult(Base):
    __tablename__ = "job_match_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_description_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_descriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    resume_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    matching_version: Mapped[str] = mapped_column(
        String(50), nullable=False, default="jd-match-v1.0"
    )

    overall_match_percentage: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    potential_match_percentage: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    exact_match_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    semantic_match_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    skills_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    required_skills_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    preferred_skills_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    experience_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    keyword_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    education_certification_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Detailed matches & gaps stored as JSONB list entries
    exact_keyword_matches: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONBType, default=list, nullable=False
    )
    semantic_matches: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONBType, default=list, nullable=False
    )
    missing_keywords: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONBType, default=list, nullable=False
    )
    skill_gaps: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONBType, default=list, nullable=False
    )
    experience_gaps: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONBType, default=list, nullable=False
    )
    hidden_experiences: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONBType, default=list, nullable=False
    )

    matched_requirements: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONBType, default=list, nullable=False
    )
    missing_requirements: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONBType, default=list, nullable=False
    )
    hidden_profile_matches: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONBType, default=list, nullable=False
    )
    recommendations: Mapped[list[str]] = mapped_column(JSONBType, default=list, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    resume: Mapped[Resume] = relationship("Resume", back_populates="match_results")
    job_description: Mapped[JobDescription] = relationship(
        "JobDescription", back_populates="match_results"
    )

    def __repr__(self) -> str:
        return f"<JobMatchResult id={self.id} match={self.overall_match_percentage}%>"
