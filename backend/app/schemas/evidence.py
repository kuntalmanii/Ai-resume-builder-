"""Evidence and Claim Schemas."""
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

class EvidenceSourceSchema(BaseModel):
    id: uuid.UUID
    label: str
    source_type: str
    evidence_strength: str
    support_kind: str
    verification_status: Optional[str] = None
    excerpt: Optional[str] = None

    class Config:
        from_attributes = True


class ResumeClaimSchema(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    claim_text: str
    claim_fingerprint: str
    source_section: str
    source_entry_id: Optional[str] = None
    verification_status: str
    contradiction_details: Optional[str] = None
    evidence_sources: List[EvidenceSourceSchema] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EvidenceMapResponse(BaseModel):
    claims: List[ResumeClaimSchema]
    evidence_credibility_score: int
