"""Pydantic schemas for Job Description."""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class JobDescriptionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    company: str = Field(..., min_length=1, max_length=255)
    raw_text: str = Field(..., min_length=1)
    source_filename: str | None = None
    source_type: str = "manual"

class JobDescriptionCreate(JobDescriptionBase):
    pass

class JobDescriptionUpdate(BaseModel):
    title: str | None = None
    company: str | None = None
    raw_text: str | None = None
    source_filename: str | None = None
    source_type: str | None = None

class JobDescriptionResponse(JobDescriptionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
