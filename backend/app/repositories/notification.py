"""Notification Repository class."""
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.notification import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self):
        super().__init__(Notification)

    async def get_by_user_id(
        self, db: AsyncSession, user_id: UUID, skip: int = 0, limit: int = 50
    ) -> list[Notification]:
        query = select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_unread_count(self, db: AsyncSession, user_id: UUID) -> int:
        from sqlalchemy import func
        query = select(func.count(Notification.id)).where(
            Notification.user_id == user_id, Notification.is_read == False
        )
        result = await db.execute(query)
        return result.scalar() or 0

    async def mark_all_read(self, db: AsyncSession, user_id: UUID) -> int:
        query = update(Notification).where(
            Notification.user_id == user_id, Notification.is_read == False
        ).values(is_read=True)
        result = await db.execute(query)
        return result.rowcount


notification_repository = NotificationRepository()
