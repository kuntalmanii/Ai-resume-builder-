"""Career Profile Repository class."""
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.profile import CareerProfile
from app.repositories.base import BaseRepository

class CareerProfileRepository(BaseRepository[CareerProfile]):
    def __init__(self):
        super().__init__(CareerProfile)

    async def get_by_user_id(self, db: AsyncSession, user_id: UUID) -> CareerProfile | None:
        query = select(CareerProfile).where(CareerProfile.user_id == user_id)
        result = await db.execute(query)
        return result.scalars().first()

profile_repository = CareerProfileRepository()
