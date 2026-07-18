"""Pydantic schemas for Resume Exports."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ExportSettings(BaseModel):
    accent_color: str = "modern"
    paper_size: str = "a4"
    margin_top: str = "15mm"
    margin_bottom: str = "15mm"
    margin_left: str = "15mm"
    margin_right: str = "15mm"
    font_scale: float = 1.0
    show_page_numbers: bool = True
    ats_mode: bool = False
    section_visibility: dict[str, bool] = Field(default_factory=dict)
    section_ordering: list[str] | None = None


class ExportCreateRequest(BaseModel):
    template_id: str = "modern"
    settings: ExportSettings | None = None
    force: bool | None = False


class ResumeExportResponse(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    resume_version: int
    template_id: str
    settings: dict
    page_count: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
