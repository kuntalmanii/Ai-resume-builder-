"""Application Service class."""
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.application import Application
from app.db.models.interview import Interview
from app.repositories.application import application_repository
from app.repositories.interview import interview_repository
from app.schemas.application import ApplicationCreate, ApplicationUpdate, InterviewCreate
from app.schemas.notification import NotificationCreate
from app.services.notification_service import notification_service


class ApplicationService:
    async def create(self, db: AsyncSession, *, user_id: UUID, obj_in: ApplicationCreate) -> Application:
        data = obj_in.model_dump()
        data["user_id"] = user_id
        app_obj = await application_repository.create(db, obj_in=data)

        # Trigger notification
        await notification_service.create_notification(
            db,
            obj_in=NotificationCreate(
                user_id=user_id,
                type="success",
                title="Application Tracked",
                body=f"Added job application for {app_obj.role} at {app_obj.company}.",
                action_url=f"/applications/{app_obj.id}"
            )
        )
        return app_obj

    async def get_by_user_id(
        self, db: AsyncSession, user_id: UUID, status: str = None, search: str = None
    ) -> list[Application]:
        return await application_repository.get_by_user_id(db, user_id, status=status, search=search)

    async def get_by_id(self, db: AsyncSession, id: UUID) -> Application | None:
        return await application_repository.get_with_interviews(db, id)

    async def update(self, db: AsyncSession, *, db_obj: Application, obj_in: ApplicationUpdate) -> Application:
        data = obj_in.model_dump(exclude_unset=True)
        old_status = db_obj.status
        updated = await application_repository.update(db, db_obj=db_obj, obj_in=data)

        if "status" in data and data["status"] != old_status:
            # Trigger status change notification
            await notification_service.create_notification(
                db,
                obj_in=NotificationCreate(
                    user_id=db_obj.user_id,
                    type="info",
                    title="Application Status Updated",
                    body=f"Application for {db_obj.role} at {db_obj.company} moved to {data['status']}.",
                    action_url=f"/applications/{db_obj.id}"
                )
            )
        return updated

    async def remove(self, db: AsyncSession, *, id: UUID) -> Application | None:
        return await application_repository.remove(db, id=id)

    # ─── Interview Sub-Entity Operations ──────────────────────────────────────────

    async def add_interview(
        self, db: AsyncSession, *, user_id: UUID, application_id: UUID, obj_in: InterviewCreate
    ) -> Interview:
        data = obj_in.model_dump()
        data["user_id"] = user_id
        data["application_id"] = application_id
        iv_obj = await interview_repository.create(db, obj_in=data)

        # Fetch application details to mention in the notification
        app_obj = await application_repository.get(db, application_id)
        company = app_obj.company if app_obj else "Unknown Company"
        role = app_obj.role if app_obj else "Unknown Role"

        # Create interview reminder notification
        await notification_service.create_notification(
            db,
            obj_in=NotificationCreate(
                user_id=user_id,
                type="reminder",
                title="Interview Scheduled",
                body=f"New {iv_obj.round_type} interview scheduled for {role} at {company} on {iv_obj.scheduled_at.strftime('%Y-%m-%d %H:%M')}.",
                action_url=f"/applications/{application_id}"
            )
        )
        return iv_obj

    async def get_interviews_by_app(self, db: AsyncSession, application_id: UUID) -> list[Interview]:
        return await interview_repository.get_by_application_id(db, application_id)

    async def update_interview(
        self, db: AsyncSession, *, interview_id: UUID, obj_in: dict
    ) -> Interview | None:
        db_obj = await interview_repository.get(db, interview_id)
        if db_obj:
            return await interview_repository.update(db, db_obj=db_obj, obj_in=obj_in)
        return None

    async def delete_interview(self, db: AsyncSession, *, interview_id: UUID) -> bool:
        db_obj = await interview_repository.get(db, interview_id)
        if db_obj:
            await interview_repository.remove(db, id=interview_id)
            return True
        return False


application_service = ApplicationService()
