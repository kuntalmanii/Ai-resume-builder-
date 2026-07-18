"""Job Description ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType

if TYPE_CHECKING:
    from app.db.models.ai_suggestion import AISuggestion
    from app.db.models.analysis import ResumeAnalysis
    from app.db.models.job_match_result import JobMatchResult
    from app.db.models.user import User


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)

    source_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")
    parsed_requirements: Mapped[dict[str, Any] | None] = mapped_column(JSONBType, nullable=True)

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
    user: Mapped[User] = relationship("User", back_populates="job_descriptions")
    analyses: Mapped[list[ResumeAnalysis]] = relationship(
        "ResumeAnalysis", back_populates="job_description", cascade="all, delete-orphan"
    )
    match_results: Mapped[list[JobMatchResult]] = relationship(
        "JobMatchResult", back_populates="job_description", cascade="all, delete-orphan"
    )
    ai_suggestions: Mapped[list[AISuggestion]] = relationship(
        "AISuggestion", back_populates="job_description", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<JobDescription id={self.id} title={self.title} company={self.company}>"
