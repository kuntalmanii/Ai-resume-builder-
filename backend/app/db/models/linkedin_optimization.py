"""LinkedInOptimization ORM model."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType


class LinkedInOptimization(Base):
    __tablename__ = "linkedin_optimizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resume_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True
    )

    original_profile: Mapped[dict] = mapped_column(JSONBType, default=dict, nullable=False) # headline, about, experience, skills, projects, featured
    optimized_profile: Mapped[dict] = mapped_column(JSONBType, default=dict, nullable=False) # improved recommendations

    optimization_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recommendations: Mapped[dict] = mapped_column(JSONBType, default=dict, nullable=False) # array of checklist suggestions

    status: Mapped[str] = mapped_column(String(50), default="complete", nullable=False) # pending, complete

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
    user = relationship("User")
    resume = relationship("Resume")

    def __repr__(self) -> str:
        return f"<LinkedInOptimization id={self.id} score={self.optimization_score}>"
