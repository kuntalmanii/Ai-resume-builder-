"""Portfolio ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    theme: Mapped[str] = mapped_column(
        String(50), default="minimal", nullable=False
    )  # minimal, developer, creative, corporate
    config: Mapped[dict] = mapped_column(
        JSONBType, default=dict, nullable=False
    )  # colors, fonts, social links, sections enabled
    content: Mapped[dict] = mapped_column(
        JSONBType, default=dict, nullable=False
    )  # projects, skills, education, experience, about

    export_path: Mapped[str | None] = mapped_column(String(512), nullable=True)  # static zip path
    published_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)  # draft, ready

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
        return f"<Portfolio id={self.id} theme={self.theme} status={self.status}>"
