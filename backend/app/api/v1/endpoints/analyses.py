"""Resume Analyses endpoints — Phase 9.

Routes:
  POST   /resumes/{id}/analyses              — Run analysis (with caching)
  GET    /resumes/{id}/analyses/latest       — Get latest analysis with stale flag
  GET    /resumes/{id}/analyses              — Paginated analysis history
  GET    /resumes/{id}/analyses/{analysis_id} — Get specific analysis
  GET    /scoring/methodology               — Public scoring methodology info

All resume-scoped endpoints enforce user ownership (404 on unauthorized access).
"""

from __future__ import annotations

import uuid
from datetime import UTC
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentUser, DBSession
from app.core.exceptions import ResourceNotFoundError
from app.db.models.analysis import ResumeAnalysis
from app.db.models.analysis_check import AnalysisCheck
from app.repositories.analysis import analysis_repository
from app.schemas.analysis import (
    AnalysisCheckResponse,
    AnalysisHistoryResponse,
    AnalysisSummaryResponse,
    CategoryBreakdownSchema,
    CategoryWeightSchema,
    ResumeAnalysisResponse,
    RunAnalysisResponse,
    ScoringMethodologyResponse,
    TopRecommendationSchema,
)
from app.services import resume_service
from app.services.scoring import run_resume_analysis
from app.services.scoring.config import (
    ANALYSIS_VERSION,
    CATEGORY_MAX,
    RAW_MAX_SCORE,
)

router = APIRouter(tags=["Analyses"])


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _check_to_schema(check: AnalysisCheck, analysis_id: uuid.UUID) -> AnalysisCheckResponse:
    """Convert an AnalysisCheck ORM row to its response schema."""
    return AnalysisCheckResponse(
        id=check.id,
        analysis_id=analysis_id,
        category=check.category,
        check_code=check.check_code,
        title=check.title,
        description=check.description,
        status=check.status,
        points_possible=check.points_possible,
        points_awarded=check.points_awarded,
        points_lost=max(0, check.points_possible - check.points_awarded),
        recommendation=check.recommendation,
        evidence_data=check.evidence_data,
    )


def _build_response(
    analysis: ResumeAnalysis,
    current_resume_version: int,
) -> ResumeAnalysisResponse:
    """Build a full ResumeAnalysisResponse from an ORM model."""
    is_stale = analysis.resume_version != current_resume_version

    checks = [_check_to_schema(c, analysis.id) for c in (analysis.checks or [])]

    # Rebuild top_recommendations from checks (deterministic sort)
    actionable = [
        TopRecommendationSchema(
            check_code=c.check_code,
            category=c.category,
            title=c.title,
            recommendation=c.recommendation or "",
            points_possible=c.points_possible,
            points_lost=max(0, c.points_possible - c.points_awarded),
            status=c.status,
        )
        for c in checks
        if c.status in ("failed", "warning") and c.recommendation and c.points_lost > 0
    ]
    actionable.sort(key=lambda r: (-r.points_lost, {"failed": 0, "warning": 1}.get(r.status, 2)))
    top_recommendations = actionable[:10]

    # Rebuild categories from checks
    category_names = ["ats", "content", "completeness", "readability", "grammar", "evidence"]
    cat_check_map: dict[str, list[AnalysisCheckResponse]] = {c: [] for c in category_names}
    for ch in checks:
        if ch.category in cat_check_map:
            cat_check_map[ch.category].append(ch)

    categories: list[CategoryBreakdownSchema] = []
    for cat_name in category_names:
        cat_checks = cat_check_map[cat_name]
        raw = sum(c.points_awarded for c in cat_checks)
        max_p = CATEGORY_MAX.get(cat_name, 20)
        normalized = round((raw / max_p) * 100) if max_p else 0
        categories.append(
            CategoryBreakdownSchema(
                category=cat_name,
                normalized=min(100, normalized),
                raw_score=raw,
                max_score=max_p,
                check_count=len(cat_checks),
                passed_count=sum(1 for c in cat_checks if c.status == "passed"),
                failed_count=sum(1 for c in cat_checks if c.status == "failed"),
                warning_count=sum(1 for c in cat_checks if c.status == "warning"),
            )
        )

    # Potential score gain
    max_recoverable = sum(c.points_lost for c in checks if c.status in ("failed", "warning"))
    potential_raw = min(analysis.raw_score + max_recoverable, RAW_MAX_SCORE)
    potential_gain = round((potential_raw / RAW_MAX_SCORE) * 100) - analysis.overall_score

    return ResumeAnalysisResponse(
        id=analysis.id,
        resume_id=analysis.resume_id,
        user_id=analysis.user_id,
        job_description_id=analysis.job_description_id,
        overall_score=analysis.overall_score,
        ats_score=analysis.ats_score,
        content_strength_score=analysis.content_strength_score,
        jd_match_score=analysis.jd_match_score,
        completeness_score=analysis.completeness_score,
        readability_score=analysis.readability_score,
        grammar_score=analysis.grammar_score,
        evidence_credibility_score=analysis.evidence_credibility_score,
        resume_version=analysis.resume_version,
        raw_score=analysis.raw_score,
        raw_max_score=analysis.raw_max_score,
        is_stale=is_stale,
        status=analysis.status,
        analysis_version=analysis.analysis_version,
        created_at=analysis.created_at,
        checks=checks,
        top_recommendations=top_recommendations,
        categories=categories,
        potential_score_gain=max(0, potential_gain),
    )


