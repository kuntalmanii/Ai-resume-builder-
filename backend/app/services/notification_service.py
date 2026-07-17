"""Notification Service class."""
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.notification import Notification
from app.repositories.notification import notification_repository
from app.schemas.notification import NotificationCreate


class NotificationService:
    async def create_notification(
        self, db: AsyncSession, *, obj_in: NotificationCreate
    ) -> Notification:
        data = obj_in.model_dump()
        return await notification_repository.create(db, obj_in=data)

    async def get_by_user_id(
        self, db: AsyncSession, user_id: UUID, skip: int = 0, limit: int = 50
    ) -> list[Notification]:
        return await notification_repository.get_by_user_id(db, user_id, skip=skip, limit=limit)

    async def get_unread_count(self, db: AsyncSession, user_id: UUID) -> int:
        return await notification_repository.get_unread_count(db, user_id)

    async def mark_as_read(self, db: AsyncSession, id: UUID, user_id: UUID) -> Notification:
        notif = await notification_repository.get(db, id)
        if notif and notif.user_id == user_id:
            notif = await notification_repository.update(db, db_obj=notif, obj_in={"is_read": True})
        return notif

    async def mark_all_read(self, db: AsyncSession, user_id: UUID) -> int:
        return await notification_repository.mark_all_read(db, user_id)

    async def delete(self, db: AsyncSession, id: UUID, user_id: UUID) -> bool:
        notif = await notification_repository.get(db, id)
        if notif and notif.user_id == user_id:
            await notification_repository.remove(db, id=id)
            return True
        return False


notification_service = NotificationService()
