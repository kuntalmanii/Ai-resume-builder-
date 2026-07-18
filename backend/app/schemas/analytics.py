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


class ApplicationsSummary(BaseModel):
    total: int = 0
    wishlist: int = 0
    applied: int = 0
    interviewing: int = 0
    offer: int = 0
    rejected: int = 0
    conversion_rate: float = 0.0


class InterviewsSummary(BaseModel):
    total: int = 0
    average_score: float = 0.0


class RoadmapsSummary(BaseModel):
    total: int = 0
    completed_steps: int = 0
    total_steps: int = 0
    completion_rate: float = 0.0


class CredibilitySummary(BaseModel):
    score: float = 0.0
    audit_date: str | None = None


class AnalyticsSummaryResponse(BaseModel):
    total_applications: int = 0
    interviews_scheduled: int = 0
    offers_received: int = 0
    rejections: int = 0
    interview_rate: float = 0.0
    offer_rate: float = 0.0
    funnel: list[FunnelStage] = []
    resumes_performance: list[ResumePerformanceMetric] = []
    skill_gaps: list[SkillGapMetric] = []
    weekly_application_trends: list[dict[str, Any]] = []
    evidence_score_trend: list[dict[str, Any]] = []

    # Nested structures expected by the UI
    applications: ApplicationsSummary = ApplicationsSummary()
    interviews: InterviewsSummary = InterviewsSummary()
    roadmaps: RoadmapsSummary = RoadmapsSummary()
    credibility: CredibilitySummary = CredibilitySummary()
