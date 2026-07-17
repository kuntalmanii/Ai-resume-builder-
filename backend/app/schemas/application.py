"""Application Pydantic schemas."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InterviewBase(BaseModel):
    round_type: str = Field(..., description="Round type, e.g. screening, technical")
    scheduled_at: datetime
    duration_minutes: int = 60
    location: str | None = None
    format: str = "video"
    interviewer: str | None = None
    notes: str | None = None
    outcome: str | None = None


class InterviewCreate(InterviewBase):
    pass


class InterviewResponse(InterviewBase):
    id: uuid.UUID
    application_id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Application Schemas ──────────────────────────────────────────────────────

class ApplicationBase(BaseModel):
    company: str
    role: str
    location: str | None = None
    status: str = "Wishlist"

    salary_min: int | None = None
    salary_max: int | None = None
    currency: str = "USD"

    recruiter_name: str | None = None
    recruiter_email: str | None = None
    recruiter_phone: str | None = None

    source: str | None = None
    url: str | None = None
    notes: str | None = None

    applied_at: datetime | None = None
    deadline_at: datetime | None = None


class ApplicationCreate(ApplicationBase):
    job_description_id: uuid.UUID | None = None
    resume_version_id: uuid.UUID | None = None


class ApplicationUpdate(BaseModel):
    company: str | None = None
    role: str | None = None
    location: str | None = None
    status: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str | None = None
    recruiter_name: str | None = None
    recruiter_email: str | None = None
    recruiter_phone: str | None = None
    source: str | None = None
    url: str | None = None
    notes: str | None = None
    applied_at: datetime | None = None
    deadline_at: datetime | None = None
    job_description_id: uuid.UUID | None = None
    resume_version_id: uuid.UUID | None = None


class ApplicationStatusUpdate(BaseModel):
    status: str


class ApplicationResponse(ApplicationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    job_description_id: uuid.UUID | None = None
    resume_version_id: uuid.UUID | None = None

    interviews: list[InterviewResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
