"""Recruiter Workspace API endpoints."""
import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.resume import ResumeResponse
from app.services.recruiter_service import recruiter_service

router = APIRouter(prefix="/recruiter", tags=["Recruiter Dashboard"])


def _verify_recruiter_permission(user) -> None:
    if user.role not in ("recruiter", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Recruiter permissions required."
        )


@router.get("/candidates")
async def list_candidates(
    current_user: CurrentUser, db: DBSession
) -> list:
    """List shared candidates (role recruiter/admin only)."""
    _verify_recruiter_permission(current_user)
    return await recruiter_service.list_candidates(db)


@router.get("/candidates/{candidate_id}/resume", response_model=ResumeResponse)
async def get_candidate_resume(
    candidate_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> ResumeResponse:
    """View details of a candidate's shared primary resume (role recruiter/admin only)."""
    _verify_recruiter_permission(current_user)
    resume = await recruiter_service.get_candidate_resume(db, candidate_id=candidate_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Shared resume not found for this candidate.")
    return ResumeResponse.model_validate(resume)
