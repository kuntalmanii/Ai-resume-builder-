"""Cover Letter Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class CoverLetterGenerateRequest(BaseModel):
    resume_id: uuid.UUID
    job_description_id: uuid.UUID | None = None
    job_description_text: str | None = None  # fallback to manual JD paste
    application_id: uuid.UUID | None = None
    style_preference: str | None = "professional"  # professional, creative, modern, etc.


class CoverLetterBase(BaseModel):
    title: str = "Untitled Cover Letter"
    content: str


class CoverLetterCreate(CoverLetterBase):
    resume_id: uuid.UUID
    application_id: uuid.UUID | None = None
    job_description_id: uuid.UUID | None = None
    is_grounded: bool = False
    generation_metadata: dict[str, Any] = {}


class CoverLetterUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    is_grounded: bool | None = None


class CoverLetterResponse(CoverLetterBase):
    id: uuid.UUID
    user_id: uuid.UUID
    resume_id: uuid.UUID
    application_id: uuid.UUID | None = None
    job_description_id: uuid.UUID | None = None
    version: int
    parent_id: uuid.UUID | None = None
    is_grounded: bool
    generation_metadata: dict[str, Any]
    export_path: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
