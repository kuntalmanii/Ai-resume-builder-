"""LinkedIn Optimization Repository class."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.linkedin_optimization import LinkedInOptimization
from app.repositories.base import BaseRepository


class LinkedInOptimizationRepository(BaseRepository[LinkedInOptimization]):
    def __init__(self):
        super().__init__(LinkedInOptimization)

    async def get_by_user_id(self, db: AsyncSession, user_id: UUID) -> list[LinkedInOptimization]:
        query = (
            select(LinkedInOptimization)
            .where(LinkedInOptimization.user_id == user_id)
            .order_by(LinkedInOptimization.created_at.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())


linkedin_optimization_repository = LinkedInOptimizationRepository()
