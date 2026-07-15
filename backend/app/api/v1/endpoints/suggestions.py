"""AI Suggestion API routes."""
import uuid
from typing import List, Optional

from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.ai_suggestion import (
    SuggestionResponse,
    SuggestionGenerateRequest,
    SuggestionBatchGenerateRequest,
    SuggestionEditRequest,
    AchievementAnswerRequest,
    AIStatusResponse
)
from app.schemas.resume import ResumeResponse
from app.services.ai.suggestion_service import AISuggestionService
from app.ai.gemini_provider import GeminiProvider

router = APIRouter(prefix="/resumes", tags=["suggestions"])


@router.get("/suggestions/health", response_model=AIStatusResponse)
async def get_ai_health() -> AIStatusResponse:
    """Check LLM provider status and metadata."""
    provider = GeminiProvider()
    healthy = await provider.health_check()
    return AIStatusResponse(
        status="available" if healthy else "unavailable",
        provider_name=provider.provider_name,
        model_name=provider.model_name
    )


@router.get("/{id}/suggestions", response_model=List[SuggestionResponse])
async def list_suggestions(
    id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
    status: Optional[str] = Query(None, description="Filter suggestions by status")
) -> List[SuggestionResponse]:
    """Retrieve suggestions for a specific resume."""
    suggs = await AISuggestionService.get_suggestions(db, id, current_user.id, status)
    return [SuggestionResponse.model_validate(s) for s in suggs]


@router.post("/{id}/suggestions", response_model=SuggestionResponse, status_code=status.HTTP_201_CREATED)
async def generate_suggestion(
    id: uuid.UUID,
    req: SuggestionGenerateRequest,
    db: DBSession,
    current_user: CurrentUser
) -> SuggestionResponse:
    """Generate a single grounded AI suggestions for a section/field."""
    sugg = await AISuggestionService.generate_suggestion(db, id, req, current_user.id)
    return SuggestionResponse.model_validate(sugg)


@router.post("/{id}/suggestions/batch", response_model=List[SuggestionResponse], status_code=status.HTTP_201_CREATED)
async def batch_generate_suggestions(
    id: uuid.UUID,
    req: SuggestionBatchGenerateRequest,
    db: DBSession,
    current_user: CurrentUser
) -> List[SuggestionResponse]:
    """Batch generate multiple targeted resume suggestions."""
    suggs = await AISuggestionService.batch_generate_suggestions(
        db=db,
        resume_id=id,
        mode=req.mode,
        user_id=current_user.id,
        job_description_id=req.job_description_id,
        analysis_id=req.analysis_id,
        match_result_id=req.match_result_id,
        max_suggestions=req.max_suggestions
    )
    return [SuggestionResponse.model_validate(s) for s in suggs]


@router.get("/{id}/suggestions/{suggestion_id}", response_model=SuggestionResponse)
async def get_suggestion(
    id: uuid.UUID,
    suggestion_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser
) -> SuggestionResponse:
    """Retrieve details for a single suggestion."""
    sugg = await AISuggestionService.get_suggestion(db, suggestion_id, current_user.id)
    return SuggestionResponse.model_validate(sugg)


@router.post("/{id}/suggestions/{suggestion_id}/accept", response_model=SuggestionResponse)
async def accept_suggestion(
    id: uuid.UUID,
    suggestion_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser
) -> SuggestionResponse:
    """Accept a suggestion."""
    sugg = await AISuggestionService.accept_suggestion(db, suggestion_id, current_user.id)
    return SuggestionResponse.model_validate(sugg)


@router.post("/{id}/suggestions/{suggestion_id}/reject", response_model=SuggestionResponse)
async def reject_suggestion(
    id: uuid.UUID,
    suggestion_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser
) -> SuggestionResponse:
    """Reject a suggestion."""
    sugg = await AISuggestionService.reject_suggestion(db, suggestion_id, current_user.id)
    return SuggestionResponse.model_validate(sugg)


@router.put("/{id}/suggestions/{suggestion_id}", response_model=SuggestionResponse)
async def edit_suggestion(
    id: uuid.UUID,
    suggestion_id: uuid.UUID,
    req: SuggestionEditRequest,
    db: DBSession,
    current_user: CurrentUser
) -> SuggestionResponse:
    """Edit suggestion text, triggering automatic claims re-validation."""
    sugg = await AISuggestionService.edit_suggestion(db, suggestion_id, req.suggested_text, current_user.id)
    return SuggestionResponse.model_validate(sugg)


@router.post("/{id}/suggestions/{suggestion_id}/answer", response_model=SuggestionResponse)
async def answer_clarifying_question(
    id: uuid.UUID,
    suggestion_id: uuid.UUID,
    req: AchievementAnswerRequest,
    db: DBSession,
    current_user: CurrentUser
) -> SuggestionResponse:
    """Answer clarifying question to verify achievement metric and regenerate suggestion."""
    sugg = await AISuggestionService.answer_clarifying_question(db, suggestion_id, req.answer, current_user.id)
    return SuggestionResponse.model_validate(sugg)


@router.post("/{id}/suggestions/{suggestion_id}/apply", response_model=ResumeResponse)
async def apply_suggestion(
    id: uuid.UUID,
    suggestion_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser
) -> ResumeResponse:
    """Apply the suggestion to the resume, taking a snapshot and incrementing version."""
    resume = await AISuggestionService.apply_suggestion(db, suggestion_id, current_user.id)
    return ResumeResponse.model_validate(resume)
