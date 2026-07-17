"""Analytics Pydantic schemas."""
from typing import Any

from pydantic import BaseModel


class FunnelStage(BaseModel):
    stage: str
    count: int
    conversion_rate: float


class ResumePerformanceMetric(BaseModel):
    resume_id: str
    title: str
    average_ats_score: float
    average_jd_match: float
    application_count: int


class SkillGapMetric(BaseModel):
    skill: str
    frequency_in_jds: int
    has_skill: bool


class AnalyticsSummaryResponse(BaseModel):
    total_applications: int
    interviews_scheduled: int
    offers_received: int
    rejections: int
    interview_rate: float
    offer_rate: float
    funnel: list[FunnelStage]
    resumes_performance: list[ResumePerformanceMetric]
    skill_gaps: list[SkillGapMetric]
    weekly_application_trends: list[dict[str, Any]]
    evidence_score_trend: list[dict[str, Any]]
