"""Roadmap Repository class."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.roadmap import Roadmap
from app.repositories.base import BaseRepository


class RoadmapRepository(BaseRepository[Roadmap]):
    def __init__(self):
        super().__init__(Roadmap)

    async def get_by_user_id(self, db: AsyncSession, user_id: UUID) -> list[Roadmap]:
        query = select(Roadmap).where(Roadmap.user_id == user_id).order_by(Roadmap.updated_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())


roadmap_repository = RoadmapRepository()
