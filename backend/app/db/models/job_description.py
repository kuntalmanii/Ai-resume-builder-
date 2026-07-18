"""Job Description ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType


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
    parsed_requirements: Mapped[dict | None] = mapped_column(JSONBType, nullable=True)

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
    user: Mapped["User"] = relationship("User", back_populates="job_descriptions")  # type: ignore[name-defined]
    analyses: Mapped[list["ResumeAnalysis"]] = relationship(  # type: ignore[name-defined]
        "ResumeAnalysis", back_populates="job_description", cascade="all, delete-orphan"
    )
    match_results: Mapped[list["JobMatchResult"]] = relationship(  # type: ignore[name-defined]
        "JobMatchResult", back_populates="job_description", cascade="all, delete-orphan"
    )
    ai_suggestions: Mapped[list["AISuggestion"]] = relationship(  # type: ignore[name-defined]
        "AISuggestion", back_populates="job_description", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<JobDescription id={self.id} title={self.title} company={self.company}>"
