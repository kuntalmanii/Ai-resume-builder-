"""Pydantic schemas for Resume Analysis — Phase 9.

All schemas are read-optimized (no user-submitted analysis data).
The scoring engine produces the values; users can only trigger analysis
and read results.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ─── Analysis Check ───────────────────────────────────────────────────────────

class AnalysisCheckResponse(BaseModel):
    """A single scored check within an analysis."""
    id: uuid.UUID
    analysis_id: uuid.UUID
    category: str           # ats | content | completeness | readability | grammar | evidence
    check_code: str         # e.g. ATS_CONTACT_INFO
    title: str
    description: str
    status: str             # passed | warning | failed
    points_possible: int
    points_awarded: int
    points_lost: int        # convenience: points_possible - points_awarded
    recommendation: str | None = None
    evidence_data: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


# ─── Top Recommendation ───────────────────────────────────────────────────────

class TopRecommendationSchema(BaseModel):
    """A prioritized recommendation derived from failed/warning checks."""
    check_code: str
    category: str
    title: str
    recommendation: str
    points_possible: int
    points_lost: int
    status: str  # failed | warning


# ─── Category Breakdown ───────────────────────────────────────────────────────

class CategoryBreakdownSchema(BaseModel):
    """Per-category score breakdown."""
    category: str
    normalized: int     # 0–100
    raw_score: int
    max_score: int
    check_count: int
    passed_count: int
    failed_count: int
    warning_count: int


# ─── Full Analysis Response ───────────────────────────────────────────────────

class ResumeAnalysisResponse(BaseModel):
    """Full analysis result with all checks and recommendations."""
    id: uuid.UUID
    resume_id: uuid.UUID
    user_id: uuid.UUID
    job_description_id: uuid.UUID | None = None

    # Normalized 0–100 scores
    overall_score: int
    ats_score: int
    content_score: int = Field(alias="content_strength_score")
    jd_match_score: int | None = None
    completeness_score: int
    readability_score: int
    grammar_score: int
    evidence_credibility_score: int

    # Raw scoring metadata
    resume_version: int
    raw_score: int
    raw_max_score: int

    # Whether this analysis is stale (resume has been edited since analysis)
    is_stale: bool = False

    # Analysis metadata
    status: str
    analysis_version: str
    created_at: datetime

    # Detailed checks (expanded)
    checks: list[AnalysisCheckResponse] = Field(default_factory=list)

    # Top-level recommendations (sorted by points_lost desc)
    top_recommendations: list[TopRecommendationSchema] = Field(default_factory=list)

    # Category-level breakdown
    categories: list[CategoryBreakdownSchema] = Field(default_factory=list)

    # How many more points could be gained by fixing failed checks
    potential_score_gain: int = 0

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }


# ─── Summary (History List) ───────────────────────────────────────────────────

class AnalysisSummaryResponse(BaseModel):
    """Lightweight analysis summary for history listing."""
    id: uuid.UUID
    resume_id: uuid.UUID
    overall_score: int
    ats_score: int
    content_score: int = Field(alias="content_strength_score")
    analysis_version: str
    status: str
    created_at: datetime
    is_stale: bool = False

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }


class AnalysisHistoryResponse(BaseModel):
    """Paginated analysis history for a resume."""
    items: list[AnalysisSummaryResponse]
    total: int
    page: int
    page_size: int


# ─── Scoring Methodology (Public) ────────────────────────────────────────────

class CategoryWeightSchema(BaseModel):
    category: str
    max_points: int
    max_normalized: int  # always 100
    description: str
    check_count: int


class ScoringMethodologyResponse(BaseModel):
    """Public description of the scoring methodology."""
    analysis_version: str
    raw_max_score: int
    normalized_max_score: int   # always 100
    note_jd_match: str
    categories: list[CategoryWeightSchema]
    scoring_description: str


# ─── Trigger Schema ───────────────────────────────────────────────────────────

class RunAnalysisResponse(BaseModel):
    """Returned when an analysis is triggered or fetched from cache."""
    analysis: ResumeAnalysisResponse
    from_cache: bool
    message: str
