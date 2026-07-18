"""Job Matches router: run comparison, fetch history, check stale state, and view methodology."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status
from sqlalchemy import desc, select

from app.api.dependencies import CurrentUser, DBSession
from app.core.exceptions import ForbiddenError, ResourceNotFoundError
from app.db.models.job_description import JobDescription
from app.db.models.job_match_result import JobMatchResult
from app.db.models.resume import Resume
from app.schemas.job_match import (
    JobMatchMethodologyResponse,
    JobMatchResultResponse,
    JobMatchRunRequest,
)
from app.services.matching import MATCHING_VERSION, run_job_match
from app.services.matching.config import CATEGORY_WEIGHTS

router = APIRouter(tags=["Job Matches"])


def check_stale(result: JobMatchResult, resume: Resume, jd: JobDescription) -> bool:
    """Determine dynamically if a match result is stale."""
    if result.resume_version != resume.version:
        return True
    if jd.updated_at > result.created_at:
        return True
    return False


def check_ai_fallback(result: JobMatchResult) -> bool:
    """Determine dynamically if AI fallback occurred or was active."""
    from app.core.config import get_settings

    settings = get_settings()
    if not (
        settings.AI_PROVIDER
        and settings.AI_API_KEY
        and settings.AI_API_KEY != "your-ai-api-key-here"
    ):
        return True

    # Check matched/missing requirements for deterministic extraction method
    matched = result.matched_requirements or []
    for r in matched:
        if r.get("extraction_method") == "deterministic":
            return True
    missing = result.missing_requirements or []
    for r in missing:
        if r.get("extraction_method") == "deterministic":
            return True
    return False


@router.post(
    "/resumes/{resume_id}/matches",
    response_model=JobMatchResultResponse,
    status_code=status.HTTP_200_OK,
)
async def run_comparison(
    resume_id: uuid.UUID,
    payload: JobMatchRunRequest,
    current_user: CurrentUser,
    db: DBSession,
    force: Annotated[bool, Query(description="Force recalculation")] = False,
) -> JobMatchResultResponse:
    """Run comparison between a resume and job description, returning full match details."""
    # Enforce ownership in service layer (engine)
    result = await run_job_match(
        db=db,
        resume_id=resume_id,
        job_description_id=payload.job_description_id,
        user_id=current_user.id,
        force=force,
    )

    # Fetch current objects to check staleness
    resume = await db.get(Resume, resume_id)
    jd = await db.get(JobDescription, payload.job_description_id)

    is_stale = check_stale(result, resume, jd) if resume and jd else False
    fallback = check_ai_fallback(result)

    resp = JobMatchResultResponse.model_validate(result)
    resp.is_stale = is_stale
    resp.ai_fallback_active = fallback
    return resp


@router.get("/resumes/{resume_id}/matches/latest", response_model=JobMatchResultResponse)
async def get_latest_match(
    resume_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
    job_description_id: uuid.UUID | None = None,
) -> JobMatchResultResponse:
    """Retrieve the latest matching result for a resume, optionally filtered by Job Description."""
    # Verify resume ownership
    resume = await db.get(Resume, resume_id)
    if not resume:
        raise ResourceNotFoundError(f"Resume with id {resume_id} not found")
    if resume.user_id != current_user.id:
        raise ForbiddenError("You do not own this resume")

    query = select(JobMatchResult).where(JobMatchResult.resume_id == resume_id)
    if job_description_id:
        query = query.where(JobMatchResult.job_description_id == job_description_id)

    query = query.order_by(desc(JobMatchResult.created_at)).limit(1)

    res = await db.execute(query)
    match_result = res.scalar_one_or_none()

    if not match_result:
        raise ResourceNotFoundError("No match result found for this resume")

    jd = await db.get(JobDescription, match_result.job_description_id)
    is_stale = check_stale(match_result, resume, jd) if jd else False
    fallback = check_ai_fallback(match_result)

    resp = JobMatchResultResponse.model_validate(match_result)
    resp.is_stale = is_stale
    resp.ai_fallback_active = fallback
    return resp


@router.get("/resumes/{resume_id}/matches", response_model=list[JobMatchResultResponse])
async def get_match_history(
    resume_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> list[JobMatchResultResponse]:
    """Retrieve match history for a specific resume (paginated)."""
    resume = await db.get(Resume, resume_id)
    if not resume:
        raise ResourceNotFoundError(f"Resume with id {resume_id} not found")
    if resume.user_id != current_user.id:
        raise ForbiddenError("You do not own this resume")

    offset = (page - 1) * page_size
    query = (
        select(JobMatchResult)
        .where(JobMatchResult.resume_id == resume_id)
        .order_by(desc(JobMatchResult.created_at))
        .offset(offset)
        .limit(page_size)
    )

    res = await db.execute(query)
    results = res.scalars().all()

    response_list = []
    for r in results:
        jd = await db.get(JobDescription, r.job_description_id)
        is_stale = check_stale(r, resume, jd) if jd else False
        fallback = check_ai_fallback(r)
        resp = JobMatchResultResponse.model_validate(r)
        resp.is_stale = is_stale
        resp.ai_fallback_active = fallback
        response_list.append(resp)

    return response_list


@router.get("/resumes/{resume_id}/matches/{match_id}", response_model=JobMatchResultResponse)
async def get_match_by_id(
    resume_id: uuid.UUID, match_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> JobMatchResultResponse:
    """Retrieve details of a specific match result, enforcing ownership checks."""
    resume = await db.get(Resume, resume_id)
    if not resume:
        raise ResourceNotFoundError(f"Resume with id {resume_id} not found")
    if resume.user_id != current_user.id:
        raise ForbiddenError("You do not own this resume")

    match_result = await db.get(JobMatchResult, match_id)
    if not match_result or match_result.resume_id != resume_id:
        raise ResourceNotFoundError("Match result not found")

    jd = await db.get(JobDescription, match_result.job_description_id)
    is_stale = check_stale(match_result, resume, jd) if jd else False
    fallback = check_ai_fallback(match_result)

    resp = JobMatchResultResponse.model_validate(match_result)
    resp.is_stale = is_stale
    resp.ai_fallback_active = fallback
    return resp


@router.get("/matching/methodology", response_model=JobMatchMethodologyResponse)
async def get_matching_methodology() -> JobMatchMethodologyResponse:
    """Return public details about how matching and scoring categories are weighted."""
    categories_list = []
    for name, weight in CATEGORY_WEIGHTS.items():
        categories_list.append(
            {
                "category": name,
                "max_points": weight,
                "description": f"Evaluates {name.replace('_', ' ')} " \
                    f"matching with target Job Description.",
            }
        )

    return JobMatchMethodologyResponse(
        matching_version=MATCHING_VERSION,
        categories=categories_list,
        scoring_description="Scores are computed deterministically. Active " \
            "categories are normalized to 100 max points.",
    )
