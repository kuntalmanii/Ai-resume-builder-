"""Application and Interview API routes."""

import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    ApplicationUpdate,
    InterviewCreate,
    InterviewResponse,
)
from app.services.application_service import application_service

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    payload: ApplicationCreate, current_user: CurrentUser, db: DBSession
) -> ApplicationResponse:
    """Create a new job application tracker."""
    app_obj = await application_service.create(db, user_id=current_user.id, obj_in=payload)
    await db.commit()
    # Refresh to load relationships/interviews
    full_app = await application_service.get_by_id(db, app_obj.id)
    return ApplicationResponse.model_validate(full_app)


@router.get("", response_model=list[ApplicationResponse])
async def list_applications(
    current_user: CurrentUser,
    db: DBSession,
    status: str | None = None,
    search: str | None = None,
) -> list[ApplicationResponse]:
    """List job applications for current user."""
    apps = await application_service.get_by_user_id(
        db, user_id=current_user.id, status=status, search=search
    )
    return [ApplicationResponse.model_validate(a) for a in apps]


@router.get("/{id}", response_model=ApplicationResponse)
async def get_application(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> ApplicationResponse:
    """Get single application details."""
    app_obj = await application_service.get_by_id(db, id)
    if not app_obj or app_obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Application not found.")
    return ApplicationResponse.model_validate(app_obj)


@router.put("/{id}", response_model=ApplicationResponse)
async def update_application(
    id: uuid.UUID, payload: ApplicationUpdate, current_user: CurrentUser, db: DBSession
) -> ApplicationResponse:
    """Update job application tracker."""
    app_obj = await application_service.get_by_id(db, id)
    if not app_obj or app_obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Application not found.")
    await application_service.update(db, db_obj=app_obj, obj_in=payload)
    await db.commit()
    # Reload with relationships
    full_app = await application_service.get_by_id(db, id)
    return ApplicationResponse.model_validate(full_app)


@router.patch("/{id}/status", response_model=ApplicationResponse)
async def update_application_status(
    id: uuid.UUID, payload: ApplicationStatusUpdate, current_user: CurrentUser, db: DBSession
) -> ApplicationResponse:
    """Move application to another Kanban column."""
    app_obj = await application_service.get_by_id(db, id)
    if not app_obj or app_obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Application not found.")

    await application_service.update(
        db, db_obj=app_obj, obj_in=ApplicationUpdate(status=payload.status)
    )
    await db.commit()
    full_app = await application_service.get_by_id(db, id)
    return ApplicationResponse.model_validate(full_app)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(id: uuid.UUID, current_user: CurrentUser, db: DBSession) -> None:
    """Delete job application tracker."""
    app_obj = await application_service.get_by_id(db, id)
    if not app_obj or app_obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Application not found.")
    await application_service.remove(db, id=id)
    await db.commit()


# ─── Interview Endpoints ──────────────────────────────────────────────────────


@router.post(
    "/{id}/interviews",
    response_model=InterviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def schedule_interview(
    id: uuid.UUID, payload: InterviewCreate, current_user: CurrentUser, db: DBSession
) -> InterviewResponse:
    """Schedule a interview round for an application."""
    app_obj = await application_service.get_by_id(db, id)
    if not app_obj or app_obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Application not found.")

    iv = await application_service.add_interview(
        db, user_id=current_user.id, application_id=id, obj_in=payload
    )
    await db.commit()
    return InterviewResponse.model_validate(iv)


@router.get("/{id}/interviews", response_model=list[InterviewResponse])
async def list_interviews(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> list[InterviewResponse]:
    """List scheduled interviews for a job application."""
    app_obj = await application_service.get_by_id(db, id)
    if not app_obj or app_obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Application not found.")

    ivs = await application_service.get_interviews_by_app(db, application_id=id)
    return [InterviewResponse.model_validate(i) for i in ivs]


@router.delete("/{id}/interviews/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interview(
    id: uuid.UUID, interview_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> None:
    """Cancel or delete interview round."""
    app_obj = await application_service.get_by_id(db, id)
    if not app_obj or app_obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Application not found.")

    success = await application_service.delete_interview(db, interview_id=interview_id)
    if not success:
        raise HTTPException(status_code=404, detail="Interview not found.")
    await db.commit()
