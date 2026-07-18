"""InterviewSession Repository class."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.interview_session import InterviewSession
from app.repositories.base import BaseRepository


class InterviewSessionRepository(BaseRepository[InterviewSession]):
    def __init__(self):
        super().__init__(InterviewSession)

    async def get_by_user_id(self, db: AsyncSession, user_id: UUID) -> list[InterviewSession]:
        query = (
            select(InterviewSession)
            .where(InterviewSession.user_id == user_id)
            .order_by(InterviewSession.created_at.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())


interview_session_repository = InterviewSessionRepository()
