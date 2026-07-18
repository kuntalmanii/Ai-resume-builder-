"""AI Suggestion ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType


class AISuggestion(Base):
    __tablename__ = "ai_suggestions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    analysis_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resume_analyses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    job_description_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_descriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    match_result_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_match_results.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    source_resume_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    suggestion_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # e.g., summary_generation, bullet_enhancement, ats_fix
    target_section: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # e.g., summary, experience, education
    target_entry_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # References nested JSONB items
    target_field: Mapped[str] = mapped_column(
        String(50), nullable=False, default="content"
    )  # e.g. bullet text, summary content
    target_index: Mapped[int | None] = mapped_column(Integer, nullable=True)

    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_text: Mapped[str] = mapped_column(Text, nullable=False)
    edited_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_level: Mapped[str] = mapped_column(
        String(50), nullable=False, default="low"
    )  # low, medium, high, blocked

    # List of claim validation objects
    claim_validation: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)
    expected_score_gain: Mapped[int | None] = mapped_column(Integer, nullable=True)

    provider_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(50), nullable=True)

    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending"
    )  # pending, accepted, edited, rejected, applied, expired, invalidated
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

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
    analysis: Mapped["ResumeAnalysis"] = relationship(
        "ResumeAnalysis", back_populates="ai_suggestions"
    )  # type: ignore[name-defined]
    job_description: Mapped["JobDescription"] = relationship(
        "JobDescription", back_populates="ai_suggestions"
    )  # type: ignore[name-defined]
    evidence_sources: Mapped[list["EvidenceSource"]] = relationship(  # type: ignore[name-defined]
        "EvidenceSource", back_populates="ai_suggestion", cascade="all, delete-orphan"
    )

    # Compatibility Properties
    @property
    def section_type(self) -> str:
        return self.target_section

    @section_type.setter
    def section_type(self, value: str) -> None:
        self.target_section = value

    @property
    def section_entry_id(self) -> str | None:
        return self.target_entry_id

    @section_entry_id.setter
    def section_entry_id(self, value: str | None) -> None:
        self.target_entry_id = value

    @property
    def original_content(self) -> str:
        return self.original_text

    @original_content.setter
    def original_content(self, value: str) -> None:
        self.original_text = value

    @property
    def suggested_content(self) -> str:
        return self.suggested_text

    @suggested_content.setter
    def suggested_content(self, value: str) -> None:
        self.suggested_text = value

    @property
    def reasoning(self) -> str | None:
        return self.rationale

    @reasoning.setter
    def reasoning(self, value: str | None) -> None:
        self.rationale = value

    @property
    def confidence(self) -> float:
        return 0.9

    @confidence.setter
    def confidence(self, value: float) -> None:
        pass

    @property
    def verification_status(self) -> str:
        return "verified" if self.risk_level == "low" else "unverified"

    @verification_status.setter
    def verification_status(self, value: str) -> None:
        pass

    def __repr__(self) -> str:
        return f"<AISuggestion id={self.id} risk={self.risk_level} status={self.status}>"
