"""Application Repository class."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.application import Application
from app.repositories.base import BaseRepository


class ApplicationRepository(BaseRepository[Application]):
    def __init__(self):
        super().__init__(Application)

    async def get_by_user_id(
        self, db: AsyncSession, user_id: UUID, status: str | None = None, search: str | None = None
    ) -> list[Application]:
        query = (
            select(Application)
            .where(Application.user_id == user_id)
            .options(selectinload(Application.interviews))
            .order_by(Application.updated_at.desc())
        )
        if status:
            query = query.where(Application.status == status)
        if search:
            query = query.where(
                (Application.company.ilike(f"%{search}%")) | (Application.role.ilike(f"%{search}%"))
            )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_with_interviews(self, db: AsyncSession, id: UUID) -> Application | None:
        query = (
            select(Application)
            .where(Application.id == id)
            .options(selectinload(Application.interviews))
        )
        result = await db.execute(query)
        return result.scalars().first()


application_repository = ApplicationRepository()
