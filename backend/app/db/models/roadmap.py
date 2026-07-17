"""Roadmap ORM model."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    target_role: Mapped[str] = mapped_column(String(255), nullable=False)
    target_company: Mapped[str | None] = mapped_column(String(255), nullable=True)

    current_skills: Mapped[dict] = mapped_column(JSONBType, default=dict, nullable=False) # list of skills
    target_skills: Mapped[dict] = mapped_column(JSONBType, default=dict, nullable=False) # skill gaps

    plan: Mapped[dict] = mapped_column(JSONBType, default=dict, nullable=False) # milestones [{id, title, timeline, status, details, resources}]
    progress: Mapped[dict] = mapped_column(JSONBType, default=dict, nullable=False) # tracking state
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False) # active, completed, paused

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

    def __repr__(self) -> str:
        return f"<Roadmap id={self.id} role={self.target_role} status={self.status}>"
