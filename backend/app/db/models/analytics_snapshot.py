"""AnalyticsSnapshot ORM model."""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    metrics: Mapped[dict] = mapped_column(JSONBType, default=dict, nullable=False) # computed analytic ratios, counts, scores

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User")

    def __repr__(self) -> str:
        return f"<AnalyticsSnapshot id={self.id} date={self.snapshot_date}>"
