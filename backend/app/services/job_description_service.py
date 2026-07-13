"""Job Description Service layer — handles core CRUD and ownership checks."""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.job_description import JobDescription
from app.schemas.job_description import JobDescriptionCreate, JobDescriptionUpdate
from app.core.exceptions import ResourceNotFoundError, ForbiddenError


async def get_job_description(
    db: AsyncSession, jd_id: uuid.UUID, user_id: uuid.UUID
) -> JobDescription:
    """Fetch job description and enforce user ownership."""
    result = await db.execute(select(JobDescription).where(JobDescription.id == jd_id))
    jd = result.scalar_one_or_none()
    if not jd:
        raise ResourceNotFoundError("Job description not found")
    if jd.user_id != user_id:
        raise ResourceNotFoundError("Job description not found")
    return jd


async def get_job_descriptions(db: AsyncSession, user_id: uuid.UUID) -> list[JobDescription]:
    """Fetch all job descriptions belonging to user."""
    result = await db.execute(
        select(JobDescription)
        .where(JobDescription.user_id == user_id)
        .order_by(JobDescription.created_at.desc())
    )
    return list(result.scalars().all())


async def create_job_description(
    db: AsyncSession, user_id: uuid.UUID, payload: JobDescriptionCreate
) -> JobDescription:
    """Create a new job description."""
    jd = JobDescription(
        user_id=user_id,
        title=payload.title,
        company=payload.company,
        raw_text=payload.raw_text,
        source_filename=payload.source_filename,
        source_type=payload.source_type,
    )
    db.add(jd)
    await db.commit()
    await db.refresh(jd)
    return jd


async def update_job_description(
    db: AsyncSession,
    jd_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: JobDescriptionUpdate,
) -> JobDescription:
    """Update job description fields."""
    jd = await get_job_description(db, jd_id, user_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(jd, field, value)

    db.add(jd)
    await db.commit()
    await db.refresh(jd)
    return jd


async def delete_job_description(
    db: AsyncSession, jd_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    """Delete job description."""
    jd = await get_job_description(db, jd_id, user_id)
    await db.delete(jd)
    await db.commit()
