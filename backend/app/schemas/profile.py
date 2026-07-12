"""Pydantic schemas for Career Profile."""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ─── Sub-schemas ──────────────────────────────────────────────────────────────

class EducationEntry(BaseModel):
    institution: str = Field(..., min_length=1)
    degree: str = Field(..., min_length=1)
    field_of_study: str = ""
    start_date: str = ""  # "YYYY-MM" or "YYYY"
    end_date: str = ""    # "YYYY-MM", "YYYY", or "Present"
    gpa: str = ""
    description: str = ""
    is_current: bool = False


class ExperienceEntry(BaseModel):
    company: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    is_current: bool = False
    description: str = ""
    bullet_points: list[str] = Field(default_factory=list)


class ProjectEntry(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    technologies: list[str] = Field(default_factory=list)
    url: str = ""
    github_url: str = ""
    start_date: str = ""
    end_date: str = ""


class SkillsMap(BaseModel):
    technical: list[str] = Field(default_factory=list)
    soft: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    languages_prog: list[str] = Field(default_factory=list)


class CertificationEntry(BaseModel):
    name: str = Field(..., min_length=1)
    issuer: str = ""
    issue_date: str = ""
    expiry_date: str = ""
    credential_id: str = ""
    url: str = ""


class AchievementEntry(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = ""
    date: str = ""
    issuer: str = ""


class PositionEntry(BaseModel):
    role: str = Field(..., min_length=1)
    organization: str = Field(..., min_length=1)
    start_date: str = ""
    end_date: str = ""
    description: str = ""


class LanguageEntry(BaseModel):
    language: str = Field(..., min_length=1)
    proficiency: str = ""  # Native, Fluent, Professional, Conversational, Basic


# ─── Main Profile Schemas ─────────────────────────────────────────────────────

class CareerProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    
    phone: str | None = None
    location: str | None = None
    professional_title: str | None = None
    professional_summary: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None

    education: list[EducationEntry] = Field(default_factory=list)
    experience: list[ExperienceEntry] = Field(default_factory=list)
    projects: list[ProjectEntry] = Field(default_factory=list)
    skills: SkillsMap = Field(default_factory=SkillsMap)
    certifications: list[CertificationEntry] = Field(default_factory=list)
    achievements: list[AchievementEntry] = Field(default_factory=list)
    positions_of_responsibility: list[PositionEntry] = Field(default_factory=list)
    languages: list[LanguageEntry] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CareerProfileUpdate(BaseModel):
    phone: str | None = None
    location: str | None = None
    professional_title: str | None = None
    professional_summary: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None

    education: list[EducationEntry] | None = None
    experience: list[ExperienceEntry] | None = None
    projects: list[ProjectEntry] | None = None
    skills: SkillsMap | None = None
    certifications: list[CertificationEntry] | None = None
    achievements: list[AchievementEntry] | None = None
    positions_of_responsibility: list[PositionEntry] | None = None
    languages: list[LanguageEntry] | None = None
    interests: list[str] | None = None


class ProfileSectionPatch(BaseModel):
    data: Any  # validated per-section in the service layer
