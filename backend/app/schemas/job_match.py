"""Pydantic schemas for Job Match Results, AI Suggestions, and Evidence."""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class JobMatchResultResponse(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    job_description_id: uuid.UUID
    resume_version: int
    matching_version: str

    overall_match_percentage: int
    potential_match_percentage: int
    exact_match_score: int
    semantic_match_score: int
    skills_score: int
    required_skills_score: int
    preferred_skills_score: int
    experience_score: int
    keyword_score: int
    education_certification_score: int

    exact_keyword_matches: list[dict] = Field(default_factory=list)
    semantic_matches: list[dict] = Field(default_factory=list)
    missing_keywords: list[dict] = Field(default_factory=list)
    skill_gaps: list[dict] = Field(default_factory=list)
    experience_gaps: list[dict] = Field(default_factory=list)
    hidden_experiences: list[dict] = Field(default_factory=list)

    matched_requirements: list[dict] = Field(default_factory=list)
    missing_requirements: list[dict] = Field(default_factory=list)
    hidden_profile_matches: list[dict] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    is_stale: bool = False
    ai_fallback_active: bool = False

    created_at: datetime

    model_config = {"from_attributes": True}

class JobMatchRunRequest(BaseModel):
    job_description_id: uuid.UUID

class JobMatchMethodologyResponse(BaseModel):
    matching_version: str
    categories: list[dict]
    scoring_description: str

class EvidenceSourceResponse(BaseModel):
    id: uuid.UUID
    ai_suggestion_id: uuid.UUID
    label: str
    source_type: str
    source_reference: str | None = None
    verified: bool
    evidence_excerpt: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

class AISuggestionResponse(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    analysis_id: uuid.UUID | None = None
    job_description_id: uuid.UUID | None = None

    suggestion_type: str
    section_type: str
    section_entry_id: str | None = None
    original_content: str
    suggested_content: str
    reasoning: str | None = None
    confidence: float
    verification_status: str
    status: str

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
