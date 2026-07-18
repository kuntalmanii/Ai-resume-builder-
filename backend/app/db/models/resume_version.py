"""Resume Version ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType

if TYPE_CHECKING:
    from app.db.models.resume import Resume


class ResumeVersion(Base):
    __tablename__ = "resume_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    content_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONBType, nullable=False)
    change_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    resume: Mapped[Resume] = relationship("Resume", back_populates="versions")

    # Constraints
    __table_args__ = (
        UniqueConstraint("resume_id", "version_number", name="uq_resume_version_number"),
    )

    def __repr__(self) -> str:
        return f"<ResumeVersion resume_id={self.resume_id} version={self.version_number}>"
