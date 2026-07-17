"""Pydantic schemas for AI Suggestion models."""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ClaimValidationResult(BaseModel):
    claim_text: str
    claim_type: str  # e.g., metric, technology, scope, responsibility, role
    support_status: str  # supported, partially_supported, unsupported, contradictory, user_confirmation_required
    supporting_sources: list[str] = Field(default_factory=list)
    risk_level: str  # low, medium, high, blocked

class EvidenceSourceResponse(BaseModel):
    id: uuid.UUID
    label: str
    source_type: str
    source_id: str | None = None
    source_section: str | None = None
    source_entry_id: str | None = None
    source_field: str | None = None
    excerpt: str | None = None
    evidence_strength: str
    support_kind: str
    verification_status: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

class SuggestionResponse(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    job_description_id: uuid.UUID | None = None
    analysis_id: uuid.UUID | None = None
    match_result_id: uuid.UUID | None = None
    source_resume_version: int
    suggestion_type: str
    target_section: str
    target_entry_id: str | None = None
    target_field: str
    target_index: int | None = None
    original_text: str
    suggested_text: str
    edited_text: str | None = None
    rationale: str | None = None
    risk_level: str
    claim_validation: list[ClaimValidationResult] = Field(default_factory=list)
    expected_score_gain: int | None = None
    provider_name: str | None = None
    model_name: str | None = None
    status: str
    applied_at: datetime | None = None
    evidence_sources: list[EvidenceSourceResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SuggestionGenerateRequest(BaseModel):
    suggestion_type: str  # e.g. bullet_enhancement, summary_generation, ats_fix, jd_targeted_rewrite
    target_section: str  # summary, experience, projects
    target_entry_id: str | None = None
    target_field: str = "content"
    target_index: int | None = None
    job_description_id: uuid.UUID | None = None
    analysis_id: uuid.UUID | None = None
    match_result_id: uuid.UUID | None = None
    instruction: str | None = None

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
    job_description_id: uuid.UUID | None = None
    analysis_id: uuid.UUID | None = None
    match_result_id: uuid.UUID | None = None
    max_suggestions: int = Field(5, ge=1, le=10)

class SuggestionEditRequest(BaseModel):
    suggested_text: str = Field(..., min_length=1)

class AchievementAnswerRequest(BaseModel):
    answer: str = Field(..., min_length=1)

class AIStatusResponse(BaseModel):
    status: str  # available, degraded, unavailable
    provider_name: str | None = None
    model_name: str | None = None
