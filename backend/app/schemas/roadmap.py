"""Roadmap Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class RoadmapGenerateRequest(BaseModel):
    target_role: str
    target_company: str | None = None


class RoadmapProgressUpdate(BaseModel):
    milestone_id: str
    is_completed: bool


class RoadmapResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    target_role: str
    target_company: str | None = None
    current_skills: dict[str, Any]
    target_skills: dict[str, Any]
    plan: dict[str, Any]
    progress: dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
