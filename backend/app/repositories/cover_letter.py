"""CoverLetter Repository class."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.cover_letter import CoverLetter
from app.repositories.base import BaseRepository


class CoverLetterRepository(BaseRepository[CoverLetter]):
    def __init__(self):
        super().__init__(CoverLetter)

    async def get_by_user_id(self, db: AsyncSession, user_id: UUID) -> list[CoverLetter]:
        query = (
            select(CoverLetter)
            .where(CoverLetter.user_id == user_id)
            .order_by(CoverLetter.updated_at.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_versions(self, db: AsyncSession, root_id: UUID) -> list[CoverLetter]:
        query = (
            select(CoverLetter)
            .where((CoverLetter.id == root_id) | (CoverLetter.parent_id == root_id))
            .order_by(CoverLetter.version.asc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_latest_version(self, db: AsyncSession, root_id: UUID) -> CoverLetter | None:
        query = (
            select(CoverLetter)
            .where((CoverLetter.id == root_id) | (CoverLetter.parent_id == root_id))
            .order_by(CoverLetter.version.desc())
            .limit(1)
        )
        result = await db.execute(query)
        return result.scalars().first()


cover_letter_repository = CoverLetterRepository()
