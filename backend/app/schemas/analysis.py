"""Pydantic schemas for Resume Analysis."""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class ScoreDeductionSchema(BaseModel):
    reason: str
    points: int

class RecommendationSchema(BaseModel):
    id: uuid.UUID
    category: str
    title: str
    description: str
    impact: str  # high, medium, low
    actionable_text: str

class AnalysisCheckResponse(BaseModel):
    id: uuid.UUID
    analysis_id: uuid.UUID
    category: str
    check_code: str
    title: str
    description: str
    status: str  # passed, warning, failed
    points_possible: int
    points_awarded: int
    recommendation: str | None = None
    evidence_data: dict | None = None

    model_config = {"from_attributes": True}

class ResumeAnalysisResponse(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    user_id: uuid.UUID
    job_description_id: uuid.UUID | None = None
    
    overall_score: int
    ats_score: int
    content_strength_score: int
    jd_match_score: int | None = None
    completeness_score: int
    readability_score: int
    grammar_score: int
    evidence_credibility_score: int
    
    status: str
    analysis_version: str
    created_at: datetime

    model_config = {"from_attributes": True}
