"""Pydantic schemas for 1-Click AI Resume Tailor & Visual Diff Engine."""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, Field


class XYZStructure(BaseModel):
    accomplishment: str = Field(
        ..., description="The core achievement or metric accomplishment [X]."
    )
    metric: str = Field(..., description="The quantifiable measurement or impact metric [Y].")
    action: str = Field(..., description="The technical method or action taken [Z].")


class BulletDiff(BaseModel):
    bullet_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    section_name: str = Field(..., description="Section such as Experience or Projects.")
    item_title: str = Field(..., description="Job title, organization, or project name.")
    original_bullet: str = Field(..., description="Original passive bullet point text.")
    tailored_bullet: str = Field(
        ..., description="Tailored bullet using Google's X-Y-Z formula."
    )
    xyz_structure: XYZStructure | None = None
    matched_keywords: list[str] = Field(
        default_factory=list, description="JD keywords integrated into this bullet."
    )
    status: str = Field(
        default="pending", description="Status of the suggestion: pending, accepted, rejected."
    )


class ResumeTailorRequest(BaseModel):
    job_description_id: uuid.UUID | None = None
    job_description_text: str | None = None
    target_role: str | None = None
    focus_skills: list[str] = Field(default_factory=list)


class ResumeTailorResponse(BaseModel):
    resume_id: uuid.UUID
    original_version: int
    tailored_version: int
    job_description_id: uuid.UUID | None = None
    target_role: str
    estimated_ats_score_before: int = 70
    estimated_ats_score_after: int = 92
    bullets: list[BulletDiff]
    tailored_content: dict[str, Any]
