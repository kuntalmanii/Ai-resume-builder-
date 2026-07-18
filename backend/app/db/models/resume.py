"""Resume ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Untitled Resume")
    template_id: Mapped[str] = mapped_column(String(50), nullable=False, default="modern")

    # Structured resume content (sections, bullet points, etc.)
    content: Mapped[dict] = mapped_column(JSONBType, default=dict, nullable=False)

    # Plain text representation for ATS analysis
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # For uploaded resumes
    original_file_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, default="scratch")

    # Versioning
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_base: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    last_analyzed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
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
    user: Mapped["User"] = relationship("User", back_populates="resumes")  # type: ignore[name-defined]
    analyses: Mapped[list["ResumeAnalysis"]] = relationship(  # type: ignore[name-defined]
        "ResumeAnalysis", back_populates="resume", cascade="all, delete-orphan"
    )
    versions: Mapped[list["ResumeVersion"]] = relationship(  # type: ignore[name-defined]
        "ResumeVersion", back_populates="resume", cascade="all, delete-orphan"
    )
    match_results: Mapped[list["JobMatchResult"]] = relationship(  # type: ignore[name-defined]
        "JobMatchResult", back_populates="resume", cascade="all, delete-orphan"
    )
    ai_suggestions: Mapped[list["AISuggestion"]] = relationship(  # type: ignore[name-defined]
        "AISuggestion", back_populates="resume", cascade="all, delete-orphan"
    )
    claims: Mapped[list["ResumeClaim"]] = relationship(  # type: ignore[name-defined]
        "ResumeClaim", back_populates="resume", cascade="all, delete-orphan"
    )
    audits: Mapped[list["EvidenceAudit"]] = relationship(  # type: ignore[name-defined]
        "EvidenceAudit", back_populates="resume", cascade="all, delete-orphan"
    )
    exports: Mapped[list["ResumeExport"]] = relationship(  # type: ignore[name-defined]
        "ResumeExport", back_populates="resume", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Resume id={self.id} title={self.title}>"
