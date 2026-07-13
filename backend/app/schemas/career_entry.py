"""Pydantic schemas for Career Entry (individual Smart Profile items)."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

EntryType = Literal[
    "education",
    "work_experience",
    "internship",
    "project",
    "technical_skill",
    "soft_skill",
    "certification",
    "achievement",
    "position_of_responsibility",
    "language",
    "interest",
]

VerificationStatus = Literal["unverified", "user_confirmed", "source_verified"]

SourceType = Literal["manual", "resume_import", "previous_resume", "github", "external_source"]


class CareerEntryBase(BaseModel):
    entry_type: EntryType
    title: str = Field(..., min_length=1, max_length=255)
    organization: str = Field(..., min_length=1, max_length=255)
    start_date: str | None = Field(None, max_length=50)
    end_date: str | None = Field(None, max_length=50)
    is_current: bool = False
    data: dict = Field(default_factory=dict)
    source_type: SourceType = "manual"


class CareerEntryCreate(CareerEntryBase):
    pass


class CareerEntryUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    organization: str | None = Field(None, min_length=1, max_length=255)
    start_date: str | None = Field(None, max_length=50)
    end_date: str | None = Field(None, max_length=50)
    is_current: bool | None = None
    data: dict | None = None


class CareerEntryResponse(CareerEntryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    verification_status: VerificationStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
