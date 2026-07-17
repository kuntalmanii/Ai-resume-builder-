"""Resume Import Session ORM model."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONBType


class ResumeImportSession(Base):
    __tablename__ = "resume_import_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="uploaded")

    # Metadata about extraction (page count, character count, etc.)
    extraction_metadata: Mapped[dict] = mapped_column(JSONBType, default=dict, nullable=False)

    # The parsed ResumeDocument (Pydantic schema serialized to dict)
    parsed_document: Mapped[dict] = mapped_column(JSONBType, default=dict, nullable=False)

    parsing_warnings: Mapped[list] = mapped_column(JSONBType, default=list, nullable=False)
    detected_sections: Mapped[list] = mapped_column(JSONBType, default=list, nullable=False)
    missing_sections: Mapped[list] = mapped_column(JSONBType, default=list, nullable=False)

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
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
    user: Mapped["User"] = relationship("User")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<ResumeImportSession id={self.id} status={self.status}>"
