"""Portfolio Repository class."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.portfolio import Portfolio
from app.repositories.base import BaseRepository


class PortfolioRepository(BaseRepository[Portfolio]):
    def __init__(self):
        super().__init__(Portfolio)

    async def get_by_user_id(self, db: AsyncSession, user_id: UUID) -> Portfolio | None:
        query = select(Portfolio).where(Portfolio.user_id == user_id)
        result = await db.execute(query)
        return result.scalars().first()


portfolio_repository = PortfolioRepository()
