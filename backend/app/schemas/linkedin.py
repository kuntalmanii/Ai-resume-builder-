"""LinkedIn Optimization Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class LinkedInProfileInput(BaseModel):
    headline: str | None = None
    about: str | None = None
    experience: Any | None = None
    projects: Any | None = None
    skills: Any | None = None


class LinkedInOptimizeRequest(BaseModel):
    resume_id: uuid.UUID | None = None
    profile_data: LinkedInProfileInput


class LinkedInOptimizationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    resume_id: uuid.UUID | None = None
    original_profile: dict[str, Any]
    optimized_profile: dict[str, Any]
    optimization_score: int
    recommendations: dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
