"""Pydantic schemas for Job Match Results, AI Suggestions, and Evidence."""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class JobMatchResultResponse(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    job_description_id: uuid.UUID
    
    overall_match_percentage: int
    exact_match_score: int
    semantic_match_score: int
    skills_score: int
    experience_score: int

    exact_keyword_matches: list[dict] = Field(default_factory=list)
    semantic_matches: list[dict] = Field(default_factory=list)
    missing_keywords: list[dict] = Field(default_factory=list)
    skill_gaps: list[dict] = Field(default_factory=list)
    experience_gaps: list[dict] = Field(default_factory=list)
    hidden_experiences: list[dict] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}

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
