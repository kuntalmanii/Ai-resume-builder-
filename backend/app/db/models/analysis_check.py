"""Analysis Check ORM model."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType

if TYPE_CHECKING:
    from app.db.models.analysis import ResumeAnalysis


class AnalysisCheck(Base):
    __tablename__ = "analysis_checks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resume_analyses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    check_code: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # passed, warning, failed

    points_possible: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    points_awarded: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_data: Mapped[dict[str, Any] | None] = mapped_column(JSONBType, nullable=True)

    # Relationships
    analysis: Mapped[ResumeAnalysis] = relationship("ResumeAnalysis", back_populates="checks")

    def __repr__(self) -> str:
        return f"<AnalysisCheck id={self.id} title={self.title} status={self.status}>"
