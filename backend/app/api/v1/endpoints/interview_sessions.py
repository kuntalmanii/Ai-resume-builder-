"""Interview Practice Sessions API endpoints."""

import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.interview_session import (
    InterviewSessionGenerateRequest,
    InterviewSessionResponse,
    PracticeAnswerSubmit,
    PracticeFeedbackResponse,
)
from app.services.interview_service import interview_service

router = APIRouter(prefix="/interview-sessions", tags=["Interview Prep"])


@router.post(
    "/generate", response_model=InterviewSessionResponse, status_code=status.HTTP_201_CREATED
)
async def generate_practice_session(
    payload: InterviewSessionGenerateRequest, current_user: CurrentUser, db: DBSession
) -> InterviewSessionResponse:
    """Generate interview questions tailored to Resume and JD."""
    sess = await interview_service.generate_session(db, user_id=current_user.id, request=payload)
    await db.commit()
    return InterviewSessionResponse.model_validate(sess)


@router.get("", response_model=list[InterviewSessionResponse])
async def list_sessions(current_user: CurrentUser, db: DBSession) -> list[InterviewSessionResponse]:
    """List historical practice sessions."""
    sessions = await interview_service.get_by_user_id(db, user_id=current_user.id)
    return [InterviewSessionResponse.model_validate(s) for s in sessions]


@router.get("/{id}", response_model=InterviewSessionResponse)
async def get_session(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> InterviewSessionResponse:
    """Get interview session details."""
    sess = await interview_service.get_by_id(db, id, user_id=current_user.id)
    if not sess:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    return InterviewSessionResponse.model_validate(sess)


@router.post("/{id}/practice", response_model=PracticeFeedbackResponse)
async def submit_practice_answer(
    id: uuid.UUID, payload: PracticeAnswerSubmit, current_user: CurrentUser, db: DBSession
) -> PracticeFeedbackResponse:
    """Submit practice answer for coaching evaluation feedback and scoring."""
    feedback = await interview_service.submit_answer(
        db, user_id=current_user.id, session_id=id, submission=payload
    )
    await db.commit()
    return feedback
