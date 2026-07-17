"""Notifications center API endpoints."""
import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.notification import NotificationResponse
from app.services.notification_service import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    current_user: CurrentUser,
    db: DBSession,
    skip: int = 0,
    limit: int = 50,
) -> list[NotificationResponse]:
    """List notifications for current user."""
    notifs = await notification_service.get_by_user_id(db, user_id=current_user.id, skip=skip, limit=limit)
    return [NotificationResponse.model_validate(n) for n in notifs]


@router.get("/unread-count", response_model=int)
async def get_unread_count(
    current_user: CurrentUser, db: DBSession
) -> int:
    """Get count of unread notifications."""
    return await notification_service.get_unread_count(db, user_id=current_user.id)


@router.patch("/{id}/read", response_model=NotificationResponse)
async def mark_as_read(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> NotificationResponse:
    """Mark a notification as read."""
    notif = await notification_service.mark_as_read(db, id=id, user_id=current_user.id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    await db.commit()
    return NotificationResponse.model_validate(notif)


@router.patch("/read-all", response_model=int)
async def mark_all_read(
    current_user: CurrentUser, db: DBSession
) -> int:
    """Mark all notifications as read."""
    count = await notification_service.mark_all_read(db, user_id=current_user.id)
    await db.commit()
    return count


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> None:
    """Delete a notification."""
    success = await notification_service.delete(db, id=id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")
    await db.commit()
