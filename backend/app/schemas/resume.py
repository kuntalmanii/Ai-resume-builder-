"""Pydantic schemas for Resume."""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

# ─── Sub-schemas for strongly validated sections ──────────────────────────────

class PersonalInformation(BaseModel):
    full_name: str | None = ""
    email: str | None = ""
    phone: str | None = ""
    location: str | None = ""
    professional_title: str | None = ""
    linkedin_url: str | None = ""
    github_url: str | None = ""
    portfolio_url: str | None = ""


class EducationEntry(BaseModel):
    id: str | None = None
    institution: str
    degree: str
    field_of_study: str | None = ""
    location: str | None = ""
    start_date: str | None = ""
    end_date: str | None = ""
    is_current: bool | None = False
    grade: str | None = ""
    description: str | None = ""
    order: int | None = 0


class ExperienceEntry(BaseModel):
    id: str | None = None
    company: str
    position: str
    location: str | None = ""
    start_date: str | None = ""
    end_date: str | None = ""
    is_current: bool | None = False
    employment_type: str | None = ""
    bullets: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    order: int | None = 0


class ProjectEntry(BaseModel):
    id: str | None = None
    name: str
    description: str | None = ""
    url: str | None = ""
    github_url: str | None = ""
    start_date: str | None = ""
    end_date: str | None = ""
    bullets: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    order: int | None = 0


class SkillGroup(BaseModel):
    id: str | None = None
    category: str
    skills: list[str] = Field(default_factory=list)
    order: int | None = 0


class CertificationEntry(BaseModel):
    id: str | None = None
    name: str
    issuer: str | None = ""
    issue_date: str | None = ""
    expiration_date: str | None = ""
    credential_id: str | None = ""
    credential_url: str | None = ""
    order: int | None = 0


class AchievementEntry(BaseModel):
    id: str | None = None
    title: str
    description: str | None = ""
    date: str | None = ""
    order: int | None = 0


class PositionOfResponsibilityEntry(BaseModel):
    id: str | None = None
    organization: str
    position: str
    start_date: str | None = ""
    end_date: str | None = ""
    is_current: bool | None = False
    bullets: list[str] = Field(default_factory=list)
    order: int | None = 0


class LanguageEntry(BaseModel):
    id: str | None = None
    language: str
    proficiency: str | None = ""
    order: int | None = 0


class InterestEntry(BaseModel):
    id: str | None = None
    name: str
    order: int | None = 0


# ─── Strong Resume Document Schema ───────────────────────────────────────────

class ResumeDocument(BaseModel):
    personal_information: PersonalInformation = Field(default_factory=PersonalInformation)
    professional_summary: str = ""
    education: list[EducationEntry] = Field(default_factory=list)
    experience: list[ExperienceEntry] = Field(default_factory=list)
    projects: list[ProjectEntry] = Field(default_factory=list)
    skills: list[SkillGroup] = Field(default_factory=list)
    certifications: list[CertificationEntry] = Field(default_factory=list)
    achievements: list[AchievementEntry] = Field(default_factory=list)
    positions_of_responsibility: list[PositionOfResponsibilityEntry] = Field(default_factory=list)
    languages: list[LanguageEntry] = Field(default_factory=list)
    interests: list[InterestEntry] = Field(default_factory=list)
    section_order: list[str] = Field(default_factory=list)

    @field_validator("section_order", mode="before")
    @classmethod
    def validate_section_order(cls, v: Any) -> list[str]:
        allowed = {
            "personal_information",
            "professional_summary",
            "education",
            "experience",
            "projects",
            "skills",
            "certifications",
            "achievements",
            "positions_of_responsibility",
            "languages",
            "interests",
        }
        if not v:
            return [
                "personal_information",
                "professional_summary",
                "education",
                "experience",
                "projects",
                "skills",
                "certifications",
                "achievements",
                "positions_of_responsibility",
                "languages",
                "interests",
            ]
        if not isinstance(v, list):
            raise ValueError("section_order must be a list of strings")
        if len(v) != len(set(v)):
            raise ValueError("Duplicate keys found in section_order")
        for key in v:
            if key not in allowed:
                raise ValueError(f"Invalid section key: {key}")
        return v


# ─── Resume Main Request/Response Schemas ─────────────────────────────────────

class ResumeBase(BaseModel):
    title: str = Field("Untitled Resume", max_length=255)
    template_id: str = Field("modern", max_length=50)
    content: ResumeDocument = Field(default_factory=ResumeDocument)
    raw_text: str | None = None
    status: str = Field("draft", max_length=50)
    is_primary: bool = False
    source_type: str = Field("scratch", max_length=50)


class ResumeCreate(BaseModel):
    title: str = Field("Untitled Resume", max_length=255)
    template_id: str | None = "modern"
    content: ResumeDocument | None = None
    raw_text: str | None = None
    status: str | None = "draft"
    is_primary: bool | None = False
    source_type: str | None = "scratch"


class ResumeUpdate(BaseModel):
    title: str | None = None
    template_id: str | None = None
    content: ResumeDocument | None = None
    raw_text: str | None = None
    original_file_path: str | None = None
    original_filename: str | None = None
    status: str | None = None
    is_primary: bool | None = None
    source_type: str | None = None
    version: int | None = None


class ResumeResponse(ResumeBase):
    id: uuid.UUID
    user_id: uuid.UUID
    original_file_path: str | None = None
    original_filename: str | None = None
    version: int
    is_base: bool
    last_analyzed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    latest_score: int | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj: Any, *args, **kwargs):
        instance = super().model_validate(obj, *args, **kwargs)
        if hasattr(obj, "__dict__") and "analyses" in obj.__dict__:
            analyses = obj.__dict__["analyses"]
            if analyses:
                sorted_analyses = sorted(analyses, key=lambda a: a.created_at or datetime.min, reverse=True)
                if sorted_analyses:
                    instance.latest_score = sorted_analyses[0].overall_score
        return instance


class ResumeVersionResponse(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    version_number: int
    content_snapshot: ResumeDocument
    change_reason: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
