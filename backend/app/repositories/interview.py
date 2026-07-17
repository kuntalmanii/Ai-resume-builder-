"""Interview Repository class."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.interview import Interview
from app.repositories.base import BaseRepository


class InterviewRepository(BaseRepository[Interview]):
    def __init__(self):
        super().__init__(Interview)

    async def get_by_application_id(self, db: AsyncSession, application_id: UUID) -> list[Interview]:
        query = select(Interview).where(Interview.application_id == application_id).order_by(Interview.scheduled_at.asc())
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_by_user_id(self, db: AsyncSession, user_id: UUID) -> list[Interview]:
        query = select(Interview).where(Interview.user_id == user_id).order_by(Interview.scheduled_at.asc())
        result = await db.execute(query)
        return list(result.scalars().all())


interview_repository = InterviewRepository()
