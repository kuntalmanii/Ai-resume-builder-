"""Job Description Repository class."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.job_description import JobDescription
from app.repositories.base import BaseRepository


class JobDescriptionRepository(BaseRepository[JobDescription]):
    def __init__(self):
        super().__init__(JobDescription)

    async def get_by_user_id(self, db: AsyncSession, user_id: UUID) -> list[JobDescription]:
        query = select(JobDescription).where(JobDescription.user_id == user_id).order_by(JobDescription.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

job_description_repository = JobDescriptionRepository()
