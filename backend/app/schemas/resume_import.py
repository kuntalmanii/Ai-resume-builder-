"""Pydantic schemas for Resume Import Sessions."""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.resume import ResumeDocument


class ResumeImportSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    original_filename: str
    document_type: str
    status: str
    extraction_metadata: dict = Field(default_factory=dict)
    parsed_document: ResumeDocument
    parsing_warnings: list[str] = Field(default_factory=list)
    detected_sections: list[str] = Field(default_factory=list)
    missing_sections: list[str] = Field(default_factory=list)
    expires_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResumeImportUpdate(BaseModel):
    parsed_document: ResumeDocument


class ResumeImportFinalize(BaseModel):
    title: str | None = Field(None, max_length=255)
    template_id: str = Field("modern", max_length=50)
    import_to_career_profile: bool = False
    selected_entries: list[str] | None = None
