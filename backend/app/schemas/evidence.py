"""Evidence and Claim Schemas."""
import uuid
from datetime import datetime

from pydantic import BaseModel


class EvidenceSourceSchema(BaseModel):
    id: uuid.UUID
    label: str
    source_type: str
    evidence_strength: str
    support_kind: str
    verification_status: str | None = None
    excerpt: str | None = None
    contradiction_reason: str | None = None

    class Config:
        from_attributes = True


class ResumeClaimSchema(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    claim_text: str
    claim_fingerprint: str
    source_section: str
    source_entry_id: str | None = None
    resume_version: int
    claim_type: str
    normalized_value: str
    field_name: str | None = None
    bullet_index: int | None = None
    original_text: str | None = None
    verification_status: str
    contradiction_details: str | None = None
    evidence_sources: list[EvidenceSourceSchema] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EvidenceMapResponse(BaseModel):
    claims: list[ResumeClaimSchema]
    evidence_credibility_score: int
    ai_fallback_active: bool = False


class EvidenceAuditSchema(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    resume_version: int
    credibility_version: str
    evidence_state_fingerprint: str
    overall_score: int
    raw_score: float
    raw_applicable_max: float
    claim_support_score: float
    internal_consistency_score: float
    career_profile_score: float
    high_risk_support_score: float
    transparency_score: float
    claim_count: int
    contradiction_count: int
    unsupported_count: int
    status: str
    ai_fallback_active: bool
    summary: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ClaimConfirmationRequest(BaseModel):
    note: str | None = None


class CareerEntryLinkRequest(BaseModel):
    career_entry_id: uuid.UUID
