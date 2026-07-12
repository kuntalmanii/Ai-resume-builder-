"""Pydantic schemas for Resume."""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class ResumeBase(BaseModel):
    title: str = Field("Untitled Resume", max_length=255)
    template_id: str = Field("modern", max_length=50)
    content: dict = Field(default_factory=dict)
    raw_text: str | None = None
    status: str = Field("draft", max_length=50)
    is_primary: bool = False
    source_type: str = Field("scratch", max_length=50)

class ResumeCreate(ResumeBase):
    pass

class ResumeUpdate(BaseModel):
    title: str | None = None
    template_id: str | None = None
    content: dict | None = None
    raw_text: str | None = None
    original_file_path: str | None = None
    original_filename: str | None = None
    status: str | None = None
    is_primary: bool | None = None
    source_type: str | None = None
    version: int | None = None

class ResumeResponse(ResumeBase):
    id: uuid.UUID
    user_id: uuid.UUID
    original_file_path: str | None = None
    original_filename: str | None = None
    version: int
    is_base: bool
    last_analyzed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class ResumeVersionResponse(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    version_number: int
    content_snapshot: dict
    change_reason: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
