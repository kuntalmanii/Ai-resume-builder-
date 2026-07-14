"""Resume Analysis ORM model.

Scoring Rules & Weights:
- ATS Compatibility: 20
- Content Strength: 20
- Job Description Match: 25
- Completeness: 10
- Readability: 10
- Grammar: 5
- Evidence and Credibility: 10

JD Score Normalization Decision:
- If a resume is analyzed WITHOUT a job description (resume-only mode),
  the job_description_id and jd_match_score are set to Null.
- In this case, to avoid penalizing the user for the missing 25 points,
  the overall_score is calculated out of the remaining 75 points and normalized to a 100-point scale:
  overall_score = Math.round((sum_of_other_categories / 75) * 100).
- If a job description is provided, overall_score is the direct sum of all categories (out of 100).
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
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
    job_description_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_descriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    overall_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Detailed category scores
    ats_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content_strength_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    jd_match_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completeness_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    readability_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    grammar_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    evidence_credibility_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Scoring metadata
    resume_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    raw_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    raw_max_score: Mapped[int] = mapped_column(Integer, nullable=False, default=75)

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    analysis_version: Mapped[str] = mapped_column(String(50), nullable=False, default="ats-v1.0")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    resume: Mapped["Resume"] = relationship("Resume", back_populates="analyses")  # type: ignore[name-defined]
    user: Mapped["User"] = relationship("User", back_populates="analyses")  # type: ignore[name-defined]
    job_description: Mapped["JobDescription"] = relationship("JobDescription", back_populates="analyses")  # type: ignore[name-defined]
    checks: Mapped[list["AnalysisCheck"]] = relationship(  # type: ignore[name-defined]
        "AnalysisCheck", back_populates="analysis", cascade="all, delete-orphan"
    )
    ai_suggestions: Mapped[list["AISuggestion"]] = relationship(  # type: ignore[name-defined]
        "AISuggestion", back_populates="analysis", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ResumeAnalysis id={self.id} score={self.overall_score}>"
