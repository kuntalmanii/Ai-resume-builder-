"""Resume Repository class."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.resume import Resume
from app.repositories.base import BaseRepository


class ResumeRepository(BaseRepository[Resume]):
    def __init__(self):
        super().__init__(Resume)

    async def get_by_user_id(self, db: AsyncSession, user_id: UUID) -> list[Resume]:
        query = select(Resume).where(Resume.user_id == user_id).order_by(Resume.updated_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_primary_by_user_id(self, db: AsyncSession, user_id: UUID) -> Resume | None:
        query = select(Resume).where(Resume.user_id == user_id, Resume.is_primary)
        result = await db.execute(query)
        return result.scalars().first()


resume_repository = ResumeRepository()
