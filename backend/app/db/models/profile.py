"""Career Profile ORM model — stores structured career data per user."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType


class CareerProfile(Base):
    __tablename__ = "career_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    # General User Profile fields merged directly
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    professional_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    professional_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    portfolio_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Structured career data stored as JSONB for flexibility
    education: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)
    experience: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)
    projects: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)
    skills: Mapped[dict] = mapped_column(JSONBType, default=dict, nullable=False)
    certifications: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)
    achievements: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)
    positions_of_responsibility: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)
    languages: Mapped[list[dict]] = mapped_column(JSONBType, default=list, nullable=False)
    interests: Mapped[list[str]] = mapped_column(JSONBType, default=list, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="career_profile")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<CareerProfile user_id={self.user_id}>"
