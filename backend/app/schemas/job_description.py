import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.job_match_requirements import JobDescriptionRequirements


class JobDescriptionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    company: str = Field(..., min_length=1, max_length=255)
    raw_text: str = Field(..., min_length=1)
    source_filename: str | None = None
    source_type: str = "manual"


class JobDescriptionCreate(BaseModel):
    title: str | None = Field(None, max_length=255)
    company: str | None = Field(None, max_length=255)
    raw_text: str = Field(..., min_length=1)
    source_filename: str | None = None
    source_type: str = "manual"

    @field_validator("raw_text")
    @classmethod
    def validate_raw_text(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Job description text cannot be empty.")
        return v


class JobDescriptionUpdate(BaseModel):
    title: str | None = None
    company: str | None = None
    raw_text: str | None = None
    source_filename: str | None = None
    source_type: str | None = None


class JobDescriptionResponse(JobDescriptionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    parsed_requirements: JobDescriptionRequirements | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
