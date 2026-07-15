"""Pydantic schemas for AI Suggestion models."""
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class ClaimValidationResult(BaseModel):
    claim_text: str
    claim_type: str  # e.g., metric, technology, scope, responsibility, role
    support_status: str  # supported, partially_supported, unsupported, contradictory, user_confirmation_required
    supporting_sources: List[str] = Field(default_factory=list)
    risk_level: str  # low, medium, high, blocked

class EvidenceSourceResponse(BaseModel):
    id: uuid.UUID
    label: str
    source_type: str
    source_id: Optional[str] = None
    source_section: Optional[str] = None
    source_entry_id: Optional[str] = None
    source_field: Optional[str] = None
    excerpt: Optional[str] = None
    evidence_strength: str
    support_kind: str
    verification_status: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SuggestionResponse(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    job_description_id: Optional[uuid.UUID] = None
    analysis_id: Optional[uuid.UUID] = None
    match_result_id: Optional[uuid.UUID] = None
    source_resume_version: int
    suggestion_type: str
    target_section: str
    target_entry_id: Optional[str] = None
    target_field: str
    target_index: Optional[int] = None
    original_text: str
    suggested_text: str
    edited_text: Optional[str] = None
    rationale: Optional[str] = None
    risk_level: str
    claim_validation: List[ClaimValidationResult] = Field(default_factory=list)
    expected_score_gain: Optional[int] = None
    provider_name: Optional[str] = None
    model_name: Optional[str] = None
    status: str
    applied_at: Optional[datetime] = None
    evidence_sources: List[EvidenceSourceResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SuggestionGenerateRequest(BaseModel):
    suggestion_type: str  # e.g. bullet_enhancement, summary_generation, ats_fix, jd_targeted_rewrite
    target_section: str  # summary, experience, projects
    target_entry_id: Optional[str] = None
    target_field: str = "content"
    target_index: Optional[int] = None
    job_description_id: Optional[uuid.UUID] = None
    analysis_id: Optional[uuid.UUID] = None
    match_result_id: Optional[uuid.UUID] = None
    instruction: Optional[str] = None

    @field_validator("suggestion_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        valid_types = [
            "summary_generation", "summary_rewrite", "bullet_enhancement", 
            "bullet_rewrite", "grammar_correction", "conciseness", 
            "action_verb_improvement", "ats_fix", "jd_targeted_rewrite", 
            "achievement_question"
        ]
        if v not in valid_types:
            raise ValueError(f"Invalid suggestion type. Must be one of: {valid_types}")
        return v

class SuggestionBatchGenerateRequest(BaseModel):
    mode: str  # ats_driven, jd_targeted, full_audit
    job_description_id: Optional[uuid.UUID] = None
    analysis_id: Optional[uuid.UUID] = None
    match_result_id: Optional[uuid.UUID] = None
    max_suggestions: int = Field(5, ge=1, le=10)

class SuggestionEditRequest(BaseModel):
    suggested_text: str = Field(..., min_length=1)

class AchievementAnswerRequest(BaseModel):
    answer: str = Field(..., min_length=1)

class AIStatusResponse(BaseModel):
    status: str  # available, degraded, unavailable
    provider_name: Optional[str] = None
    model_name: Optional[str] = None