async def _get_owned_resume(db, resume_id: uuid.UUID, user_id: uuid.UUID):
    """Fetch a resume and raise 404 if not found or not owned by user."""
    resume = await resume_service.get_resume(db, resume_id, user_id)
    return resume


# ─── POST /resumes/{id}/analyses ─────────────────────────────────────────────


@router.post(
    "/resumes/{id}/analyses",
    response_model=RunAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
async def run_analysis(
    id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
    force: Annotated[bool, Query(description="Force re-run even if cached result exists")] = False,
) -> RunAnalysisResponse:
    """Run a deterministic ATS analysis on the resume.

    Returns cached result if the same resume version + analysis version already exists,
    unless `force=true` is passed.
    """
    resume = await _get_owned_resume(db, id, current_user.id)
    current_version = resume.version

    # ── Cache check ──────────────────────────────────────────────────────────
    if not force:
        cached = await analysis_repository.find_cached(
            db,
            resume_id=id,
            resume_version=current_version,
            analysis_version=ANALYSIS_VERSION,
        )
        if cached:
            return RunAnalysisResponse(
                analysis=_build_response(cached, current_version),
                from_cache=True,
                message="Returning cached analysis for this resume version.",
            )

    # ── Run scoring engine ───────────────────────────────────────────────────
    resume_content = resume.content or {}
    # Get career profile for evidence cross-reference
    career_profile = None
    try:
        from app.repositories.profile import profile_repository

        cp = await profile_repository.get_by_user_id(db, current_user.id)
        if cp:
            career_profile = cp.content  # dict
    except Exception:
        pass  # Career profile is optional

    template_id = resume_content.get("template_id") if isinstance(resume_content, dict) else None
    result = run_resume_analysis(
        resume=resume_content,
        career_profile=career_profile,
        template_id=template_id,
    )

    # ── Persist analysis ─────────────────────────────────────────────────────
    async with db.begin_nested():
        db_analysis = await analysis_repository.create(
            db,
            obj_in={
                "resume_id": id,
                "user_id": current_user.id,
                "resume_version": current_version,
                "overall_score": result.overall_score,
                "ats_score": result.ats_score,
                "content_strength_score": result.content_score,
                "jd_match_score": None,
                "completeness_score": result.completeness_score,
                "readability_score": result.readability_score,
                "grammar_score": result.grammar_score,
                "evidence_credibility_score": result.evidence_credibility_score,
                "raw_score": result.raw_score,
                "raw_max_score": result.raw_max_score,
                "status": "completed",
                "analysis_version": result.analysis_version,
            },
        )

        # Persist individual checks
        check_rows: list[AnalysisCheck] = []
        for check in result.checks:
            check_row = AnalysisCheck(
                analysis_id=db_analysis.id,
                category=check.category,
                check_code=check.check_code,
                title=check.title,
                description=check.description,
                status=check.status,
                points_possible=check.points_possible,
                points_awarded=check.points_awarded,
                recommendation=check.recommendation,
                evidence_data=check.evidence_data or {},
            )
            db.add(check_row)
            check_rows.append(check_row)

        # Update resume.last_analyzed_at
        from datetime import datetime

        resume.last_analyzed_at = datetime.now(UTC)
        db.add(resume)

        await db.flush()

    db_analysis.checks = check_rows
    await db.commit()
    await db.refresh(db_analysis)

    return RunAnalysisResponse(
        analysis=_build_response(db_analysis, current_version),
        from_cache=False,
        message="Analysis completed successfully.",
    )


# ─── GET /resumes/{id}/analyses/latest ───────────────────────────────────────


@router.get(
    "/resumes/{id}/analyses/latest",
    response_model=ResumeAnalysisResponse,
)
async def get_latest_analysis(
    id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> ResumeAnalysisResponse:
    """Get the latest analysis for a resume.

    Includes `is_stale=true` if the resume has been edited since the last analysis.
    Returns 404 if no analysis exists yet.
    """
    resume = await _get_owned_resume(db, id, current_user.id)
    analysis = await analysis_repository.get_latest_with_checks(db, resume_id=id)

    if not analysis:
        raise ResourceNotFoundError(
            f"No analysis found for resume '{id}'. Run an analysis first.",
        )

    # Ownership check (defense-in-depth)
    if analysis.user_id != current_user.id:
        raise ResourceNotFoundError("Analysis not found.")

    return _build_response(analysis, resume.version)


# ─── GET /resumes/{id}/analyses ───────────────────────────────────────────────


@router.get(
    "/resumes/{id}/analyses",
    response_model=AnalysisHistoryResponse,
)
async def list_analyses(
    id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 10,
) -> AnalysisHistoryResponse:
    """Paginated analysis history for a resume.

    Returns summaries (no checks) for efficiency.
    """
    resume = await _get_owned_resume(db, id, current_user.id)
    all_analyses = await analysis_repository.get_by_resume_id(db, resume_id=id)

    # Filter by ownership (defense-in-depth)
    all_analyses = [a for a in all_analyses if a.user_id == current_user.id]

    total = len(all_analyses)
    start = (page - 1) * page_size
    page_items = all_analyses[start : start + page_size]

    summaries = [
        AnalysisSummaryResponse(
            id=a.id,
            resume_id=a.resume_id,
            overall_score=a.overall_score,
            ats_score=a.ats_score,
            content_strength_score=a.content_strength_score,
            analysis_version=a.analysis_version,
            status=a.status,
            created_at=a.created_at,
            is_stale=(a.resume_version != resume.version),
        )
        for a in page_items
    ]

    return AnalysisHistoryResponse(
        items=summaries,
        total=total,
        page=page,
        page_size=page_size,
    )


# ─── GET /resumes/{id}/analyses/{analysis_id} ────────────────────────────────


@router.get(
    "/resumes/{id}/analyses/{analysis_id}",
    response_model=ResumeAnalysisResponse,
)
async def get_analysis_by_id(
    id: uuid.UUID,
    analysis_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> ResumeAnalysisResponse:
    """Get a specific analysis by ID.

    Enforces ownership — 404 if analysis doesn't belong to current user.
    """
    resume = await _get_owned_resume(db, id, current_user.id)
    analysis = await analysis_repository.get_with_checks(db, analysis_id=analysis_id)

    if not analysis or analysis.resume_id != id or analysis.user_id != current_user.id:
        raise ResourceNotFoundError(f"Analysis '{analysis_id}' not found.")

    return _build_response(analysis, resume.version)


# ─── GET /scoring/methodology ─────────────────────────────────────────────────


@router.get(
    "/scoring/methodology",
    response_model=ScoringMethodologyResponse,
    tags=["Scoring"],
)
async def get_scoring_methodology() -> ScoringMethodologyResponse:
    """Public endpoint returning the scoring methodology and category weights.

    No authentication required — useful for transparency and documentation.
    """
    category_descriptions = {
        "ats": "Structural properties that affect Applicant Tracking System parseability",
        "content": "Quality of bullet points: action verbs, specificity, impact, conciseness",
        "completeness": "How complete the resume is across all required and optional sections",
        "readability": "How easy the resume is to scan — bullet length, complexity, balance",
        "grammar": "Deterministic grammar checks for common formatting issues",
        "evidence": "Internal consistency, timeline validity, and Career Profile alignment",
    }
    check_counts = {
        "ats": 8,
        "content": 6,
        "completeness": 6,
        "readability": 5,
        "grammar": 5,
        "evidence": 5,
    }

    return ScoringMethodologyResponse(
        analysis_version=ANALYSIS_VERSION,
        raw_max_score=RAW_MAX_SCORE,
        normalized_max_score=100,
        note_jd_match=(
            "Job Description matching (JD Match) is not included in the current analysis version. "
            "When available, it adds up to 25 points and is normalized separately. "
            "Resume-only analysis normalizes 75 points to a 100-point scale."
        ),
        categories=[
            CategoryWeightSchema(
                category=name,
                max_points=max_pts,
                max_normalized=100,
                description=category_descriptions.get(name, ""),
                check_count=check_counts.get(name, 0),
            )
            for name, max_pts in CATEGORY_MAX.items()
        ],
        scoring_description=(
            f"Version {ANALYSIS_VERSION}: Deterministic, explainable scoring. "
            "Each category consists of weighted checks. Raw scores are normalized to 0–100. "
            "No LLM-generated scores — all results are reproducible."
        ),
    )
