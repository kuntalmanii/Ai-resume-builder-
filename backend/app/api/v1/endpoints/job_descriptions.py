"""Job Descriptions router: CRUD operations for user-owned JDs."""

import uuid

from fastapi import APIRouter, status

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.job_description import (
    JobDescriptionCreate,
    JobDescriptionResponse,
    JobDescriptionUpdate,
)
from app.services import job_description_service

router = APIRouter(prefix="/job-descriptions", tags=["Job Descriptions"])


@router.post("", response_model=JobDescriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_job_description(
    payload: JobDescriptionCreate, current_user: CurrentUser, db: DBSession
) -> JobDescriptionResponse:
    """Create a new job description."""
    jd = await job_description_service.create_job_description(db, current_user.id, payload)
    return JobDescriptionResponse.model_validate(jd)


@router.get("", response_model=list[JobDescriptionResponse])
async def list_job_descriptions(
    current_user: CurrentUser, db: DBSession
) -> list[JobDescriptionResponse]:
    """Retrieve all job descriptions belonging to the authenticated user."""
    jds = await job_description_service.get_job_descriptions(db, current_user.id)
    return [JobDescriptionResponse.model_validate(j) for j in jds]


@router.get("/{id}", response_model=JobDescriptionResponse)
async def get_job_description(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> JobDescriptionResponse:
    """Retrieve a specific job description, enforcing ownership."""
    jd = await job_description_service.get_job_description(db, id, current_user.id)
    return JobDescriptionResponse.model_validate(jd)


@router.put("/{id}", response_model=JobDescriptionResponse)
async def update_job_description(
    id: uuid.UUID,
    payload: JobDescriptionUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> JobDescriptionResponse:
    """Update a specific job description, enforcing ownership."""
    jd = await job_description_service.update_job_description(db, id, current_user.id, payload)
    return JobDescriptionResponse.model_validate(jd)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job_description(id: uuid.UUID, current_user: CurrentUser, db: DBSession) -> None:
    """Delete a specific job description, enforcing ownership."""
    await job_description_service.delete_job_description(db, id, current_user.id)
